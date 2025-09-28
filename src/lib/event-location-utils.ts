// Event location utilities for handling directions and location display

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface EventLocationDetails {
  address: string;
  coordinates: LocationCoordinates;
  placeId?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface DirectionsProvider {
  name: string;
  url: string;
  icon: string;
  color: string;
}

// Available map providers for directions
export const DIRECTIONS_PROVIDERS: DirectionsProvider[] = [
  {
    name: 'Google Maps',
    url: 'https://www.google.com/maps/dir/?api=1&destination=',
    icon: '🗺️',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    name: 'Apple Maps',
    url: 'http://maps.apple.com/?daddr=',
    icon: '🍎',
    color: 'bg-gray-500 hover:bg-gray-600'
  },
  {
    name: 'Waze',
    url: 'https://waze.com/ul?q=',
    icon: '🚗',
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

/**
 * Generate directions URL for a given provider and location
 */
export function generateDirectionsUrl(
  provider: DirectionsProvider,
  location: EventLocationDetails | string,
  userLocation?: LocationCoordinates
): string {
  let destination: string;
  
  if (typeof location === 'string') {
    destination = encodeURIComponent(location);
  } else {
    // Use coordinates only if valid and not (0,0); otherwise fallback to address
    if (
      location.coordinates &&
      isValidCoordinates(location.coordinates) &&
      !(location.coordinates.latitude === 0 && location.coordinates.longitude === 0)
    ) {
      destination = `${location.coordinates.latitude},${location.coordinates.longitude}`;
    } else {
      destination = encodeURIComponent(location.address);
    }
  }

  let url = provider.url + destination;

  // Add origin for Google Maps if user location is available
  if (provider.name === 'Google Maps' && userLocation) {
    url += `&origin=${userLocation.latitude},${userLocation.longitude}`;
  }

  return url;
}

/**
 * Get user's current location using browser geolocation API
 */
export function getCurrentLocation(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        // Create a more descriptive error message
        let errorMessage = 'Failed to get current location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS or network connection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = `Geolocation error: ${error.message}`;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  coord1: LocationCoordinates,
  coord2: LocationCoordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
}

/**
 * Open directions in a new tab/window
 */
export function openDirections(
  provider: DirectionsProvider,
  location: EventLocationDetails | string,
  userLocation?: LocationCoordinates
): void {
  const url = generateDirectionsUrl(provider, location, userLocation);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Format address for display
 */
export function formatAddress(locationDetails?: EventLocationDetails): string {
  if (!locationDetails) return '';
  
  const parts = [
    locationDetails.address,
    locationDetails.city,
    locationDetails.state,
    locationDetails.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Get a Google Maps static image URL for the location
 */
export function getStaticMapUrl(
  location: EventLocationDetails | LocationCoordinates,
  width: number = 600,
  height: number = 400,
  zoom: number = 15
): string {
  let coordinates: LocationCoordinates;
  
  if ('coordinates' in location) {
    coordinates = location.coordinates;
  } else {
    coordinates = location;
  }
  
  // Using a placeholder service since we don't have Google Maps API key configured
  // In production, you would use: https://maps.googleapis.com/maps/api/staticmap
  return `https://via.placeholder.com/${width}x${height}/4285f4/ffffff?text=Event+Location`;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(coordinates: LocationCoordinates): boolean {
  return (
    coordinates.latitude >= -90 && 
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 && 
    coordinates.longitude <= 180
  );
}

/**
 * Parse location string to extract potential coordinates
 */
export function parseLocationString(locationString: string): EventLocationDetails | null {
  // Try to extract coordinates from string (lat,lng format)
  const coordRegex = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
  const match = locationString.match(coordRegex);
  
  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    
    if (isValidCoordinates({ latitude, longitude })) {
      return {
        address: locationString,
        coordinates: { latitude, longitude }
      };
    }
  }
  
  // If not coordinates, treat as regular address
  return {
    address: locationString,
    coordinates: {
      latitude: 0, // Default coordinates - should be geocoded in production
      longitude: 0
    }
  };
}