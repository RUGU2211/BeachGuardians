'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  DIRECTIONS_PROVIDERS, 
  openDirections, 
  getCurrentLocation, 
  calculateDistance, 
  formatDistance,
  formatAddress,
  type EventLocationDetails,
  type LocationCoordinates,
  type DirectionsProvider
} from '@/lib/event-location-utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Fix Leaflet default icon URLs when bundled
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
} catch {}

interface EventLocationProps {
  location: string;
  locationDetails?: EventLocationDetails;
  className?: string;
  showDistance?: boolean;
  compact?: boolean;
}

export function EventLocation({ 
  location, 
  locationDetails, 
  className = '',
  showDistance = true,
  compact = false
}: EventLocationProps) {
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const { toast } = useToast();

  // Get user location for distance calculation
  useEffect(() => {
    if (showDistance && locationDetails?.coordinates) {
      setIsLoadingLocation(true);
      getCurrentLocation()
        .then((coords) => {
          setUserLocation(coords);
          const dist = calculateDistance(coords, locationDetails.coordinates);
          setDistance(formatDistance(dist));
        })
        .catch((error) => {
          console.warn('Could not get user location:', error);
          // Don't show error to user as this is optional functionality
        })
        .finally(() => {
          setIsLoadingLocation(false);
        });
    }
  }, [locationDetails, showDistance]);

  const handleGetDirections = (provider: DirectionsProvider) => {
    try {
      const locationToUse = locationDetails || location;
      openDirections(provider, locationToUse, userLocation || undefined);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not open directions. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const displayAddress = locationDetails ? formatAddress(locationDetails) : location;

  if (compact) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm truncate" title={displayAddress}>
            {displayAddress}
          </span>
          {distance && (
            <Badge variant="secondary" className="text-xs">
              {distance}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-2">
              <Navigation className="h-3 w-3 mr-1" />
              Directions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {DIRECTIONS_PROVIDERS.map((provider) => (
              <DropdownMenuItem
                key={provider.name}
                onClick={() => handleGetDirections(provider)}
                className="cursor-pointer"
              >
                <span className="mr-2">{provider.icon}</span>
                {provider.name}
                <ExternalLink className="h-3 w-3 ml-auto" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span>Event Location</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium text-base">{displayAddress}</p>
          {locationDetails?.city && locationDetails?.state && (
            <p className="text-sm text-muted-foreground">
              {locationDetails.city}, {locationDetails.state}
              {locationDetails.country && ` • ${locationDetails.country}`}
            </p>
          )}
        </div>

        {locationDetails?.coordinates && (
          <div className="rounded-md overflow-hidden border">
            <MapContainer
              center={[locationDetails.coordinates.latitude, locationDetails.coordinates.longitude]}
              zoom={15}
              scrollWheelZoom={false}
              zoomAnimation={false}
              fadeAnimation={false}
              markerZoomAnimation={false}
              preferCanvas={true}
              style={{ height: compact ? 160 : 260, width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[locationDetails.coordinates.latitude, locationDetails.coordinates.longitude]}>
                <Popup>
                  {displayAddress}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {showDistance && (
          <div className="flex items-center space-x-2">
            {isLoadingLocation ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Calculating distance...</span>
              </div>
            ) : distance ? (
              <Badge variant="secondary" className="text-sm">
                <Navigation className="h-3 w-3 mr-1" />
                {distance}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground flex items-center">
                <Navigation className="h-3 w-3 mr-1" />
                Enable location to calculate distance
              </span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Get Directions:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DIRECTIONS_PROVIDERS.map((provider) => (
              <Button
                key={provider.name}
                variant="outline"
                size="sm"
                onClick={() => handleGetDirections(provider)}
                className={`justify-start ${provider.color} text-white border-0 hover:text-white`}
              >
                <span className="mr-2">{provider.icon}</span>
                {provider.name}
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            ))}
          </div>
        </div>

        {locationDetails?.coordinates && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Coordinates: {locationDetails.coordinates.latitude.toFixed(6)}, {locationDetails.coordinates.longitude.toFixed(6)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified version for use in event cards
export function EventLocationBadge({ 
  location, 
  locationDetails, 
  showDistance = false 
}: Pick<EventLocationProps, 'location' | 'locationDetails' | 'showDistance'>) {
  return (
    <EventLocation
      location={location}
      locationDetails={locationDetails}
      showDistance={showDistance}
      compact={true}
      className="w-full"
    />
  );
}