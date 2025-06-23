'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { MessageSquare, Send, Copy, RefreshCw } from 'lucide-react';
import { runFlow } from '@genkit-ai/next/client';
import { suggestEngagementMessageFlow } from '@/ai/flows/suggest-engagement-message';
import { useToast } from '@/hooks/use-toast';

export default function EngagementToolPage() {
  const [volunteerName, setVolunteerName] = useState('');
  const [pastContributions, setPastContributions] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState('');
  const [preferredTone, setPreferredTone] = useState('friendly');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMessage('');
    try {
      const result = await runFlow<typeof suggestEngagementMessageFlow>({
        url: '/api/engagement-message',
        input: {
          volunteerName,
          pastContributions,
          upcomingEvents,
          preferredTone,
        },
      });
      setGeneratedMessage(result.engagementMessage);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Message',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setGeneratedMessage('Failed to generate message. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = volunteerName.trim() && pastContributions.trim() && upcomingEvents.trim();

  return (
    <ProtectedRoute requireAdmin={true} requireVerification={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">AI Engagement Tool</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Engagement Messages</CardTitle>
              <CardDescription>
                Create personalized messages to engage with volunteers and participants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="volunteer-name">Volunteer Name</Label>
                <Input 
                  id="volunteer-name"
                  placeholder="e.g., Jane Doe"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="past-contributions">Past Contributions</Label>
                <Textarea
                  id="past-contributions"
                  placeholder="e.g., Attended 3 cleanup events, collected 15kg of plastic waste."
                  value={pastContributions}
                  onChange={(e) => setPastContributions(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upcoming-events">Upcoming Events</Label>
                <Textarea
                  id="upcoming-events"
                  placeholder="e.g., Upcoming beach cleanup at Sunrise Beach on Saturday."
                  value={upcomingEvents}
                  onChange={(e) => setUpcomingEvents(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred-tone">Tone</Label>
                <Select value={preferredTone} onValueChange={setPreferredTone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select message tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="appreciative">Appreciative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleGenerate} 
                disabled={!canGenerate || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Generate Message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Message</CardTitle>
              <CardDescription>
                Your AI-generated engagement message will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {isGenerating ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-12 w-12 animate-spin mb-4 opacity-50" />
                    <p>Our AI is writing a thoughtful message...</p>
                  </div>
              ) : generatedMessage ? (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{generatedMessage}</pre>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(generatedMessage);
                      toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
                    }}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm">
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Provide volunteer details to generate a message.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
