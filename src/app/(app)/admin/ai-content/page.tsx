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
import { generateSocialMediaPost, type GenerateSocialMediaPostInput } from '@/ai/flows/generate-social-media-post';
import { Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const socialMediaPostSchema = z.object({
  eventName: z.string().min(3, 'Event name is required.'),
  eventDate: z.string().min(1, 'Event date is required (YYYY-MM-DD).'),
  eventLocation: z.string().min(3, 'Event location is required.'),
  eventDescription: z.string().min(10, 'Event description is required.'),
  targetAudience: z.string().min(3, 'Target audience is required.'),
  callToAction: z.string().min(3, 'Call to action is required.'),
  desiredTone: z.string().min(3, 'Desired tone is required.'),
});

type SocialMediaPostFormValues = z.infer<typeof socialMediaPostSchema>;

export default function AiContentPage() {
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SocialMediaPostFormValues>({
    resolver: zodResolver(socialMediaPostSchema),
    defaultValues: {
      eventName: '',
      eventDate: new Date().toISOString().split('T')[0], // Default to today
      eventLocation: '',
      eventDescription: '',
      targetAudience: 'Local residents and environmental enthusiasts',
      callToAction: 'Register now and spread the word!',
      desiredTone: 'Engaging and informative',
    },
  });

  const onSubmit = async (data: SocialMediaPostFormValues) => {
    setIsLoading(true);
    setGeneratedPost(null);
    try {
      const result = await generateSocialMediaPost(data);
      setGeneratedPost(result.socialMediaPost);
    } catch (error) {
      console.error('Error generating social media post:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate social media post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPost) {
      navigator.clipboard.writeText(generatedPost);
      toast({ title: 'Copied!', description: 'Social media post copied to clipboard.' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Social Media Post Generator</CardTitle>
          <CardDescription>
            Provide event details, and our AI will craft engaging social media content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="eventName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl><Input placeholder="Annual Beach Cleanup" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="eventLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Location</FormLabel>
                    <FormControl><Input placeholder="Sunnyvale Beach" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Description</FormLabel>
                    <FormControl><Textarea placeholder="Join us to clean..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl><Input placeholder="Families, students" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="callToAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call To Action</FormLabel>
                      <FormControl><Input placeholder="Register now!" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="desiredTone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desired Tone</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Informative">Informative</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                          <SelectItem value="Friendly">Friendly</SelectItem>
                          <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                          <SelectItem value="Formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Post
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedPost && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline">Generated Social Media Post</CardTitle>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea value={generatedPost} readOnly rows={10} className="bg-muted/50" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
