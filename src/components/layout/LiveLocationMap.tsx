'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getRealTimeLocatedUsers, subscribeToEvents } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, Event } from '@/lib/types';
import { calculateDistance, formatDistance } from '@/lib/event-location-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Navigation,
  Layers,
  Clock,
  MapIcon,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickEventImage } from '@/lib/event-images';

// Cache Leaflet dynamic import and use dist build to avoid heavy src chunk
let cachedLeaflet: Promise<any> | null = null;
async function loadLeaflet() {
  if (!cachedLeaflet) {
    cachedLeaflet = import('leaflet/dist/leaflet.js');
  }
  return cachedLeaflet;
}

// Configure Leaflet marker icons after dynamic import; keeps bundle lean
loadLeaflet()
  .then((L) => {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    } catch (e) {
      console.warn('Leaflet icon configuration skipped:', e);
    }
  })
  .catch((e) => console.warn('Leaflet import failed:', e));

interface UserLocation extends UserProfile {
  location: {
    latitude: number;
    longitude: number;
  };
  lastSeen?: Date;
}

interface LiveLocationMapProps {
  isAdmin: boolean;
}

interface MapFilters {
  showUsers: boolean;
  showEvents: boolean;
  eventStatus: 'all' | 'upcoming' | 'ongoing' | 'completed';
  userType: 'all' | 'volunteers' | 'admins';
  searchQuery: string;
}

// Custom map component to handle centering
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    // Avoid zoom animation to prevent _leaflet_pos issues on transition
    map.setView(center, zoom, { animate: false });
  }, [map, center, zoom]);
  
  return null;
}

export const LiveLocationMap: React.FC<LiveLocationMapProps> = ({ isAdmin }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Center of India
  const [mapZoom, setMapZoom] = useState(5);
  
  const [filters, setFilters] = useState<MapFilters>({
    showUsers: true,
    showEvents: true,
    eventStatus: 'all',
    userType: 'all',
    searchQuery: ''
  });

  // Get user's current location
  useEffect(() => {
    if (user && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          
          // Do not write location here; location-service handles gated, throttled writes
          
          // Center map on user's location if it's the first time
          if (!currentLocation) {
            setMapCenter([latitude, longitude]);
            setMapZoom(12);
          }
        },
        (err) => {
          console.warn(`ERROR(${err.code}): ${err.message}`);
          setError('Could not get your location. Please enable location services in your browser.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user, currentLocation]);

  // Manual refresh marker (events are realtime; this updates timestamp)
  const refreshNow = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  // Set up real-time user location listener
  useEffect(() => {
    setIsLoading(true);
    
    const unsubscribeUsers = getRealTimeLocatedUsers(
      (usersData) => {
        setUsers(usersData.map(userData => ({
          ...userData,
          lastSeen: new Date()
        })));
        setLastUpdate(new Date());
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching real-time user locations:', error);
        setError('Failed to load user locations. Please try again.');
        setIsLoading(false);
      }
    );

    // Real-time events subscription
    const unsubscribeEvents = subscribeToEvents(
      (eventsData) => {
        setEvents(eventsData);
        setLastUpdate(new Date());
        setError(null);
      },
      (err) => {
        console.error('Error subscribing to events:', err);
        setError('Failed to load events data. Please try again.');
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeEvents();
    };
  }, []);

  // Auto-refresh badge only; events are real-time
  useEffect(() => {
    if (autoRefresh) {
      const t = setInterval(() => setLastUpdate(new Date()), 60000);
      return () => clearInterval(t);
    }
  }, [autoRefresh]);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    let filteredUsers = users;
    let filteredEvents = events;

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );

      filteredEvents = filteredEvents.filter(e =>
        (e.name?.toLowerCase().includes(query)) ||
        (e.description?.toLowerCase().includes(query)) ||
        (e.location?.toLowerCase().includes(query))
      );
    }

    // Filter users by type
    if (filters.userType !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        if (filters.userType === 'admins') return user.role === 'admin';
        if (filters.userType === 'volunteers') return user.role === 'volunteer';
        return true;
      });
    }

    // Radius-based filtering removed

    // Filter events by status using startDate/endDate fallback
    if (filters.eventStatus !== 'all') {
      const now = new Date();
      filteredEvents = filteredEvents.filter(e => {
        const start = e.startDate ? new Date(e.startDate) : new Date(e.date);
        const end = e.endDate ? new Date(e.endDate) : new Date(e.date);
        const isUpcoming = start > now;
        const isOngoing = start <= now && end >= now;
        const isCompleted = end < now;
        switch (filters.eventStatus) {
          case 'upcoming':
            return isUpcoming;
          case 'ongoing':
            return isOngoing;
          case 'completed':
            return isCompleted;
          default:
            return true;
        }
      });
    }

    return {
      users: filters.showUsers ? filteredUsers : [],
      events: filters.showEvents ? filteredEvents : []
    };
  }, [users, events, filters, currentLocation]);

  // Create custom icons
  const createUserIcon = (user: UserLocation) => {
    const isCurrentUser = user.uid === user?.uid;
    const isAdmin = user.role === 'admin';
    
    const iconHtml = `
      <div style="
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        background: ${isCurrentUser ? '#10b981' : isAdmin ? '#f59e0b' : '#3b82f6'};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">
        ${isCurrentUser ? '●' : isAdmin ? 'A' : 'V'}
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'custom-user-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const createEventIcon = (event: Event) => {
    const now = new Date();
    const start = event.startDate ? new Date(event.startDate) : new Date(event.date);
    const end = event.endDate ? new Date(event.endDate) : new Date(event.date);

    const isUpcoming = start > now;
    const isOngoing = start <= now && end >= now;
    const isCompleted = end < now;

    let color = '#6b7280';
    if (isUpcoming) {
      color = '#3b82f6'; // upcoming
    } else if (isOngoing) {
      color = '#10b981'; // ongoing
    } else if (isCompleted) {
      color = '#ef4444'; // completed
    }

    // For ongoing events, render a pointer-style marker (circle + tail)
    const iconHtml = isOngoing
      ? `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
        ">📅</div>
        <div style="
          width:0;
          height:0;
          border-left:7px solid transparent;
          border-right:7px solid transparent;
          border-top:12px solid ${color};
          margin-top:-2px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
        "></div>
      </div>
      `
      : `
      <div style="
        width: 28px; 
        height: 28px; 
        border-radius: 50%; 
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
      ">📅</div>
      `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-event-icon',
      iconSize: isOngoing ? [28, 40] : [28, 28],
      iconAnchor: isOngoing ? [14, 40] : [14, 14]
    });
  };

  const handleCenterOnUser = () => {
    if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      setMapZoom(15);
    }
  };

  const handleFilterChange = (key: keyof MapFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (error) {
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={refreshNow} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              Live Map Controls
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={autoRefresh ? "default" : "secondary"}>
                {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNow}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users or events..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.eventStatus}
              onValueChange={(value) => handleFilterChange('eventStatus', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Event Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.userType}
              onValueChange={(value) => handleFilterChange('userType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="volunteers">Volunteers</SelectItem>
                <SelectItem value="admins">Admins</SelectItem>
              </SelectContent>
            </Select>

            {/* Radius filter removed */}
          </div>

          {/* Toggles Row 2 */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-users"
                checked={filters.showUsers}
                onCheckedChange={(checked) => handleFilterChange('showUsers', checked)}
              />
              <Label htmlFor="show-users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Show Users ({filteredData.users.length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-events"
                checked={filters.showEvents}
                onCheckedChange={(checked) => handleFilterChange('showEvents', checked)}
              />
              <Label htmlFor="show-events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Show Events ({filteredData.events.filter(e => e.locationDetails?.coordinates).length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Auto Refresh
              </Label>
            </div>

            {currentLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCenterOnUser}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Center on Me
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <span>•</span>
            <span>{filteredData.users.length} users visible</span>
            <span>•</span>
            <span>{filteredData.events.filter(e => e.locationDetails?.coordinates).length} events visible</span>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px] w-full rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              zoomAnimation={false}
              fadeAnimation={false}
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Markers */}
              {filteredData.users.map((user) => (
                <Marker
                  key={user.uid}
                  position={[user.location.latitude, user.location.longitude]}
                  icon={createUserIcon(user)}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          user.uid === user?.uid ? "bg-green-500" : 
                          user.role === 'admin' ? "bg-yellow-500" : "bg-blue-500"
                        )} />
                        <span className="font-medium">{user.fullName || 'Anonymous'}</span>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>{user.email}</div>
                        {currentLocation && (
                          <div>
                            Distance: {formatDistance(calculateDistance(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              user.location.latitude,
                              user.location.longitude
                            ))}
                          </div>
                        )}
                        <div>Last seen: {user.lastSeen?.toLocaleTimeString() || 'Unknown'}</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Event Markers */}
              {filteredData.events.map((event) => {
                if (!event.locationDetails?.coordinates) return null;
                
                return (
                  <Marker
                    key={event.id}
                    position={[
                      event.locationDetails.coordinates.latitude,
                      event.locationDetails.coordinates.longitude
                    ]}
                    icon={createEventIcon(event)}
                    eventHandlers={{
                      mouseover: (e: L.LeafletMouseEvent) => {
                        // Show details on hover by opening the popup
                        (e.target as L.Marker).openPopup();
                      },
                      mouseout: (e: L.LeafletMouseEvent) => {
                        // Hide details when the pointer leaves the marker
                        (e.target as L.Marker).closePopup();
                      },
                      click: (e: L.LeafletMouseEvent) => {
                        const lat = event.locationDetails!.coordinates.latitude;
                        const lng = event.locationDetails!.coordinates.longitude;
                        // Center and zoom the map towards the event
                        setMapCenter([lat, lng]);
                        setMapZoom(Math.max(mapZoom, 14));
                        // Ensure the popup opens programmatically
                        (e.target as L.Marker).openPopup();
                      }
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[250px]">
                        {/** Use event image or fallback to /image_1.jpg **/}
                        <img
                          src={event.mapImageUrl || (event as any).imageUrl || pickEventImage(event.id)}
                          alt="Event"
                          className="w-full h-24 object-cover rounded-md mb-2"
                        />
                        <div className="mb-2">
                          <h3 className="font-medium text-lg">{event.name}</h3>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span>{new Date(event.date).toLocaleTimeString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{event.registeredUsers?.length || 0} registered</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Map Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
              <span className="text-sm">You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow" />
              <span className="text-sm">Admins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
              <span className="text-sm">Volunteers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center text-white text-xs">📅</div>
              <span className="text-sm">Upcoming Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow flex items-center justify-center text-white text-xs">📅</div>
              <span className="text-sm">Ongoing Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow flex items-center justify-center text-white text-xs">📅</div>
              <span className="text-sm">Completed Events</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};