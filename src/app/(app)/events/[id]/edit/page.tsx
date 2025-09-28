'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventById } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { EventEditForm } from '@/components/events/EventEditForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Event } from '@/lib/types';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventId = params.id as string;
  const isAdmin = userProfile?.role === 'admin' && userProfile?.isAdminVerified;

  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      
      try {
        const eventData = await getEventById(eventId);
        if (eventData) {
          setEvent(eventData);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchEvent();
    }
  }, [eventId, authLoading]);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/events');
    }
  }, [authLoading, isAdmin, router]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to edit events. Only verified administrators can edit events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/events">Back to Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error || 'Event not found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/events">Back to Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push(`/events/${eventId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/events/${eventId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Link>
        </Button>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
          <p className="text-muted-foreground">
            Update the details for "{event.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Make changes to the event information below. All fields are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventEditForm event={event} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}