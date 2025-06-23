'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getRealTimeLocatedUsers, updateUserLocation } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserProfile } from '@/lib/types';

// Workaround for a common issue with Leaflet and Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface UserLocation extends UserProfile {
  location: {
    latitude: number;
    longitude: number;
  };
}

interface LiveLocationMapProps {
  isAdmin: boolean;
}

export const LiveLocationMap: React.FC<LiveLocationMapProps> = ({ isAdmin }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This function will ask for location permission
    if (user && navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Update user's location in Firestore here
          updateUserLocation(user.uid, { latitude, longitude });
        },
        (err) => {
          console.warn(`ERROR(${err.code}): ${err.message}`);
          setError('Could not get your location. Please enable location services in your browser.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }

    const unsubscribe = getRealTimeLocatedUsers(
      (usersData) => {
        // Filter out users who don't have a valid location
        const locatedUsers = usersData.filter(u => u.location && u.location.latitude && u.location.longitude) as UserLocation[];
        setUsers(locatedUsers);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError('Could not fetch user locations.');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const currentUser = users.find((u) => u.uid === user?.uid);
  const defaultCenter: [number, number] = currentUser
    ? [currentUser.location.latitude, currentUser.location.longitude]
    : [20.5937, 78.9629]; // Default to India if current user has no location

  const getIcon = (role: 'admin' | 'volunteer' | undefined) => {
    const iconUrl =
      role === 'admin'
        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png' // Green for Admin
        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'; // Red for Volunteer
    
    return L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
  }

  return (
    <>
      {error && <p className="text-red-500 p-4">{error}</p>}
      {/*
        If you still see the error in development, try disabling React Strict Mode in next.config.js:
        module.exports = { reactStrictMode: false }
      */}
      <MapContainer
        key={user?.uid || 'default'}
        center={defaultCenter}
        zoom={currentUser ? 13 : 5}
        
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {users.map((u) => (
          <Marker
            key={u.uid}
            position={[u.location.latitude, u.location.longitude]}
            icon={getIcon(u.role)}
          >
            <Popup>
              <b>{u.fullName}</b> ({u.role})
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
};