'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { mockEvents } from '@/lib/mockData'; // To select an event

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
  path: ['otherWasteType'], // Path to the field that should display the error
});


type WasteLogFormValues = z.infer<typeof wasteLogFormSchema>;

const wasteTypes = ['Plastic Bottles', 'Plastic Bags', 'Glass', 'Metal Cans', 'Paper/Cardboard', 'Cigarette Butts', 'Fishing Gear', 'General Litter', 'Other'];

export function WasteLogForm() {
  const { toast } = useToast();
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

  function onSubmit(data: WasteLogFormValues) {
    const finalData = {
      ...data,
      wasteType: data.wasteType === 'Other' ? data.otherWasteType : data.wasteType,
    };
    console.log('Waste log data submitted:', finalData);
    toast({
      title: "Waste Logged!",
      description: `${finalData.weightKg}kg of ${finalData.wasteType} has been successfully logged.`,
    });
    form.reset(); // Reset form after successful submission
  }
  
  const activeEvents = mockEvents.filter(event => event.status === 'upcoming' || event.status === 'ongoing' || event.status === 'completed');


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
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({new Date(event.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select the event for which you are logging waste.</FormDescription>
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

        <Button type="submit" size="lg">Log Waste</Button>
      </form>
    </Form>
  );
}
