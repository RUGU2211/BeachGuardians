'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { mockEvents, mockVolunteers, getEventById, getVolunteerById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Users, Award, ChevronLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const event = getEventById(eventId);

  if (!event) {
    return <div className="text-center py-10">Event not found.</div>;
  }

  const eventDate = new Date(event.date);
  const registeredVolunteers = event.volunteers.map(id => getVolunteerById(id)).filter(Boolean);

  const handleGeoCheckIn = () => {
    // Placeholder for Geo Check-in logic
    alert('Geo Check-in: This feature would use your device location. (Not implemented)');
  };

  const getStatusBadge = (status: Event['status']) => {
    switch(status) {
      case 'upcoming': return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600"><Clock className="mr-1 h-3 w-3" />Upcoming</Badge>;
      case 'ongoing': return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600"><Clock className="mr-1 h-3 w-3" />Ongoing</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  }


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
      </Button>

      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="p-0 relative">
          <Image
            src={event.mapImageUrl || "https://placehold.co/1200x400.png"}
            alt={`${event.name} location map`}
            data-ai-hint="map location"
            width={1200}
            height={400}
            className="w-full h-64 md:h-96 object-cover"
          />
           <div className="absolute top-4 right-4">
             {getStatusBadge(event.status)}
           </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <CardTitle className="text-3xl md:text-4xl font-headline text-primary">{event.name}</CardTitle>
          
          <div className="grid md:grid-cols-2 gap-4 text-md">
            <div className="flex items-center">
              <CalendarDays className="mr-3 h-5 w-5 text-primary" />
              <span>{eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {event.time}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-3 h-5 w-5 text-primary" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5 text-primary" />
              <span>{event.volunteers.length} registered volunteers</span>
            </div>
            {event.status === 'completed' && event.wasteCollectedKg && (
              <div className="flex items-center">
                <Award className="mr-3 h-5 w-5 text-primary" />
                <span>{event.wasteCollectedKg} kg of waste collected</span>
              </div>
            )}
          </div>

          <CardDescription className="text-base leading-relaxedwhitespace-pre-line">
            {event.description}
          </CardDescription>

          <div className="space-x-2 mt-4">
            {(event.status === 'upcoming' || event.status === 'ongoing') && (
                 <Button size="lg">Register for this Event</Button>
            )}
            <Button variant="outline" size="lg" onClick={handleGeoCheckIn}>
              Geo Check-in (Mobile Sim)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Registered Volunteers ({registeredVolunteers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {registeredVolunteers.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {registeredVolunteers.map(volunteer => (
                volunteer && (
                  <li key={volunteer.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar>
                      <AvatarImage src={volunteer.avatarUrl} alt={volunteer.name} data-ai-hint="person avatar" />
                      <AvatarFallback>{volunteer.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{volunteer.name}</p>
                      <p className="text-xs text-muted-foreground">{volunteer.email}</p>
                    </div>
                  </li>
                )
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No volunteers registered yet for this event.</p>
          )}
        </CardContent>
         {event.status === 'completed' && (
          <CardFooter>
            <Button asChild variant="secondary">
              <Link href={`/admin/event-summary/${event.id}`}>Generate Event Summary (AI)</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
