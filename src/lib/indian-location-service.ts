// Indian Location Service using OpenStreetMap Nominatim API
// This service provides geocoding for Indian locations

export interface IndianLocationDetails {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  placeId: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  district?: string;
  type?: string; // city, town, village, etc.
}

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
    state_district?: string;
    county?: string;
  };
}

/**
 * Search for Indian locations using OpenStreetMap Nominatim API
 */
export async function searchIndianLocations(query: string): Promise<IndianLocationDetails[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    // Add "India" to the query to focus on Indian locations
    const searchQuery = `${query}, India`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodedQuery}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=10&` +
        `countrycodes=in&` + // Restrict to India
        `accept-language=en`,
        {
          headers: {
            'User-Agent': 'BeachGuardians/1.0 (contact@beachguardians.org)'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results: NominatimResult[] = await response.json();
      
      return results.map(result => ({
        address: result.display_name,
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        },
        placeId: `nominatim_${result.place_id}`,
        city: result.address.city || result.address.town || result.address.village,
        state: result.address.state,
        country: result.address.country || 'India',
        postalCode: result.address.postcode,
        district: result.address.state_district || result.address.county,
        type: result.type
      }));
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: Location service took too long to respond');
      }
      throw fetchError;
    }
  } catch (error: any) {
    // Only log non-timeout errors to avoid console spam
    if (!error.message?.includes('timeout')) {
      console.error('Error searching Indian locations:', error);
    }
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

/**
 * Reverse geocode coordinates to get Indian location details
 */
export async function reverseGeocodeIndia(
  latitude: number, 
  longitude: number
): Promise<IndianLocationDetails | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${latitude}&` +
      `lon=${longitude}&` +
      `format=json&` +
      `addressdetails=1&` +
      `accept-language=en`,
      {
        headers: {
          'User-Agent': 'BeachGuardians/1.0 (contact@beachguardians.org)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const result: NominatimResult = await response.json();
    
    // Check if the result is in India
    if (result.address.country !== 'India') {
      return null;
    }

    return {
      address: result.display_name,
      coordinates: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      },
      placeId: `nominatim_${result.place_id}`,
      city: result.address.city || result.address.town || result.address.village,
      state: result.address.state,
      country: result.address.country,
      postalCode: result.address.postcode,
      district: result.address.state_district || result.address.county,
      type: result.type
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Get popular Indian beach locations for suggestions
 */
export function getPopularIndianBeaches(): IndianLocationDetails[] {
  return [
    {
      address: "Marina Beach, Chennai, Tamil Nadu, India",
      coordinates: { latitude: 13.0475, longitude: 80.2824 },
      placeId: "popular_marina_beach",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      type: "beach"
    },
    {
      address: "Juhu Beach, Mumbai, Maharashtra, India",
      coordinates: { latitude: 19.0990, longitude: 72.8267 },
      placeId: "popular_juhu_beach",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      type: "beach"
    },
    {
      address: "Calangute Beach, Goa, India",
      coordinates: { latitude: 15.5439, longitude: 73.7553 },
      placeId: "popular_calangute_beach",
      city: "Calangute",
      state: "Goa",
      country: "India",
      type: "beach"
    },
    {
      address: "Kovalam Beach, Thiruvananthapuram, Kerala, India",
      coordinates: { latitude: 8.4004, longitude: 76.9784 },
      placeId: "popular_kovalam_beach",
      city: "Thiruvananthapuram",
      state: "Kerala",
      country: "India",
      type: "beach"
    },
    {
      address: "Puri Beach, Puri, Odisha, India",
      coordinates: { latitude: 19.8135, longitude: 85.8312 },
      placeId: "popular_puri_beach",
      city: "Puri",
      state: "Odisha",
      country: "India",
      type: "beach"
    },
    {
      address: "Varkala Beach, Varkala, Kerala, India",
      coordinates: { latitude: 8.7379, longitude: 76.7163 },
      placeId: "popular_varkala_beach",
      city: "Varkala",
      state: "Kerala",
      country: "India",
      type: "beach"
    }
  ];
}

/**
 * Format Indian address for display
 */
export function formatIndianAddress(location: IndianLocationDetails): string {
  const parts = [];
  
  if (location.city) parts.push(location.city);
  if (location.district && location.district !== location.city) parts.push(location.district);
  if (location.state) parts.push(location.state);
  if (location.country) parts.push(location.country);
  
  return parts.join(', ');
}