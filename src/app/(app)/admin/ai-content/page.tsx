'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Sparkles, Share2, Copy, RefreshCw, Image, Download } from 'lucide-react';
import { useSocialMediaGenerator, useEventImageGenerator, useCleanupSummarizer, useEngagementMessageGenerator } from '@/hooks/use-ai-api';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIContentPage() {
  // Social Media Post State
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('local residents');
  const [callToAction, setCallToAction] = useState('register now');
  const [desiredTone, setDesiredTone] = useState('friendly');

  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Poster Generation State
  const [posterEventName, setPosterEventName] = useState('');
  const [posterEventDate, setPosterEventDate] = useState('');
  const [posterEventLocation, setPosterEventLocation] = useState('');
  const [posterEventDescription, setPosterEventDescription] = useState('');
  const [posterStyle, setPosterStyle] = useState('modern');
  const [posterColorScheme, setPosterColorScheme] = useState('blue-green');
  const [posterDesignTheme, setPosterDesignTheme] = useState('charity');
  const [posterCallToAction, setPosterCallToAction] = useState('Join us for a beach cleanup event');
  const [posterAdditionalPrompt, setPosterAdditionalPrompt] = useState('');
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState('');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  // Engagement Message State
  const [volunteerName, setVolunteerName] = useState('');
  const [lastParticipationDate, setLastParticipationDate] = useState('');
  const [totalEventsAttended, setTotalEventsAttended] = useState('');
  const [preferredCommunicationStyle, setPreferredCommunicationStyle] = useState('friendly');
  const [engagementMessage, setEngagementMessage] = useState('');
  const [isGeneratingEngagement, setIsGeneratingEngagement] = useState(false);

  // Cleanup Summarizer State
  const [cleanupEventName, setCleanupEventName] = useState('');
  const [cleanupLocation, setCleanupLocation] = useState('');
  const [cleanupDate, setCleanupDate] = useState('');
  const [cleanupVolunteers, setCleanupVolunteers] = useState('');
  const [cleanupWasteKg, setCleanupWasteKg] = useState('');
  const [cleanupTypesOfWaste, setCleanupTypesOfWaste] = useState('');
  const [cleanupNotes, setCleanupNotes] = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [isSummarizingCleanup, setIsSummarizingCleanup] = useState(false);

  // AI hooks calling centralized /api/ai endpoints
  const socialGen = useSocialMediaGenerator();
  const imageGen = useEventImageGenerator();
  const cleanupGen = useCleanupSummarizer();
  const engagementGen = useEngagementMessageGenerator();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent('');
    try {
      const result = await socialGen.callAI('generate-social-media-post', {
        eventName,
        eventDate,
        eventLocation,
        eventDescription,
        targetAudience,
        callToAction,
        desiredTone: desiredTone || 'friendly',
      });
      setGeneratedContent(result?.postContent || '');
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Content',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setGeneratedContent('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEngagement = async () => {
    setIsGeneratingEngagement(true);
    setEngagementMessage('');
    try {
      const result = await engagementGen.callAI('suggest-engagement-message', {
        volunteerName,
        lastParticipationDate,
        totalEventsAttended: Number(totalEventsAttended) || 0,
        preferredCommunicationStyle,
      });
      setEngagementMessage(result?.message || '');
      toast({ title: 'Message Generated!', description: 'Your engagement message is ready.' });
    } catch (error) {
      console.error('Error generating engagement message:', error);
      toast({ title: 'Error Generating Message', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsGeneratingEngagement(false);
    }
  };

  const handleSummarizeCleanup = async () => {
    setIsSummarizingCleanup(true);
    setGeneratedSummary('');
    try {
      const result = await cleanupGen.callAI('summarize-cleanup-event', {
        eventName: cleanupEventName,
        location: cleanupLocation,
        date: cleanupDate,
        totalVolunteers: Number(cleanupVolunteers) || 0,
        totalWasteCollectedKg: Number(cleanupWasteKg) || 0,
        typesOfWasteCollected: cleanupTypesOfWaste,
        notableObservations: cleanupNotes,
      });
      setGeneratedSummary(result?.summary || '');
      toast({ title: 'Summary Generated!', description: 'Cleanup event summary is ready.' });
    } catch (error) {
      console.error('Error summarizing cleanup event:', error);
      toast({ title: 'Error Generating Summary', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSummarizingCleanup(false);
    }
  };

  const handleGeneratePoster = async () => {
    setIsGeneratingPoster(true);
    setGeneratedPosterUrl('');
    try {
      const result = await imageGen.callAI('generate-event-image', {
        eventName: posterEventName,
        eventDate: posterEventDate,
        eventLocation: posterEventLocation,
        eventDescription: posterEventDescription,
        format: posterStyle === 'banner' ? 'banner' : 'poster',
        style: posterStyle,
        colorScheme: posterColorScheme,
        designTheme: posterDesignTheme,
        callToAction: posterCallToAction,
        additionalPrompt: posterAdditionalPrompt,
      });
      
      const imageUrl = result?.imageDataUri || '';
      setGeneratedPosterUrl(imageUrl);

      // Check if it's a placeholder (indicates API key not configured or generation failed)
      if (imageUrl && imageUrl.includes('placehold.co')) {
        toast({
          title: 'Poster Generation Unavailable',
          description: 'Vertex AI credentials not configured. Please configure GOOGLE_APPLICATION_CREDENTIALS in your environment variables to generate posters.',
          variant: 'destructive',
        });
      } else if (imageUrl) {
        toast({
          title: 'Poster Generated!',
          description: 'Your event poster has been created successfully.',
        });
      } else {
        toast({
          title: 'Poster Generation Failed',
          description: 'Failed to generate poster. Please check your Vertex AI credentials and ensure Imagen API is enabled in your Google Cloud project.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error generating poster:', error);
      const errorMessage = error?.message || 'Failed to generate poster. Please try again.';
      toast({
        title: 'Error Generating Poster',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const canGenerate = eventName.trim() && eventDate.trim() && eventLocation.trim() && eventDescription.trim();
  const canGeneratePoster = posterEventName.trim() && posterEventDate.trim() && posterEventLocation.trim() && posterEventDescription.trim();
  const canGenerateEngagement = volunteerName.trim() && preferredCommunicationStyle.trim();
  const canSummarizeCleanup = cleanupEventName.trim() && cleanupLocation.trim() && cleanupDate.trim();

  return (
    <ProtectedRoute requireAdmin={true} requireVerification={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">AI Content Generator</h1>
        </div>
        
        <Tabs defaultValue="social-media" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="social-media">Social Media Posts</TabsTrigger>
            <TabsTrigger value="posters">Event Posters</TabsTrigger>
            <TabsTrigger value="engagement">Engagement Message</TabsTrigger>
            <TabsTrigger value="cleanup">Cleanup Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="social-media" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
      <Card>
        <CardHeader>
                  <CardTitle>Generate a Social Media Post</CardTitle>
          <CardDescription>
                    Use AI to create an engaging social media post for your cleanup event.
          </CardDescription>
        </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-name">Event Name</Label>
                      <Input id="event-name" placeholder="Annual Beach Cleanup" value={eventName} onChange={(e) => setEventName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-date">Event Date</Label>
                      <Input id="event-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-location">Event Location</Label>
                    <Input id="event-location" placeholder="Sunrise Beach" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-description">Event Description</Label>
                    <Textarea id="event-description" placeholder="Describe the event goals, what to bring, etc." value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={3} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target-audience">Target Audience</Label>
                      <Input id="target-audience" placeholder="Families, students" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="call-to-action">Call To Action</Label>
                      <Input id="call-to-action" placeholder="Register now!" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="desired-tone">Tone</Label>
                    <Select value={desiredTone} onValueChange={setDesiredTone}>
                      <SelectTrigger><SelectValue placeholder="Select a tone" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="informative">Informative</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating} className="w-full">
                    {isGenerating ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate Post</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Output Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Post</CardTitle>
                  <CardDescription>
                    Your AI-generated social media post will appear here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGenerating ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Sparkles className="mx-auto h-12 w-12 animate-spin mb-4 opacity-50" />
                        <p>Our AI is crafting the perfect message...</p>
                      </div>
                  ) : generatedContent ? (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-sans">{generatedContent}</pre>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(generatedContent);
                          toast({ title: 'Copied!', description: 'Post copied to clipboard.' });
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Provide event details to generate a post.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Engagement Tool</CardTitle>
                  <CardDescription>
                    Generate an encouraging, personalized message for a volunteer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="volunteer-name">Volunteer Name</Label>
                      <Input id="volunteer-name" placeholder="Alex Johnson" value={volunteerName} onChange={(e) => setVolunteerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-participation">Last Participation Date</Label>
                      <Input id="last-participation" type="date" value={lastParticipationDate} onChange={(e) => setLastParticipationDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="events-attended">Total Events Attended</Label>
                      <Input id="events-attended" type="number" min={0} value={totalEventsAttended} onChange={(e) => setTotalEventsAttended(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comm-style">Preferred Communication Style</Label>
                      <Select value={preferredCommunicationStyle} onValueChange={setPreferredCommunicationStyle}>
                        <SelectTrigger><SelectValue placeholder="Select a style" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="motivational">Motivational</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="concise">Concise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleGenerateEngagement} disabled={!canGenerateEngagement || isGeneratingEngagement} className="w-full">
                    {isGeneratingEngagement ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Generating Message...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate Engagement Message</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Engagement Output Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Message</CardTitle>
                  <CardDescription>
                    Your AI-generated engagement message will appear here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGeneratingEngagement ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="mx-auto h-12 w-12 animate-spin mb-4 opacity-50" />
                      <p>Crafting a thoughtful message...</p>
                    </div>
                  ) : engagementMessage ? (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-sans">{engagementMessage}</pre>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(engagementMessage);
                          toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          const blob = new Blob([engagementMessage], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `engagement-message-${(volunteerName || 'volunteer').replace(/\s+/g, '-').toLowerCase()}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast({ title: 'Downloaded!', description: 'Message downloaded successfully.' });
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Provide volunteer details to generate a message.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cleanup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cleanup Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Cleanup Event Summarizer</CardTitle>
                  <CardDescription>
                    Input cleanup details to generate a concise summary for reports.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-name">Event Name</Label>
                      <Input id="cleanup-name" placeholder="Beach Cleanup" value={cleanupEventName} onChange={(e) => setCleanupEventName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-date">Date</Label>
                      <Input id="cleanup-date" type="date" value={cleanupDate} onChange={(e) => setCleanupDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-location">Location</Label>
                      <Input id="cleanup-location" placeholder="Sunrise Beach" value={cleanupLocation} onChange={(e) => setCleanupLocation(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-volunteers">Total Volunteers</Label>
                      <Input id="cleanup-volunteers" type="number" min={0} value={cleanupVolunteers} onChange={(e) => setCleanupVolunteers(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-waste">Total Waste Collected (kg)</Label>
                      <Input id="cleanup-waste" type="number" min={0} step={0.1} value={cleanupWasteKg} onChange={(e) => setCleanupWasteKg(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-types">Types of Waste Collected</Label>
                      <Input id="cleanup-types" placeholder="Plastic, glass, metal" value={cleanupTypesOfWaste} onChange={(e) => setCleanupTypesOfWaste(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cleanup-notes">Notable Observations</Label>
                    <Textarea id="cleanup-notes" placeholder="E.g., high plastic bottle count, presence of fishing nets, community participation highlights" value={cleanupNotes} onChange={(e) => setCleanupNotes(e.target.value)} rows={3} />
                  </div>

                  <Button onClick={handleSummarizeCleanup} disabled={!canSummarizeCleanup || isSummarizingCleanup} className="w-full">
                    {isSummarizingCleanup ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Generating Summary...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate Cleanup Summary</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Cleanup Output Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Summary</CardTitle>
                  <CardDescription>
                    Your AI-generated cleanup summary will appear here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isSummarizingCleanup ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="mx-auto h-12 w-12 animate-spin mb-4 opacity-50" />
                      <p>Preparing a clear, concise summary...</p>
                    </div>
                  ) : generatedSummary ? (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-sans">{generatedSummary}</pre>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(generatedSummary);
                          toast({ title: 'Copied!', description: 'Summary copied to clipboard.' });
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          const blob = new Blob([generatedSummary], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `cleanup-summary-${(cleanupEventName || 'event').replace(/\s+/g, '-').toLowerCase()}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast({ title: 'Downloaded!', description: 'Summary downloaded successfully.' });
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Provide event details to generate a cleanup summary.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="posters" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Poster Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Generate Event Poster</CardTitle>
                  <CardDescription>
                    Create a stunning poster for your cleanup event using AI.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="poster-event-name">Event Name</Label>
                      <Input id="poster-event-name" placeholder="Annual Beach Cleanup" value={posterEventName} onChange={(e) => setPosterEventName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poster-event-date">Event Date</Label>
                      <Input id="poster-event-date" type="date" value={posterEventDate} onChange={(e) => setPosterEventDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poster-event-location">Event Location</Label>
                    <Input id="poster-event-location" placeholder="Sunrise Beach" value={posterEventLocation} onChange={(e) => setPosterEventLocation(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poster-event-description">Event Description</Label>
                    <Textarea id="poster-event-description" placeholder="Describe the event goals, what to bring, etc." value={posterEventDescription} onChange={(e) => setPosterEventDescription(e.target.value)} rows={3} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poster-call-to-action">Call to Action</Label>
                    <Input id="poster-call-to-action" placeholder="Join us for a beach cleanup event" value={posterCallToAction} onChange={(e) => setPosterCallToAction(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Short message to encourage participation (e.g., "Join us!", "Help make a difference!")</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="poster-style">Poster Style</Label>
                      <Select value={posterStyle} onValueChange={setPosterStyle}>
                        <SelectTrigger><SelectValue placeholder="Select a style" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="vintage">Vintage</SelectItem>
                          <SelectItem value="minimalist">Minimalist</SelectItem>
                          <SelectItem value="colorful">Colorful</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="charity">Charity/NGO Style</SelectItem>
                          <SelectItem value="bold">Bold & Impactful</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="poster-color-scheme">Color Scheme</Label>
                      <Select value={posterColorScheme} onValueChange={setPosterColorScheme}>
                        <SelectTrigger><SelectValue placeholder="Select colors" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blue-green">Blue & Green (Ocean Theme)</SelectItem>
                          <SelectItem value="red-white">Red & White (Bold)</SelectItem>
                          <SelectItem value="teal-yellow">Teal & Yellow (Vibrant)</SelectItem>
                          <SelectItem value="orange-blue">Orange & Blue (Warm)</SelectItem>
                          <SelectItem value="purple-pink">Purple & Pink (Creative)</SelectItem>
                          <SelectItem value="earth-tones">Earth Tones (Natural)</SelectItem>
                          <SelectItem value="gradient">Gradient (Modern)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poster-design-theme">Design Theme</Label>
                    <Select value={posterDesignTheme} onValueChange={setPosterDesignTheme}>
                      <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charity">Charity/NGO (Professional)</SelectItem>
                        <SelectItem value="community">Community Event (Friendly)</SelectItem>
                        <SelectItem value="environmental">Environmental (Nature Focus)</SelectItem>
                        <SelectItem value="action">Action-Oriented (Dynamic)</SelectItem>
                        <SelectItem value="elegant">Elegant (Sophisticated)</SelectItem>
                        <SelectItem value="youth">Youth-Friendly (Energetic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poster-additional-prompt">Additional Design Details (Optional)</Label>
                    <Textarea 
                      id="poster-additional-prompt" 
                      placeholder="E.g., Include images of volunteers, add heart symbols, use geometric shapes, include world map, etc." 
                      value={posterAdditionalPrompt} 
                      onChange={(e) => setPosterAdditionalPrompt(e.target.value)} 
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">Add specific design elements, symbols, or visual elements you want in the poster</p>
                  </div>

                  <Button onClick={handleGeneratePoster} disabled={!canGeneratePoster || isGeneratingPoster} className="w-full">
                    {isGeneratingPoster ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Generating Poster...</>
                    ) : (
                      <><Image className="mr-2 h-4 w-4" />Generate Poster</>
                    )}
              </Button>
        </CardContent>
      </Card>

              {/* Poster Output Section */}
        <Card>
                <CardHeader>
                  <CardTitle>Generated Poster</CardTitle>
                  <CardDescription>
                    Your AI-generated event poster will appear here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGeneratingPoster ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Image className="mx-auto h-12 w-12 animate-spin mb-4 opacity-50" />
                      <p>Our AI is creating your poster...</p>
                    </div>
                  ) : generatedPosterUrl ? (
                    <>
                      <div className="relative">
                        <img 
                          src={generatedPosterUrl} 
                          alt="Generated Event Poster" 
                          className="w-full h-auto rounded-lg border"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedPosterUrl;
                          link.download = `poster-${posterEventName.replace(/\s+/g, '-').toLowerCase()}.png`;
                          link.click();
                          toast({ title: 'Downloaded!', description: 'Poster downloaded successfully.' });
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(generatedPosterUrl);
                          toast({ title: 'Copied!', description: 'Poster URL copied to clipboard.' });
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy URL
            </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Image className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Provide event details to generate a poster.</p>
                    </div>
                  )}
          </CardContent>
        </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>
    </ProtectedRoute>
  );
}
