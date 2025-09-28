"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, EventCategory } from '@/lib/types';
import { subscribeToEvents } from '@/lib/firebase';
import { Waves, Droplets, TreePine, Building2, Megaphone, Sprout, Recycle, BookOpen } from 'lucide-react';
import { pickEventImage } from '@/lib/event-images';

// Filters removed for landing page: we show all events without controls

export default function UpcomingEventsAdvanced() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToEvents(
      (data) => {
        setEvents(data);
        setLoading(false);
      },
      (err) => {
        setLoadError('Unable to load events.');
        console.error('Events subscription error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filtered = events; // No filters on landing page

  const categoryIcon = (cat?: EventCategory) => {
    switch (cat) {
      case 'beach_cleanup': return <Waves className="w-6 h-6" />;
      case 'river_cleanup': return <Droplets className="w-6 h-6" />;
      case 'park_cleanup': return <TreePine className="w-6 h-6" />;
      case 'street_cleanup': return <Building2 className="w-6 h-6" />;
      case 'awareness_campaign': return <Megaphone className="w-6 h-6" />;
      case 'tree_planting': return <Sprout className="w-6 h-6" />;
      case 'recycling_drive': return <Recycle className="w-6 h-6" />;
      case 'educational_workshop': return <BookOpen className="w-6 h-6" />;
      default: return <Waves className="w-6 h-6" />;
    }
  };

  const categoryLabel = (cat?: EventCategory) => {
    return (cat || 'beach_cleanup').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Default event image for landing cards will be random among 4 options

  return (
    <section className="w-full py-16 md:py-24 bg-gradient-to-b from-white to-blue-50/40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Upcoming Events</h2>
            <p className="text-muted-foreground">Find cleanups near you and register now.</p>
          </div>
          <Link href="/events" className="text-primary hover:underline">View all</Link>
        </div>

        {/* Filters removed per request: show all events on landing */}

        {loadError && (
          <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading events…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-40">
                  <img
                    src={event.imageUrl || (event as any).mapImageUrl || pickEventImage(event.id)}
                    alt={event.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 text-blue-900">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 shadow">
                      {categoryIcon(event.category)}
                    </div>
                    <Badge variant="secondary" className="bg-white/70 text-blue-900 border-blue-200">
                      {categoryLabel(event.category)}
                    </Badge>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-lg md:text-xl font-semibold line-clamp-2">{event.name}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(event.startDate).toLocaleString()}</p>
                  <p className="text-sm">{(event as any).event_location || event.location || 'TBA'}</p>
                  <div className="flex justify-between items-center pt-3">
                    <Link href={`/events/${event.id}`} className="text-primary hover:underline">Details</Link>
                    <Button asChild size="sm" className="bg-primary text-primary-foreground">
                      <Link href={`/events/${event.id}`}>Register Now</Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground">No events match your filters.</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}