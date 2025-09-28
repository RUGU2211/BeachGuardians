import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Edit, Trash2, Clock, MapPin, Tag } from 'lucide-react';
import type { Event } from '@/lib/types';
import { EventLocationBadge } from './EventLocation';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { deleteEvent } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getEventStatus, getEventDuration } from '@/lib/event-filters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EventCardProps {
  event: Event;
  onEventDeleted?: () => void;
  viewMode?: 'grid' | 'list';
}

export function EventCard({ event, onEventDeleted, viewMode = 'grid' }: EventCardProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Safely parse dates to avoid RangeError from invalid inputs
  const toValidDate = (value?: string) => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const eventDate = toValidDate(event.date);
  const startDate = toValidDate(event.startDate) ?? eventDate;
  const endDate = toValidDate(event.endDate) ?? eventDate;
  const startTime = event.startTime || event.time;
  const endTime = event.endTime || event.time;
  
  const eventStatus = getEventStatus(event);
  const eventDuration = getEventDuration(event);
  const isAdmin = userProfile?.role === 'admin' && userProfile?.isAdminVerified;

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      toast({
        title: "Event Deleted",
        description: `${event.name} has been successfully deleted.`,
      });
      if (onEventDeleted) {
        onEventDeleted();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ongoing': return 'default';
      case 'upcoming': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDateRange = () => {
    const dateFmt = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // If both start and end dates are present and valid
    if (startDate && endDate) {
      const isSameDay = startDate.toDateString() === endDate.toDateString();
      if (isSameDay) {
        const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : (startTime || endTime || 'All day');
        return `${dateFmt.format(startDate)} • ${timeRange}`;
      } else {
        return `${dateFmt.format(startDate)} - ${dateFmt.format(endDate)}`;
      }
    }

    // Fallback to single event date if valid
    if (eventDate) {
      const singleDayTime = startTime || endTime || event.time;
      return singleDayTime
        ? `${dateFmt.format(eventDate)} • ${singleDayTime}`
        : `${dateFmt.format(eventDate)} • All day`;
    }

    // If no valid date, show time only if available; otherwise empty string
    const singleDayTime = startTime || endTime || event.time;
    return singleDayTime || '';
  };

  if (viewMode === 'list') {
    return (
      <Card className="flex overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex-1 p-4 relative">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-lg font-headline hover:text-primary transition-colors">
              <Link href={`/events/${event.id}`}>{event.name}</Link>
            </CardTitle>
            <div className="flex gap-2">
              <Badge 
                variant={getStatusBadgeVariant(eventStatus)}
                className="text-xs"
              >
                {eventStatus.toUpperCase()}
              </Badge>
              {event.category && (
                <Badge variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {event.category}
                </Badge>
              )}
            </div>
          </div>
          
          <CardDescription className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {event.description}
          </CardDescription>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                <span>{formatDateRange()}</span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                <span>{eventDuration}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-primary" />
                <span className="truncate">{event.location}</span>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span>{event.volunteers.length} volunteers</span>
              </div>
            </div>
          </div>

          {/* Compact location badge with Directions in list view */}
          <div className="mt-1">
            <EventLocationBadge 
              location={event.location} 
              locationDetails={event.locationDetails}
              showDistance={true}
            />
          </div>
          
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={`/events/${event.id}`}>View Details</Link>
            </Button>
            
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/events/${event.id}/edit`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{event.name}"? This action cannot be undone and will also delete all associated waste logs.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteEvent}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Event'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-headline hover:text-primary transition-colors">
            <Link href={`/events/${event.id}`}>{event.name}</Link>
          </CardTitle>
          <div className="flex gap-2">
            <Badge 
              variant={getStatusBadgeVariant(eventStatus)}
              className="text-xs"
            >
              {eventStatus.toUpperCase()}
            </Badge>
            {event.category && (
              <Badge variant="outline">
                <Tag className="w-3 h-3 mr-1" />
                {event.category}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sm text-muted-foreground mb-3 h-16 overflow-hidden text-ellipsis">
          {event.description}
        </CardDescription>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-primary" />
            <span className="text-xs">{formatDateRange()}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-primary" />
            <span>{eventDuration}</span>
          </div>
          <EventLocationBadge 
            location={event.location} 
            locationDetails={event.locationDetails}
            showDistance={true}
          />
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-primary" />
            <span>{event.volunteers.length} volunteers registered</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex gap-2 w-full">
          <Button asChild className="flex-1">
            <Link href={`/events/${event.id}`}>View Details</Link>
          </Button>
          
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="px-3"
              >
                <Link href={`/events/${event.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{event.name}"? This action cannot be undone and will also delete all associated waste logs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteEvent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Event'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
