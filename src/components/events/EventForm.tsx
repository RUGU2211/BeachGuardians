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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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

// Default values for the form
const defaultValues: Partial<EventFormValues> = {
  name: '',
  time: '09:00 - 12:00',
  location: '',
  description: '',
  organizer: 'Shoreline Community',
};

export function EventForm() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  function onSubmit(data: EventFormValues) {
    console.log('Event data submitted:', data);
    // Here you would typically send data to your backend
    // For now, we'll just show a toast and redirect
    toast({
      title: "Event Created!",
      description: `${data.name} has been successfully scheduled.`,
    });
    router.push('/events'); // Redirect to events list page
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
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
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
                <Input placeholder="e.g., Shoreline Community Leaders" {...field} />
              </FormControl>
              <FormDescription>Name of the person or group organizing this event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg">Create Event</Button>
      </form>
    </Form>
  );
}
