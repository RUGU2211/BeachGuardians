"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/types';
import { subscribeToEvents } from '@/lib/firebase';

// Filters removed for landing page: we show all events without controls

export default function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToEvents(
      (data) => {
        setEvents(data);
        setLoading(false);
      },
      (err) => {
        console.error('Events subscription error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filtered = events; // No filters on landing page

  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Upcoming Events</h2>
            <p className="text-muted-foreground">Find cleanups near you and register now.</p>
          </div>
          <Link href="/events" className="text-primary hover:underline">View all</Link>
        </div>

        {/* Filters removed per request: show all events on landing */}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading events…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((event) => (
              <article key={event.id} className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 space-y-2">
                  <h3 className="text-xl font-semibold">{event.name}</h3>
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