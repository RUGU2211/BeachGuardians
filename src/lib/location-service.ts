import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
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

    try {
      const userDocRef = doc(db, 'users', this.userId);
      await updateDoc(userDocRef, {
        currentLocation: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp,
        },
        updatedAt: new Date().toISOString(),
      });
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
}

// Export singleton instance
export const locationService = new LocationService(); 