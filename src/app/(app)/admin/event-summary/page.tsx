'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { summarizeCleanupEvent, type SummarizeCleanupEventInput } from '@/ai/flows/summarize-cleanup-event';
import { Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const eventSummarySchema = z.object({
  eventName: z.string().min(3, 'Event name is required.'),
  location: z.string().min(3, 'Location is required.'),
  date: z.string().min(1, 'Date is required (YYYY-MM-DD).'),
  totalVolunteers: z.coerce.number().int().min(0, 'Total volunteers must be a non-negative number.'),
  totalWasteCollectedKg: z.coerce.number().min(0, 'Total waste must be a non-negative number.'),
  typesOfWasteCollected: z.string().min(3, 'Types of waste are required (comma separated).'),
  notableObservations: z.string().min(10, 'Notable observations are required.'),
});

type EventSummaryFormValues = z.infer<typeof eventSummarySchema>;

export default function AiEventSummaryPage() {
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EventSummaryFormValues>({
    resolver: zodResolver(eventSummarySchema),
    defaultValues: {
      eventName: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      totalVolunteers: 0,
      totalWasteCollectedKg: 0,
      typesOfWasteCollected: 'Plastic bottles, food wrappers, cans',
      notableObservations: 'A large amount of microplastics found near the waterline. Volunteers were very enthusiastic.',
    },
  });

  const onSubmit = async (data: EventSummaryFormValues) => {
    setIsLoading(true);
    setGeneratedSummary(null);
    try {
      const result = await summarizeCleanupEvent(data);
      setGeneratedSummary(result.summary);
    } catch (error) {
      console.error('Error generating event summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate event summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedSummary) {
      navigator.clipboard.writeText(generatedSummary);
      toast({ title: 'Copied!', description: 'Event summary copied to clipboard.' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Cleanup Event Summarizer</CardTitle>
          <CardDescription>
            Input the details of a cleanup event to generate a concise summary for reports and stakeholders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="eventName" render={({ field }) => (
                    <FormItem><FormLabel>Event Name</FormLabel><FormControl><Input placeholder="Summer Beach Cleanup" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Central City Beach" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="totalVolunteers" render={({ field }) => (
                    <FormItem><FormLabel>Total Volunteers</FormLabel><FormControl><Input type="number" placeholder="50" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="totalWasteCollectedKg" render={({ field }) => (
                    <FormItem><FormLabel>Total Waste (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="120.5" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="typesOfWasteCollected" render={({ field }) => (
                  <FormItem><FormLabel>Types of Waste Collected</FormLabel><FormControl><Input placeholder="Plastics, glass, metal" {...field} /></FormControl><FormDescription>Comma separated list.</FormDescription><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="notableObservations" render={({ field }) => (
                  <FormItem><FormLabel>Notable Observations</FormLabel><FormControl><Textarea placeholder="Observed increase in fishing nets..." {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Summary
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedSummary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline">Generated Event Summary</CardTitle>
             <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea value={generatedSummary} readOnly rows={8} className="bg-muted/50 whitespace-pre-wrap" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
