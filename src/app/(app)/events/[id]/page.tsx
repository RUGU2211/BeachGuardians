'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  getEventById,
  updateEvent,
  addPointsToUser,
  joinEvent,
  leaveEvent,
  getUsersByIds,
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Users, Award, ChevronLeft, CheckCircle, XCircle, Clock, Loader2, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Event, UserProfile } from '@/lib/types';
import { getEventRegistrationConfirmationTemplate } from '@/lib/email-templates';
import { sendEmailFromClient } from '@/lib/client-email';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function VolunteerList({ volunteers }: { volunteers: UserProfile[] }) {
  if (volunteers.length === 0) {
    return <p className="pt-4 text-center text-muted-foreground">No volunteers to display.</p>;
  }
  return (
    <ul className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {volunteers.map(volunteer => (
        <li key={volunteer.uid} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
          <Avatar>
            <AvatarImage src={volunteer.photoURL || undefined} alt={volunteer.displayName} />
            <AvatarFallback>{volunteer.displayName?.charAt(0).toUpperCase() || 'V'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{volunteer.displayName}</p>
            <p className="text-xs text-muted-foreground">{volunteer.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params.id === 'string' ? params.id : '';
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [registeredVolunteers, setRegisteredVolunteers] = useState<UserProfile[]>([]);
  const [checkedInVolunteers, setCheckedInVolunteers] = useState<UserProfile[]>([]);

  const isEventCreator = userProfile?.uid === currentEvent?.organizerId;
  const isAdmin = userProfile?.role === 'admin';
  const canManageEvent = isAdmin || isEventCreator;

  const fetchEventData = useCallback(async () => {
    setIsLoadingEvent(true);
    try {
      const eventData = await getEventById(eventId);
      setCurrentEvent(eventData);

      if (eventData) {
        if (eventData.volunteers.length > 0) {
          const volunteerProfiles = await getUsersByIds(eventData.volunteers);
          setRegisteredVolunteers(volunteerProfiles);
        }
        if (eventData.checkedInVolunteers && Object.keys(eventData.checkedInVolunteers).length > 0) {
          const checkedInIds = Object.keys(eventData.checkedInVolunteers);
          const checkedInProfiles = await getUsersByIds(checkedInIds);
          setCheckedInVolunteers(checkedInProfiles);
        }

        if (userProfile) {
          setIsRegistered(eventData.volunteers.includes(userProfile.uid));
          setHasCheckedIn(!!eventData.checkedInVolunteers?.[userProfile.uid]);
        }
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
      toast({ title: "Error", description: "Could not load event details.", variant: "destructive" });
    } finally {
      setIsLoadingEvent(false);
    }
  }, [eventId, userProfile, toast]);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId, fetchEventData]);

  const handleLeave = async () => {
    if (!userProfile || !currentEvent) return;

    try {
      await leaveEvent(eventId, userProfile.uid);
      setIsRegistered(false);
      await fetchEventData(); // Refresh data to update volunteer list
      toast({
        title: "You've left the event",
        description: `You are no longer registered for ${currentEvent.name}.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to leave event:", error);
      toast({ title: 'Error', description: 'Could not leave the event. Please try again.', variant: 'destructive' });
    }
  };

  const handleCheckIn = async () => {
    if (!userProfile || !currentEvent) return;
    if (hasCheckedIn) {
      toast({ title: 'Already Checked In', description: 'You have already checked in for this event.' });
      return;
    }

    const checkInTime = new Date().toISOString();
    const updatedCheckedInVolunteers = {
      ...currentEvent.checkedInVolunteers,
      [userProfile.uid]: { checkInTime },
    };

    try {
      await updateEvent(eventId, { checkedInVolunteers: updatedCheckedInVolunteers });
      await addPointsToUser(userProfile.uid, 50); // Award 50 points for checking in
      
      setHasCheckedIn(true);
      // Refresh data
      await fetchEventData();
      
      toast({
        title: 'Check-in Successful!',
        description: 'You have earned 50 points for participating. Thank you for making a difference!',
      });
    } catch (error) {
      console.error("Check-in failed:", error);
      toast({ title: 'Check-in Failed', description: 'Could not process your check-in. Please try again.', variant: 'destructive' });
    }
  };

  const handleRegister = async () => {
    if (authLoading || !userProfile || !userProfile.email || !currentEvent) {
      toast({ title: "Cannot Register", description: "Please ensure you are logged in and event details are loaded.", variant: "destructive" });
      if (!userProfile) router.push('/login');
      return;
    }
    
    try {
      await joinEvent(eventId, userProfile.uid);
      
      setIsRegistered(true);
      // Refresh data
      await fetchEventData();

      toast({
        title: "Registration Successful!",
        description: `You have been registered for ${currentEvent.name}.`,
      });

      // Send confirmation email
      try {
          const { subject, html } = getEventRegistrationConfirmationTemplate(
              userProfile.displayName || 'Volunteer',
              currentEvent.name,
              new Date(currentEvent.date).toLocaleDateString()
          );
          await sendEmailFromClient({
              to: userProfile.email,
              subject,
              html,
          });
      } catch (error) {
          console.error("Failed to send registration email:", error);
          toast({
              title: "Email Confirmation Failed",
              description: "We couldn't send a confirmation email, but you are registered.",
              variant: "default"
          });
      }
    } catch (error) {
      console.error("Registration failed:", error);
      toast({ title: 'Registration Failed', description: 'Could not register you for the event. Please try again.', variant: 'destructive' });
    }
  };

  const handleGeoCheckIn = () => {
    toast({
      title: 'Geo Check-in',
      description: 'This feature is not yet implemented.',
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
  const isPastEvent = eventDate < new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
        </Button>
        {canManageEvent && (
          <Button asChild>
            <Link href={`/events/${eventId}/edit`}>
              Edit Event
            </Link>
          </Button>
        )}
      </div>

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
            {(currentEvent.status === 'upcoming' || currentEvent.status === 'ongoing') && !isRegistered && (
              <Button size="lg" onClick={handleRegister} disabled={authLoading}>
                {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Register for this Event
              </Button>
            )}
            {isRegistered && currentEvent?.status === 'ongoing' && !hasCheckedIn &&(
              <Button size="lg" onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                <UserCheck className="mr-2 h-5 w-5" />
                Check In Now
              </Button>
            )}
            {hasCheckedIn && (
              <Button size="lg" disabled variant="outline">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> You are Checked In
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={handleGeoCheckIn}>
              Geo Check-in (Sim)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            Volunteers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="registered">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registered">Registered ({registeredVolunteers.length})</TabsTrigger>
              <TabsTrigger value="checked-in">Checked-in ({checkedInVolunteers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="registered">
              <VolunteerList volunteers={registeredVolunteers} />
            </TabsContent>
            <TabsContent value="checked-in">
              <VolunteerList volunteers={checkedInVolunteers} />
            </TabsContent>
          </Tabs>
        </CardContent>
         {currentEvent.status === 'completed' && (
          <CardFooter>
            <Button asChild variant="secondary">
              <Link href={`/admin/event-summary/${currentEvent.id}`}>Generate Event Summary (AI)</Link>
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Volunteer-specific Actions */}
      {!canManageEvent && !isPastEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Your Participation</CardTitle>
          </CardHeader>
          <CardContent>
            {isRegistered ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center text-green-600 font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  You are registered for this event!
                </div>
                <Button onClick={handleLeave} variant="destructive">
                  Leave Event
                </Button>
              </div>
            ) : (
              <Button onClick={handleRegister}>
                Join Event
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin/Organizer Check-in Panel */}
      {canManageEvent && !isPastEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Check-in Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-x-2 mt-4">
              {currentEvent.status === 'upcoming' && !isRegistered && (
                <Button size="lg" onClick={handleRegister} disabled={authLoading}>
                  {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Register for this Event
                </Button>
              )}
              {isRegistered && currentEvent?.status === 'ongoing' && !hasCheckedIn &&(
                <Button size="lg" onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                  <UserCheck className="mr-2 h-5 w-5" />
                  Check In Now
                </Button>
              )}
              {hasCheckedIn && (
                <Button size="lg" disabled variant="outline">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> You are Checked In
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={handleGeoCheckIn}>
                Geo Check-in (Sim)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
