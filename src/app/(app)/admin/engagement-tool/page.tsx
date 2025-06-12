'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestEngagementMessage, type SuggestEngagementMessageInput } from '@/ai/flows/suggest-engagement-message';
import { Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const engagementMessageSchema = z.object({
  volunteerName: z.string().min(2, 'Volunteer name is required.'),
  pastContributions: z.string().min(10, 'Past contributions summary is required.'),
  upcomingEvents: z.string().min(10, 'Upcoming events information is required.'),
  preferredTone: z.string().optional(),
});

type EngagementMessageFormValues = z.infer<typeof engagementMessageSchema>;

export default function AiEngagementToolPage() {
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EngagementMessageFormValues>({
    resolver: zodResolver(engagementMessageSchema),
    defaultValues: {
      volunteerName: '',
      pastContributions: 'Attended 3 beach cleanups, collected approx. 15kg of mixed plastics.',
      upcomingEvents: 'Next month: River Cleanup on the 15th, Tree Planting on the 28th.',
      preferredTone: 'Friendly',
    },
  });

  const onSubmit = async (data: EngagementMessageFormValues) => {
    setIsLoading(true);
    setGeneratedMessage(null);
    try {
      const result = await suggestEngagementMessage(data);
      setGeneratedMessage(result.engagementMessage);
    } catch (error) {
      console.error('Error generating engagement message:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate engagement message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      toast({ title: 'Copied!', description: 'Engagement message copied to clipboard.' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Volunteer Engagement Message Generator</CardTitle>
          <CardDescription>
            Craft personalized messages to encourage volunteer participation and appreciation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="volunteerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volunteer Name</FormLabel>
                    <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pastContributions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Contributions Summary</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Attended X events, collected Y kg of Z waste." {...field} /></FormControl>
                    <FormDescription>Summarize their key involvements.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="upcomingEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relevant Upcoming Events</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Park Cleanup on Sat, Coastal Trail Maintenance next month." {...field} /></FormControl>
                    <FormDescription>Mention events they might be interested in.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredTone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Tone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tone (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Friendly">Friendly</SelectItem>
                        <SelectItem value="Formal">Formal</SelectItem>
                        <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="Appreciative">Appreciative</SelectItem>
                        <SelectItem value="Encouraging">Encouraging</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Message
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedMessage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline">Generated Engagement Message</CardTitle>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea value={generatedMessage} readOnly rows={8} className="bg-muted/50 whitespace-pre-wrap" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
