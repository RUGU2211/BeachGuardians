'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Navigation, Loader2, Star, MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getCurrentLocation, 
  formatAddress,
  type EventLocationDetails 
} from '@/lib/event-location-utils';
import { 
  searchIndianLocations, 
  reverseGeocodeIndia, 
  getPopularIndianBeaches,
  formatIndianAddress,
  type IndianLocationDetails 
} from '@/lib/indian-location-service';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerProps {
  value?: string;
  locationDetails?: EventLocationDetails;
  onChange: (location: string, locationDetails?: EventLocationDetails) => void;
  placeholder?: string;
  className?: string;
}

// Convert IndianLocationDetails to EventLocationDetails
function convertToEventLocationDetails(indianLocation: IndianLocationDetails): EventLocationDetails {
  return {
    address: indianLocation.address,
    coordinates: indianLocation.coordinates,
    placeId: indianLocation.placeId,
    city: indianLocation.city,
    state: indianLocation.state,
    country: indianLocation.country,
    postalCode: indianLocation.postalCode
  };
}

export function LocationPicker({ 
  value = '', 
  locationDetails,
  onChange, 
  placeholder = "Search for Indian locations...",
  className 
}: LocationPickerProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<IndianLocationDetails[]>([]);
  const [popularBeaches, setPopularBeaches] = useState<IndianLocationDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showPopularBeaches, setShowPopularBeaches] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load popular beaches on component mount
  useEffect(() => {
    setPopularBeaches(getPopularIndianBeaches());
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Show popular beaches if input is empty
    if (newValue.length === 0) {
      setSuggestions([]);
      setShowPopularBeaches(true);
      setShowSuggestions(true);
      return;
    }

    // Don't search for very short queries
    if (newValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowPopularBeaches(false);
      return;
    }

    // Debounce the search
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setShowPopularBeaches(false);
      try {
        const results = await searchIndianLocations(newValue);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching Indian locations:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const handleSuggestionSelect = useCallback((indianLocation: IndianLocationDetails) => {
    const eventLocationDetails = convertToEventLocationDetails(indianLocation);
    setInputValue(formatIndianAddress(indianLocation));
    setShowSuggestions(false);
    setShowPopularBeaches(false);
    onChange(formatIndianAddress(indianLocation), eventLocationDetails);
  }, [onChange]);

  const handleCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    try {
      const position = await getCurrentLocation();
      
      // Try to reverse geocode to get Indian location details
      const indianLocation = await reverseGeocodeIndia(position.latitude, position.longitude);
      
      if (indianLocation) {
        const eventLocationDetails = convertToEventLocationDetails(indianLocation);
        setInputValue(formatIndianAddress(indianLocation));
        onChange(formatIndianAddress(indianLocation), eventLocationDetails);
      } else {
        // If not in India, show coordinates with a message
        const mockAddress = `Location outside India (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`;
        const locationDetails: EventLocationDetails = {
          address: mockAddress,
          coordinates: position,
          placeId: `current_location_${Date.now()}`,
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown',
          postalCode: undefined
        };

        setInputValue(mockAddress);
        onChange(mockAddress, locationDetails);
      }
    } catch (error) {
      // Handle geolocation errors properly
      let errorTitle = 'Location Error';
      let errorMessage = 'Failed to get current location';
      let errorDescription = '';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorTitle = 'Location Permission Denied';
            errorMessage = 'Location access denied. Please enable location permissions in your browser.';
            errorDescription = 'To enable: Click the location icon in your browser\'s address bar, or go to Settings > Privacy & Security > Site Settings > Location.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorTitle = 'Location Unavailable';
            errorMessage = 'Location information is unavailable. Please try again.';
            errorDescription = 'Make sure you have a stable internet connection and GPS is enabled on your device.';
            break;
          case error.TIMEOUT:
            errorTitle = 'Location Timeout';
            errorMessage = 'Location request timed out. Please try again.';
            errorDescription = 'The location request took too long. Try again or enter your location manually.';
            break;
          default:
            errorMessage = 'An unknown location error occurred.';
            errorDescription = 'Please try entering your location manually or contact support if the issue persists.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Error getting current location:', errorMessage, error);
      
      // Show user-friendly toast notification
      toast({ 
        title: errorTitle, 
        description: `${errorMessage} ${errorDescription}`, 
        variant: 'destructive',
        duration: 8000 // Show for 8 seconds to give users time to read instructions
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [onChange]);

  const handleManualLocationInput = useCallback(() => {
    // If user has typed something and it's different from the current value, accept it as manual input
    if (inputValue.trim() && inputValue !== value) {
      // Create basic location details for manual input
      const basicLocationDetails: EventLocationDetails = {
        address: inputValue.trim(),
        coordinates: { latitude: 0, longitude: 0 }, // Will be updated if geocoding is available
        placeId: `manual_${Date.now()}`,
        city: undefined,
        state: undefined,
        country: undefined,
        postalCode: undefined
      };
      
      onChange(inputValue.trim(), basicLocationDetails);
    }
  }, [inputValue, value, onChange]);

  const handleInputBlur = useCallback(() => {
    // Accept manual input if no suggestion was selected
    handleManualLocationInput();
    
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setShowPopularBeaches(false);
    }, 200);
  }, [handleManualLocationInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualLocationInput();
      setShowSuggestions(false);
      setShowPopularBeaches(false);
      inputRef.current?.blur();
    }
  }, [handleManualLocationInput]);

  const handleInputFocus = useCallback(() => {
    if (inputValue.length === 0) {
      setShowPopularBeaches(true);
      setShowSuggestions(true);
    } else if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length, inputValue.length]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCurrentLocation}
          disabled={isGettingLocation}
          title="Use current location"
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Location Details Display */}
      {locationDetails && (
        <div className="mt-2 p-3 bg-muted rounded-md text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">Selected Location:</span>
            {locationDetails.placeId?.startsWith('manual_') && (
              <Badge variant="outline" className="text-xs">Manual Input</Badge>
            )}
          </div>
          <div className="mt-1 text-muted-foreground">
            <div>{formatAddress(locationDetails)}</div>
            {locationDetails.coordinates.latitude !== 0 && locationDetails.coordinates.longitude !== 0 && (
              <div className="text-xs mt-1">
                Coordinates: {locationDetails.coordinates.latitude.toFixed(4)}, {locationDetails.coordinates.longitude.toFixed(4)}
              </div>
            )}
            {locationDetails.city && locationDetails.state && (
              <div className="text-xs">
                {locationDetails.city}, {locationDetails.state}, {locationDetails.country}
              </div>
            )}
            {locationDetails.placeId?.startsWith('manual_') && (
              <div className="text-xs mt-1 text-amber-600">
                💡 Tip: For better accuracy, try selecting from suggestions or use current location
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {/* Popular Beaches Section */}
            {showPopularBeaches && popularBeaches.length > 0 && (
              <>
                <div className="p-3 bg-primary/5 border-b">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Star className="h-4 w-4" />
                    Popular Indian Beaches
                  </div>
                </div>
                {popularBeaches.map((beach) => (
                  <button
                    key={beach.placeId}
                    type="button"
                    className="w-full text-left p-3 hover:bg-muted transition-colors border-b"
                    onClick={() => handleSuggestionSelect(beach)}
                  >
                    <div className="flex items-start gap-2">
                      <MapIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{beach.city}</div>
                        <div className="text-sm text-muted-foreground">
                          {beach.state}, {beach.country}
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Beach
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Search Results Section */}
            {!showPopularBeaches && suggestions.length > 0 && (
              <>
                <div className="p-3 bg-muted/50 border-b">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Search className="h-4 w-4" />
                    Search Results
                  </div>
                </div>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    type="button"
                    className="w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-b-0"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {suggestion.city || 'Unknown City'}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {formatIndianAddress(suggestion)}
                        </div>
                        {suggestion.type && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {suggestion.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* No Results */}
            {!showPopularBeaches && !isLoading && suggestions.length === 0 && inputValue.length >= 3 && (
              <div className="p-4 text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No Indian locations found</div>
                <div className="text-xs">Try searching for cities, states, or landmarks in India</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LocationPicker;