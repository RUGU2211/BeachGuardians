'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { logWasteForEvent, getAllEvents, checkUserRegistration } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import type { Event } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';

const wasteLogFormSchema = z.object({
  eventId: z.string({ required_error: 'Please select an event.' }),
  wasteType: z.string().min(1, { message: 'Please select a waste type.' }),
  otherWasteType: z.string().optional(),
  weightKg: z.coerce.number().min(0.1, { message: 'Weight must be at least 0.1 kg.' }),
}).refine(data => {
  if (data.wasteType === 'Other' && (!data.otherWasteType || data.otherWasteType.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Please specify the type of waste if "Other" is selected.',
  path: ['otherWasteType'],
});

type WasteLogFormValues = z.infer<typeof wasteLogFormSchema>;

const wasteTypes = ['Plastic Bottles', 'Plastic Bags', 'Glass', 'Metal Cans', 'Paper/Cardboard', 'Cigarette Butts', 'Fishing Gear', 'General Litter', 'Other'];

export function WasteLogForm() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisteredForSelected, setIsRegisteredForSelected] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      const allEvents = await getAllEvents();
      console.log('All events fetched:', allEvents);
      // Filter for events that are not cancelled
      const filteredEvents = allEvents.filter(event => event.status !== 'cancelled');
      console.log('Filtered events:', filteredEvents);
      setActiveEvents(filteredEvents);
    }
    fetchEvents();
  }, []);
  
  const form = useForm<WasteLogFormValues>({
    resolver: zodResolver(wasteLogFormSchema),
    defaultValues: {
      eventId: '',
      wasteType: '',
      otherWasteType: '',
      weightKg: 0.1,
    },
    mode: 'onChange',
  });

  const selectedWasteType = form.watch('wasteType');
  const selectedEventId = form.watch('eventId');

  useEffect(() => {
    async function checkRegistration() {
      if (!userProfile || !selectedEventId) {
        setIsRegisteredForSelected(null);
        return;
      }
      const authUid = getAuth().currentUser?.uid || userProfile.uid;
      if (!authUid) {
        setIsRegisteredForSelected(null);
        return;
      }
      const registered = await checkUserRegistration(selectedEventId, authUid);
      setIsRegisteredForSelected(registered);
    }
    checkRegistration();
  }, [selectedEventId, userProfile?.uid]);

  async function onSubmit(data: WasteLogFormValues) {
    if (!userProfile) {
      toast({ title: "Authentication Required", description: "You must be logged in to log waste.", variant: "destructive" });
      return;
    }
    const authUid = getAuth().currentUser?.uid || userProfile.uid;
    if (!authUid) {
      toast({ title: "Authentication Required", description: "Please log in again to log waste.", variant: "destructive" });
      return;
    }
    const registered = await checkUserRegistration(data.eventId, authUid);
    if (!registered) {
      toast({ title: "Registration Required", description: "Please register for this event before logging waste.", variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      const finalWasteType = data.wasteType === 'Other' ? data.otherWasteType! : data.wasteType;
      await logWasteForEvent(data.eventId, {
        type: finalWasteType,
        weightKg: data.weightKg,
        loggedBy: userProfile.uid,
      });

      const pointsToAward = Math.round(data.weightKg * 10);
      toast({
        title: "Waste Logged!",
        description: `You've successfully logged ${data.weightKg}kg of ${finalWasteType} and earned ${pointsToAward} points!`,
      });
      form.reset();
    } catch (error) {
      console.error('Failed to log waste:', error);
      toast({ title: "Submission Failed", description: "Could not log waste. Please try again.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="eventId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeEvents.map(event => (
                    <SelectItem key={event.id || `event-${event.name}-${event.date}`} value={event.id}>
                      {event.name} ({new Date(event.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the event for which you are logging waste.
                {isRegisteredForSelected === false && (
                  <span className="text-destructive ml-1">You must be registered for this event to log waste.</span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="wasteType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of Waste</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select waste type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {wasteTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Categorize the waste you collected.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedWasteType === 'Other' && (
          <FormField
            control={form.control}
            name="otherWasteType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Other Waste Type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Styrofoam pieces" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="weightKg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 2.5" {...field} step="0.1" />
              </FormControl>
              <FormDescription>Enter the approximate weight of the collected waste in kilograms.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={isLoading || isRegisteredForSelected === false}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Waste
        </Button>
      </form>
    </Form>
  );
}
