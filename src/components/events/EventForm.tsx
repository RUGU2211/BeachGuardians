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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Event, EventCategory } from '@/lib/types';
import React from 'react';
import { getNewEventNotificationTemplate } from '@/lib/email-templates';
import { sendEmailFromClient } from '@/lib/client-email';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LocationPicker } from './LocationPicker';
import type { EventLocationDetails } from '@/lib/event-location-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchIndianLocations, type IndianLocationDetails } from '@/lib/indian-location-service';
import { getAuth } from 'firebase/auth';
import { FileText, Upload, X } from 'lucide-react';

const eventFormSchema = z.object({
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

type EventFormValues = z.infer<typeof eventFormSchema>;

const defaultValues: Partial<EventFormValues> = {
  name: '',
  startTime: '09:00',
  endTime: '12:00',
  category: 'beach_cleanup' as EventCategory,
  location: '',
  description: '',
  organizer: 'BeachGuardians Community',
};

export function EventForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [locationDetails, setLocationDetails] = React.useState<EventLocationDetails | undefined>();
  const [supportingDocument, setSupportingDocument] = React.useState<File | null>(null);
  const [supportingDocumentUrl, setSupportingDocumentUrl] = React.useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = React.useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const handleDocumentUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingDocument(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/events/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      const result = await response.json();
      setSupportingDocumentUrl(result.url);
      setSupportingDocument(file);
      toast({
        title: 'Document Uploaded',
        description: 'Supporting document has been uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Document upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDocumentRemove = () => {
    setSupportingDocument(null);
    setSupportingDocumentUrl(null);
  };

  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);

    // Sanitize locationDetails to remove undefined values
    let sanitizedLocationDetails: EventLocationDetails | undefined = locationDetails ? {
      // Only include address if present
      ...(locationDetails.address !== undefined && { address: locationDetails.address }),
      // Only include coordinates if both latitude and longitude are present
      ...(locationDetails.coordinates?.latitude !== undefined && locationDetails.coordinates?.longitude !== undefined && {
        coordinates: {
          latitude: locationDetails.coordinates.latitude,
          longitude: locationDetails.coordinates.longitude,
        },
      }),
      // Include common optional fields when present
      ...(locationDetails.city !== undefined && { city: locationDetails.city }),
      ...(locationDetails.state !== undefined && { state: locationDetails.state }),
      ...(locationDetails.country !== undefined && { country: locationDetails.country }),
      ...(locationDetails.postalCode !== undefined && { postalCode: locationDetails.postalCode }),
      // Keep any extended fields from India geocoding if present
      ...(locationDetails.district !== undefined && { district: locationDetails.district as any }),
      ...(locationDetails.subDistrict !== undefined && { subDistrict: locationDetails.subDistrict as any }),
      ...(locationDetails.placeId !== undefined && { placeId: locationDetails.placeId }),
    } : undefined;

    // If no locationDetails or coordinates are missing/zero, attempt geocoding restricted to India
    const coordsAreMissing = !sanitizedLocationDetails?.coordinates ||
      (sanitizedLocationDetails?.coordinates.latitude === 0 && sanitizedLocationDetails?.coordinates.longitude === 0);

    if (!sanitizedLocationDetails || coordsAreMissing) {
      try {
        const results: IndianLocationDetails[] = await searchIndianLocations(data.location);
        if (results && results.length > 0) {
          const first = results[0];
          sanitizedLocationDetails = {
            ...(first.address !== undefined && { address: first.address }),
            ...(first.coordinates?.latitude !== undefined && first.coordinates?.longitude !== undefined && {
              coordinates: {
                latitude: first.coordinates.latitude,
                longitude: first.coordinates.longitude,
              },
            }),
            ...(first.placeId !== undefined && { placeId: first.placeId }),
            ...(first.city !== undefined && { city: first.city }),
            ...(first.state !== undefined && { state: first.state }),
            ...(first.country !== undefined && { country: first.country }),
            ...(first.postalCode !== undefined && { postalCode: first.postalCode }),
          } as any;
        } else {
          throw new Error('No matching Indian address found');
        }
      } catch (geoErr) {
        console.error('Geocoding failed:', geoErr);
        setIsSubmitting(false);
        return toast({
          title: 'Invalid Location',
          description: 'Please enter a valid Indian address and pick a suggestion.',
          variant: 'destructive',
        });
      }
    }

    const newEventData = {
      name: data.name,
      date: data.startDate.toISOString(), // Keep for backward compatibility
      time: `${data.startTime} - ${data.endTime}`, // Keep for backward compatibility
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      category: data.category,
      location: data.location,
      locationDetails: sanitizedLocationDetails,
      // Mirror flat location fields for backend compatibility
      event_location: sanitizedLocationDetails?.address || data.location,
      latitude: sanitizedLocationDetails?.coordinates?.latitude,
      longitude: sanitizedLocationDetails?.coordinates?.longitude,
      description: data.description,
      organizer: data.organizer,
      volunteers: [],
      mapImageUrl: (await import('@/lib/event-images')).getRandomEventImage(),
      status: 'upcoming' as const,
      wasteCollectedKg: 0,
      supportingDocumentUrl: supportingDocumentUrl || undefined,
    };

    try {
      const docRef = await addDoc(collection(db, 'events'), newEventData);
      console.log("Document written with ID: ", docRef.id);
      
      toast({
        title: "Event Created!",
        description: `${data.name} has been successfully scheduled.`,
      });

      // Broadcast email notifications to volunteers and admins
      try {
        await fetch('/api/events/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: docRef.id }),
        });
      } catch (broadcastErr) {
        console.warn('Broadcast email failed or not configured:', broadcastErr);
      }

      router.push('/events');
      router.refresh();

    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        title: "Event Creation Failed",
        description: "There was an error saving the event. Please try again.",
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
                        {field.value ? format(field.value, 'PPP') : <span>Pick a start date</span>}
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
                        {field.value ? format(field.value, 'PPP') : <span>Pick an end date</span>}
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

        <div className="space-y-4">
          <FormLabel>Supporting Document (Optional)</FormLabel>
          <FormDescription>
            Upload government permission document (PDF only, max 10MB). This document will be visible to volunteers.
          </FormDescription>
          
          {supportingDocumentUrl ? (
            <div className="flex items-center space-x-4 p-4 border rounded-lg bg-muted/50">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{supportingDocument?.name || 'Document'}</p>
                <p className="text-sm text-muted-foreground">Document uploaded successfully</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDocumentRemove}
                disabled={isUploadingDocument}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleDocumentUpload(file);
                  }
                }}
                disabled={isUploadingDocument}
                className="cursor-pointer"
              />
              {isUploadingDocument && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading document...</span>
                </div>
              )}
            </div>
          )}
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting || isUploadingDocument}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Creating Event...' : 'Create Event'}
        </Button>
      </form>
    </Form>
  );
}
