'use client';

import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Loader2 } from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export default function EventsPage() {
  const { userProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const eventsCollection = collection(db, 'events');
        const q = query(eventsCollection, orderBy('date', 'desc'));
        const eventSnapshot = await getDocs(q);
        const eventList = eventSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Event[];
        setEvents(eventList);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.date) >= now);
  const pastEvents = events.filter(event => new Date(event.date) < now);
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Upcoming Events</h1>
        {isAdmin && (
          <Button asChild>
            <Link href="/events/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Event
            </Link>
          </Button>
        )}
      </div>
      {upcomingEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No upcoming events. Check back soon!</p>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Past Events</h2>
        {pastEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No past events found.</p>
        )}
      </div>
    </div>
  );
}
