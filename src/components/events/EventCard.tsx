import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { Event } from '@/lib/types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.date);
  const isUpcoming = event.status === 'upcoming' || event.status === 'ongoing';

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Image
          src={event.mapImageUrl || "https://placehold.co/400x200.png"}
          alt={event.name}
          data-ai-hint="event location"
          width={400}
          height={200}
          className="w-full h-48 object-cover"
        />
         {isUpcoming && (
          <span className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 text-xs font-semibold rounded">
            {event.status.toUpperCase()}
          </span>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl mb-1 font-headline hover:text-primary transition-colors">
          <Link href={`/events/${event.id}`}>{event.name}</Link>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-3 h-16 overflow-hidden text-ellipsis">
          {event.description}
        </CardDescription>
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-primary" />
            <span>{eventDate.toLocaleDateString()} at {event.time}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-primary" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-primary" />
            <span>{event.volunteers.length} volunteers registered</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button asChild className="w-full">
          <Link href={`/events/${event.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
