"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { subscribeToEvents } from '@/lib/firebase';
import type { Event } from '@/lib/types';
import 'leaflet/dist/leaflet.css';
import { pickEventImage } from '@/lib/event-images';

interface EventMapPreviewProps {
  events?: Event[];
  compact?: boolean;
  height?: number;
}

export default function EventMapPreview({ events: incomingEvents, compact = false, height = 400 }: EventMapPreviewProps) {
  const [events, setEvents] = useState<Event[]>(incomingEvents || []);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  // Cache Leaflet dynamic import to prevent concurrent loads and aborted chunk fetches
  const leafletLoaderRef = useRef<Promise<any> | null>(null);
  const loadLeaflet = async () => {
    if (!leafletLoaderRef.current) {
      // Prefer the dist build to avoid loading the heavyweight src file in dev
      leafletLoaderRef.current = import('leaflet/dist/leaflet.js');
    }
    return leafletLoaderRef.current;
  };

  // Always use real-time updates for events
  useEffect(() => {
    // If events are provided by parent, use them as initial data
    if (incomingEvents && incomingEvents.length > 0) {
      const withCoords = incomingEvents.filter((e: any) => {
        const coords = e?.locationDetails?.coordinates;
        return (e.latitude && e.longitude) || (coords?.latitude && coords?.longitude);
      });
      setEvents(withCoords);
    }

    // Always subscribe to real-time updates
    const unsubscribe = subscribeToEvents(
      (data) => {
        const withCoords = data.filter((e: any) => {
          const coords = e?.locationDetails?.coordinates;
          return (e.latitude && e.longitude) || (coords?.latitude && coords?.longitude);
        });
        setEvents(withCoords);
      },
      (err) => {
        console.warn('Event subscription failed:', err);
        // Only clear events if we don't have incoming events
        if (!incomingEvents || incomingEvents.length === 0) {
          setEvents([]);
        }
      }
    );
    return () => unsubscribe();
  }, [incomingEvents]);

  // Initialize map once on mount; robust against HMR re-renders
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mapContainerRef.current || mapRef.current) return;
      const L = await loadLeaflet();

      // Ensure Leaflet default marker icons resolve correctly (avoid 404s)
      // Use CDN paths consistent with Leaflet distribution
      // This mirrors fixes present in other map components
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L.Icon.Default as any).mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // Guard: if container already has a Leaflet instance (HMR), replace the node
      const container = mapContainerRef.current as any;
      if (container && container._leaflet_id) {
        const newContainer = container.cloneNode(false) as HTMLDivElement;
        container.parentNode?.replaceChild(newContainer, container);
        mapContainerRef.current = newContainer;
      }

      const mapInstance = L.map(mapContainerRef.current!).setView([20.5937, 78.9629], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance);

      // Layer group to manage markers cleanly
      markersLayerRef.current = L.layerGroup().addTo(mapInstance);

      if (!cancelled) {
        mapRef.current = mapInstance;
      } else {
        mapInstance.remove();
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    (async () => {
      if (!mapRef.current) return;
      const L = await loadLeaflet();

      // Reinforce icon defaults in case of HMR re-import
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L.Icon.Default as any).mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      } else {
        markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      events.forEach((e: any) => {
        const lat = e.latitude ?? e.locationDetails?.coordinates?.latitude;
        const lng = e.longitude ?? e.locationDetails?.coordinates?.longitude;
        if (!lat || !lng) return;
        const m = L.marker([lat, lng]).addTo(markersLayerRef.current);
        const dateToShow = (e.startDate || e.date) ? new Date(e.startDate || e.date).toLocaleDateString() : '';
        const imgSrc = e.mapImageUrl || e.imageUrl || pickEventImage(e.id);
        m.bindPopup(`
          <div style="min-width:250px;">
            <img src="${imgSrc}" alt="Event" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
            <div style="font-weight:600;">${e.name}</div>
            <div>${dateToShow}</div>
            <div style="margin-top:6px;"><a href="/events/${e.id}" style="color:#2563eb;">View & Register</a></div>
          </div>
        `);
      });
    })();
  }, [events]);

  if (compact) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border shadow-sm">
        <div ref={mapContainerRef} className={`w-full h-[${height}px]`} />
      </div>
    );
  }

  return (
    <section className="w-full py-16 md:py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Event Map Preview</h2>
            <p className="text-muted-foreground">Interactive map with real tiles and event markers.</p>
          </div>
          <Link href="/events" className="text-primary hover:underline">Browse events</Link>
        </div>

        <div className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden border shadow-sm">
          <div ref={mapContainerRef} className="w-full h-[400px] md:h-[500px]" />
        </div>
      </div>
    </section>
  );
}