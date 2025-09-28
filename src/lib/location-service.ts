import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './types';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
}

class LocationService {
  private watchId: number | null = null;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes default
  private isTracking: boolean = false;
  private userId: string | null = null;
  private lastWriteTs: number = 0;
  private lastLat?: number;
  private lastLng?: number;
  private minDistanceMeters: number = Number(process.env.NEXT_PUBLIC_LOCATION_MIN_DISTANCE_METERS || 100);

  constructor() {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
    }
  }

  /**
   * Start tracking user location
   */
  async startTracking(userId: string, updateIntervalMinutes: string = '5'): Promise<boolean> {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return false;
    }

    if (this.isTracking) {
      console.log('Location tracking already active');
      return true;
    }

    this.userId = userId;
    this.updateInterval = parseInt(updateIntervalMinutes) * 60 * 1000;
    this.isTracking = true;
    this.lastWriteTs = 0;
    this.lastLat = undefined;
    this.lastLng = undefined;

    try {
      // Get initial position
      const position = await this.getCurrentPosition();
      if (position) {
        await this.updateLocationInFirestore(position);
      }

      // Start watching for position changes
      this.watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const locationData = this.formatPosition(position);
          await this.updateLocationInFirestore(locationData);
        },
        (error) => {
          console.error('Error getting location:', error);
          this.handleLocationError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: this.updateInterval,
        }
      );

      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop tracking user location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.userId = null;
    console.log('Location tracking stopped');
  }

  /**
   * Get current position once
   */
  private getCurrentPosition(): Promise<LocationData | null> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(this.formatPosition(position));
        },
        (error) => {
          console.error('Error getting current position:', error);
          this.handleLocationError(error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1 minute
        }
      );
    });
  }

  /**
   * Format position data
   */
  private formatPosition(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: new Date().toISOString(),
      accuracy: position.coords.accuracy,
    };
  }

  /**
   * Update location in Firestore
   */
  private async updateLocationInFirestore(locationData: LocationData): Promise<void> {
    if (!this.userId) {
      console.error('No user ID set for location update');
      return;
    }

    // Gate writes by environment: default off in development unless explicitly enabled
    const enableWritesEnv = process.env.NEXT_PUBLIC_ENABLE_LIVE_LOCATION_WRITES;
    const isDev = process.env.NODE_ENV === 'development';
    const writesEnabled = enableWritesEnv === 'true' ? true : enableWritesEnv === 'false' ? false : !isDev;

    if (!writesEnabled) {
      return; // Skip network writes in development to avoid quota usage
    }

    // Throttle writes by time and distance to reduce Firestore load
    const now = Date.now();
    const timeSinceLast = now - (this.lastWriteTs || 0);
    const movedMeters = this.lastLat != null && this.lastLng != null
      ? this.haversineMeters(this.lastLat, this.lastLng, locationData.latitude, locationData.longitude)
      : Infinity;
    const shouldWrite = timeSinceLast >= this.updateInterval || movedMeters >= this.minDistanceMeters;

    if (!shouldWrite) {
      return;
    }

    try {
      const userDocRef = doc(db, 'users', this.userId);
      await updateDoc(userDocRef, {
        // Use 'location' field to match map listeners
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp,
        },
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.lastWriteTs = now;
      this.lastLat = locationData.latitude;
      this.lastLng = locationData.longitude;
    } catch (error) {
      console.error('Failed to update location in Firestore:', error);
    }
  }

  /**
   * Handle location errors
   */
  private handleLocationError(error: GeolocationPositionError): void {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('Location permission denied');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location information unavailable');
        break;
      case error.TIMEOUT:
        console.error('Location request timed out');
        break;
      default:
        console.error('Unknown location error:', error);
    }
  }

  /**
   * Check if location tracking is active
   */
  isLocationTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get current tracking status
   */
  getTrackingStatus(): {
    isTracking: boolean;
    userId: string | null;
    updateInterval: number;
  } {
    return {
      isTracking: this.isTracking,
      userId: this.userId,
      updateInterval: this.updateInterval,
    };
  }

  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    if (!navigator.permissions) {
      // Fallback for browsers that don't support permissions API
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 5000 }
        );
      });
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return permission.state === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // meters
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Export singleton instance
export const locationService = new LocationService();