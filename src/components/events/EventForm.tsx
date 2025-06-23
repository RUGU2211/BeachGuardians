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
import { generateEventImage } from '@/ai/flows/generate-event-image-flow';
import type { Event } from '@/lib/types';
import React from 'react';
import { getNewEventNotificationTemplate } from '@/lib/email-templates';
import { sendEmailFromClient } from '@/lib/client-email';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const eventFormSchema = z.object({
  name: z.string().min(3, { message: 'Event name must be at least 3 characters.' }),
  date: z.date({ required_error: 'Event date is required.' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM - HH:MM format (e.g., 09:00 - 12:00).',
  }),
  location: z.string().min(5, { message: 'Location must be at least 5 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }).max(500, {message: 'Description must be less than 500 characters.'}),
  organizer: z.string().min(2, { message: 'Organizer name must be at least 2 characters.' }),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const defaultValues: Partial<EventFormValues> = {
  name: '',
  time: '09:00 - 12:00',
  location: '',
  description: '',
  organizer: 'BeachGuardians Community',
};

export function EventForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);
    let eventImageUrl = "https://placehold.co/600x400.png"; // Default placeholder

    try {
      toast({
        title: "Generating Event Image...",
        description: "Please wait while we create a unique image for your event.",
      });
      const imageResult = await generateEventImage({
        eventName: data.name,
        eventDescription: data.description,
      });

      if (imageResult?.imageDataUri) {
        try {
          toast({
            title: "AI Image Generated",
            description: "Now uploading to storage...",
          });
          const storageRef = ref(storage, `event-posters/${data.name.replace(/\s+/g, '-')}-${Date.now()}.jpg`);
          // The string is a data URL: "data:image/jpeg;base64,..."
          // We need to upload it as a 'data_url'
          const snapshot = await uploadString(storageRef, imageResult.imageDataUri, 'data_url');
          eventImageUrl = await getDownloadURL(snapshot.ref);
           toast({
            title: "Image Uploaded Successfully!",
            description: "Your event poster is ready.",
          });
        } catch (uploadError) {
          console.error("Error uploading event image to Firebase Storage:", uploadError);
          toast({
            title: "Image Upload Failed",
            description: "Could not upload the AI image. Using a default placeholder.",
            variant: "destructive",
          });
        }
      } else {
         throw new Error("Image generation did not return a data URI.");
      }
    } catch (error) {
      console.error('Error generating event image:', error);
      toast({
        title: "Image Generation Failed",
        description: "Could not generate an AI image. Using a default placeholder.",
        variant: "destructive",
      });
    }

    const newEventData = {
      name: data.name,
      date: data.date.toISOString(),
      time: data.time,
      location: data.location,
      description: data.description,
      organizer: data.organizer,
      volunteers: [],
      mapImageUrl: eventImageUrl,
      status: 'upcoming' as const,
      wasteCollectedKg: 0,
    };

    try {
      const docRef = await addDoc(collection(db, 'events'), newEventData);
      console.log("Document written with ID: ", docRef.id);
      
      toast({
        title: "Event Created!",
        description: `${data.name} has been successfully scheduled.`,
      });

      // Note: Email notifications removed to fix Firebase permission issues
      // In a production app, this would be handled by a server-side function
      
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
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Event Date</FormLabel>
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
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                <FormDescription>Select the date for the event.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Time</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 10:00 - 14:00" {...field} />
                </FormControl>
                <FormDescription>Specify the start and end time (HH:MM - HH:MM).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Sunnyvale Beach, Main Entrance" {...field} />
              </FormControl>
              <FormDescription>Detailed address or meeting point for the event.</FormDescription>
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

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Creating Event...' : 'Create Event & Generate Image'}
        </Button>
      </form>
    </Form>
  );
}
