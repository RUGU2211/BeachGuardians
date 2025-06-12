import { EventCard } from '@/components/events/EventCard';
import { mockEvents } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function EventsPage() {
  const upcomingEvents = mockEvents.filter(event => event.status === 'upcoming' || event.status === 'ongoing');
  const pastEvents = mockEvents.filter(event => event.status === 'completed' || event.status === 'cancelled');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Upcoming Events</h1>
        <Button asChild>
          <Link href="/events/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Event
          </Link>
        </Button>
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
