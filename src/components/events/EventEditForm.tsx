'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateEvent, deleteEvent } from '@/lib/firebase';
import type { Event, EventCategory } from '@/lib/types';
import React from 'react';
import { LocationPicker } from './LocationPicker';
import type { EventLocationDetails } from '@/lib/event-location-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const eventEditFormSchema = z.object({
  name: z.string().min(3, { message: 'Event name must be at least 3 characters.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:MM format (e.g., 09:00).',
  }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:MM format (e.g., 12:00).',
  }),
  category: z.enum(['beach_cleanup', 'river_cleanup', 'park_cleanup', 'street_cleanup', 'awareness_campaign', 'tree_planting', 'recycling_drive', 'educational_workshop'], {
    required_error: 'Please select an event category.',
  }),
  location: z.string().min(5, { message: 'Location must be at least 5 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }).max(500, {message: 'Description must be less than 500 characters.'}),
  organizer: z.string().min(2, { message: 'Organizer name must be at least 2 characters.' }),
}).refine((data) => {
  const startDateTime = new Date(`${data.startDate.toDateString()} ${data.startTime}`);
  const endDateTime = new Date(`${data.endDate.toDateString()} ${data.endTime}`);
  return endDateTime > startDateTime;
}, {
  message: "End date and time must be after start date and time.",
  path: ["endDate"],
});

type EventEditFormValues = z.infer<typeof eventEditFormSchema>;

interface EventEditFormProps {
  event: Event;
  onSuccess?: () => void;
}

export function EventEditForm({ event, onSuccess }: EventEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [locationDetails, setLocationDetails] = React.useState<EventLocationDetails | undefined>(
    event.locationDetails
  );

  const form = useForm<EventEditFormValues>({
    resolver: zodResolver(eventEditFormSchema),
    defaultValues: {
      name: event.name,
      startDate: event.startDate ? new Date(event.startDate) : new Date(event.date),
      endDate: event.endDate ? new Date(event.endDate) : new Date(event.date),
      startTime: event.startTime || event.time?.split(' - ')[0] || '09:00',
      endTime: event.endTime || event.time?.split(' - ')[1] || '12:00',
      category: event.category || 'beach_cleanup',
      location: event.location,
      description: event.description,
      organizer: event.organizer,
    },
    mode: 'onChange',
  });

  async function handleDeleteEvent() {
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      toast({
        title: "Event Deleted",
        description: `${event.name} has been successfully deleted.`,
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/events');
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
  }

  async function onSubmit(data: EventEditFormValues) {
    setIsSubmitting(true);

    // Sanitize locationDetails to remove undefined values
    const sanitizedLocationDetails = locationDetails ? {
      ...locationDetails,
      // Remove undefined values to prevent Firebase errors
      ...(locationDetails.postalCode !== undefined && { postalCode: locationDetails.postalCode }),
      ...(locationDetails.state !== undefined && { state: locationDetails.state }),
      ...(locationDetails.country !== undefined && { country: locationDetails.country }),
      ...(locationDetails.district !== undefined && { district: locationDetails.district }),
      ...(locationDetails.subDistrict !== undefined && { subDistrict: locationDetails.subDistrict }),
    } : undefined;

    const updatedEventData = {
      name: data.name,
      date: data.startDate.toISOString(), // Keep for backward compatibility
      time: `${data.startTime} - ${data.endTime}`, // Keep for backward compatibility
      startDate: data.startDate,
      endDate: data.endDate,
      category: data.category,
      location: data.location,
      locationDetails: sanitizedLocationDetails,
      description: data.description,
      organizer: data.organizer,
    };

    try {
      await updateEvent(event.id, updatedEventData);
      
      toast({
        title: "Event Updated!",
        description: `${data.name} has been successfully updated.`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/events');
        router.refresh();
      }

    } catch (e) {
      console.error("Error updating event: ", e);
      toast({
        title: "Event Update Failed",
        description: "There was an error updating the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual Beach Cleanup" {...field} />
              </FormControl>
              <FormDescription>The official name of the cleanup event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value instanceof Date && !isNaN(field.value.getTime())
                          ? format(field.value, 'PPP')
                          : <span>Pick a start date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Select the start date for the event.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value instanceof Date && !isNaN(field.value.getTime())
                          ? format(field.value, 'PPP')
                          : <span>Pick an end date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Select the end date for the event.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 09:00" {...field} />
                </FormControl>
                <FormDescription>Start time in HH:MM format (24-hour).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 12:00" {...field} />
                </FormControl>
                <FormDescription>End time in HH:MM format (24-hour).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="beach_cleanup">Beach Cleanup</SelectItem>
                  <SelectItem value="river_cleanup">River Cleanup</SelectItem>
                  <SelectItem value="park_cleanup">Park Cleanup</SelectItem>
                  <SelectItem value="street_cleanup">Street Cleanup</SelectItem>
                  <SelectItem value="awareness_campaign">Awareness Campaign</SelectItem>
                  <SelectItem value="tree_planting">Tree Planting</SelectItem>
                  <SelectItem value="recycling_drive">Recycling Drive</SelectItem>
                  <SelectItem value="educational_workshop">Educational Workshop</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Choose the type of environmental event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <LocationPicker
                  value={field.value}
                  locationDetails={locationDetails}
                  onChange={(location, details) => {
                    field.onChange(location);
                    setLocationDetails(details);
                  }}
                  placeholder="Search for event location..."
                />
              </FormControl>
              <FormDescription>Search and select the exact location for your event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us more about the event, what to bring, etc."
                  className="resize-y min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>Provide a clear and concise description of the event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="organizer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., BeachGuardians Community Leaders" {...field} />
              </FormControl>
              <FormDescription>Name of the person or group organizing this event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={isSubmitting || isDeleting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Updating Event...' : 'Update Event'}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            size="lg" 
            onClick={() => router.back()}
            disabled={isSubmitting || isDeleting}
          >
            Cancel
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Event
                  </>
                )}
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
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
        </div>
      </form>
    </Form>
  );
}