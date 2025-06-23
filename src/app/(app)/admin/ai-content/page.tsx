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
import { runFlow } from '@genkit-ai/next/client';
import { generateSocialMediaPostFlow } from '@/ai/flows/generate-social-media-post';
import { generateHeroImage } from '@/ai/flows/generate-hero-image-flow';
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
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState('');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent('');
    try {
      const result = await runFlow<typeof generateSocialMediaPostFlow>({
        url: '/api/social-media-post',
        input: {
          eventName,
          eventDate,
          eventLocation,
          eventDescription,
          targetAudience,
          callToAction,
          desiredTone,
        },
      });
      setGeneratedContent(result.socialMediaPost);
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

  const handleGeneratePoster = async () => {
    setIsGeneratingPoster(true);
    setGeneratedPosterUrl('');
    try {
      const result = await generateHeroImage({
        eventName: posterEventName,
        eventDescription: posterEventDescription,
        style: posterStyle,
      });
      
      // Use a placeholder URL for the generated image
      setGeneratedPosterUrl('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop');
      
      toast({
        title: 'Poster Generated!',
        description: 'Your event poster has been created successfully.',
      });
    } catch (error) {
      console.error('Error generating poster:', error);
      toast({
        title: 'Error Generating Poster',
        description: 'Failed to generate poster. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const canGenerate = eventName.trim() && eventDate.trim() && eventLocation.trim() && eventDescription.trim();
  const canGeneratePoster = posterEventName.trim() && posterEventDate.trim() && posterEventLocation.trim() && posterEventDescription.trim();

  return (
    <ProtectedRoute requireAdmin={true} requireVerification={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">AI Content Generator</h1>
        </div>
        
        <Tabs defaultValue="social-media" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="social-media">Social Media Posts</TabsTrigger>
            <TabsTrigger value="posters">Event Posters</TabsTrigger>
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
                    <Label htmlFor="poster-style">Poster Style</Label>
                    <Select value={posterStyle} onValueChange={setPosterStyle}>
                      <SelectTrigger><SelectValue placeholder="Select a style" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="vintage">Vintage</SelectItem>
                        <SelectItem value="minimalist">Minimalist</SelectItem>
                        <SelectItem value="colorful">Colorful</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        </SelectContent>
                      </Select>
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
                          link.download = `poster-${posterEventName.replace(/\s+/g, '-').toLowerCase()}.jpg`;
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
