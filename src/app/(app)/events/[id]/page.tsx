
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { mockEvents, mockVolunteers, getEventById, getVolunteerById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Users, Award, ChevronLeft, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Event, Volunteer } from '@/lib/types';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params.id === 'string' ? params.id : '';
  
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  useEffect(() => {
    setIsLoadingEvent(true);
    const eventData = getEventById(eventId);
    if (eventData) {
      setCurrentEvent(eventData);
      if (currentUser && eventData.volunteers.includes(currentUser.uid)) {
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }
    } else {
      setCurrentEvent(null); // Event not found
    }
    setIsLoadingEvent(false);
  }, [eventId, currentUser]);

  const registeredVolunteersDisplayList = useMemo(() => {
    if (!currentEvent) return [];
    return currentEvent.volunteers.map(id => {
      const mockVol = getVolunteerById(id);
      if (mockVol) return mockVol;
      if (currentUser && id === currentUser.uid) {
        return {
          id: currentUser.uid,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || "Registered User",
          email: currentUser.email || "No email",
          avatarUrl: currentUser.photoURL || `https://placehold.co/100x100.png?text=${(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}`,
          points: 0,
          contributions: [],
          achievements: []
        } as Volunteer;
      }
      return null;
    }).filter(Boolean) as Volunteer[];
  }, [currentEvent, currentUser]);

  const handleRegister = () => {
    if (authLoading) return; // Do nothing if auth state is still loading

    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to register for this event.", variant: "destructive" });
      router.push('/login'); // Optionally redirect to login
      return;
    }
    if (!currentEvent) {
      toast({ title: "Error", description: "Event details not loaded or event does not exist.", variant: "destructive" });
      return;
    }

    // Simulate registration
    if (!currentEvent.volunteers.includes(currentUser.uid)) {
      const updatedEvent = {
        ...currentEvent,
        volunteers: [...currentEvent.volunteers, currentUser.uid]
      };
      setCurrentEvent(updatedEvent); // Update local state for immediate UI feedback
      // In a real app, you'd send this update to the backend.
      // For mock data, this change is local.
    }
    setIsRegistered(true);
    toast({
      title: "Registration Successful!",
      description: `You have been registered for ${currentEvent.name}.`,
    });
  };

  const handleGeoCheckIn = () => {
    toast({
      title: 'Geo Check-in',
      description: 'This feature would use your device location. (Not implemented for mock data)',
      variant: 'default'
    });
  };
  
  const getStatusBadge = (status?: Event['status']) => {
    if (!status) return null;
    switch(status) {
      case 'upcoming': return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600"><Clock className="mr-1 h-3 w-3" />Upcoming</Badge>;
      case 'ongoing': return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600"><Clock className="mr-1 h-3 w-3" />Ongoing</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoadingEvent || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading event details...</p>
      </div>
    );
  }

  if (!currentEvent) {
    return <div className="text-center py-10">Event not found. It might have been removed or the ID is incorrect.</div>;
  }

  const eventDate = new Date(currentEvent.date);

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
      </Button>

      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="p-0 relative">
          <Image
            src={currentEvent.mapImageUrl || "https://placehold.co/1200x400.png"}
            alt={`${currentEvent.name} location map`}
            data-ai-hint="map location"
            width={1200}
            height={400}
            className="w-full h-64 md:h-96 object-cover"
            priority // Consider if priority is needed, can cause hydration issues if not handled well
          />
           <div className="absolute top-4 right-4">
             {getStatusBadge(currentEvent.status)}
           </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <CardTitle className="text-3xl md:text-4xl font-headline text-primary">{currentEvent.name}</CardTitle>
          
          <div className="grid md:grid-cols-2 gap-4 text-md">
            <div className="flex items-center">
              <CalendarDays className="mr-3 h-5 w-5 text-primary" />
              <span>{eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {currentEvent.time}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-3 h-5 w-5 text-primary" />
              <span>{currentEvent.location}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5 text-primary" />
              <span>{currentEvent.volunteers.length} registered</span> 
              {/* This length updates from currentEvent state */}
            </div>
            {currentEvent.status === 'completed' && currentEvent.wasteCollectedKg && (
              <div className="flex items-center">
                <Award className="mr-3 h-5 w-5 text-primary" />
                <span>{currentEvent.wasteCollectedKg} kg of waste collected</span>
              </div>
            )}
          </div>

          <CardDescription className="text-base leading-relaxed whitespace-pre-line">
            {currentEvent.description}
          </CardDescription>

          <div className="space-x-2 mt-4">
            {(currentEvent.status === 'upcoming' || currentEvent.status === 'ongoing') && (
              isRegistered ? (
                <Button size="lg" disabled variant="outline">
                  <CheckCircle className="mr-2 h-5 w-5" /> Registered
                </Button>
              ) : (
                <Button size="lg" onClick={handleRegister} disabled={authLoading}>
                  {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Register for this Event
                </Button>
              )
            )}
            <Button variant="outline" size="lg" onClick={handleGeoCheckIn}>
              Geo Check-in (Sim)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Registered Volunteers ({registeredVolunteersDisplayList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {registeredVolunteersDisplayList.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {registeredVolunteersDisplayList.map(volunteer => (
                <li key={volunteer.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar>
                    <AvatarImage src={volunteer.avatarUrl} alt={volunteer.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{volunteer.name?.split(' ').map(n=>n[0]).join('').toUpperCase() || 'V'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{volunteer.name}</p>
                    <p className="text-xs text-muted-foreground">{volunteer.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No volunteers registered yet for this event.</p>
          )}
        </CardContent>
         {currentEvent.status === 'completed' && (
          <CardFooter>
            <Button asChild variant="secondary">
              <Link href={`/admin/event-summary/${currentEvent.id}`}>Generate Event Summary (AI)</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
