'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  FileText, 
  Image, 
  MessageSquare, 
  BarChart3, 
  MessageCircle,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useCertificateGenerator,
  useEventImageGenerator,
  useSocialMediaGenerator,
  useCleanupSummarizer,
  useEngagementMessageGenerator
} from '@/hooks/use-ai-api';

interface AIFeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isVerified: boolean;
  children: React.ReactNode;
}

function AIFeatureCard({ title, description, icon, isVerified, children }: AIFeatureCardProps) {
  return (
    <Card className={`relative ${!isVerified ? 'opacity-75' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant={isVerified ? "default" : "destructive"}>
            {isVerified ? (
              <>
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Requires Verification
              </>
            )}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!isVerified && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-800 text-sm">
              <Shield className="w-4 h-4 mr-2" />
              Admin verification required to access this AI feature
            </div>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function AIFeaturesDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // AI Hooks
  const certificateGen = useCertificateGenerator();
  const imageGen = useEventImageGenerator();
  const socialGen = useSocialMediaGenerator();
  const summaryGen = useCleanupSummarizer();
  const engagementGen = useEngagementMessageGenerator();

  // Form states
  const [certificateForm, setCertificateForm] = useState({
    volunteerName: 'John Doe',
    eventName: 'Beach Cleanup 2024',
    eventDate: '2024-01-15'
  });

  const [imageForm, setImageForm] = useState({
    eventName: 'Beach Cleanup 2024',
    location: 'Santa Monica Beach',
    date: '2024-01-15',
    theme: 'ocean conservation'
  });

  const [socialForm, setSocialForm] = useState({
    eventName: 'Beach Cleanup 2024',
    eventDate: '2024-01-15',
    eventLocation: 'Santa Monica Beach',
    eventDescription: 'Join us for a community beach cleanup to protect marine life and keep our shores beautiful.',
    targetAudience: 'local residents and families',
    callToAction: 'Register now and bring a friend!',
    desiredTone: 'friendly' as const,
  });

  const [summaryForm, setSummaryForm] = useState({
    eventName: 'Beach Cleanup 2024',
    location: 'Santa Monica Beach',
    date: '2024-01-15',
    totalVolunteers: 50,
    totalWasteCollectedKg: 25.5,
    typesOfWasteCollected: 'Plastic bottles, food wrappers, cigarette butts',
    notableObservations: 'High concentration of microplastics near the waterline'
  });

  const [engagementForm, setEngagementForm] = useState({
    volunteerName: 'Sarah Johnson',
    lastParticipationDate: '2023-12-01',
    totalEventsAttended: 8,
    preferredCommunicationStyle: 'friendly' as const
  });

  const isVerified = userProfile?.role === 'admin' && userProfile?.isAdminVerified;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">AI Features Dashboard</h1>
        <Badge variant={isVerified ? "default" : "destructive"}>
          {isVerified ? "Admin Verified" : "Verification Required"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificate Generator */}
        <AIFeatureCard
          title="Certificate Generator"
          description="Generate personalized certificates for volunteers"
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          isVerified={isVerified}
        >
          <div className="space-y-3">
            <Input
              placeholder="Volunteer Name"
              value={certificateForm.volunteerName}
              onChange={(e) => setCertificateForm(prev => ({ ...prev, volunteerName: e.target.value }))}
            />
            <Input
              placeholder="Event Name"
              value={certificateForm.eventName}
              onChange={(e) => setCertificateForm(prev => ({ ...prev, eventName: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="Event Date"
              value={certificateForm.eventDate}
              onChange={(e) => setCertificateForm(prev => ({ ...prev, eventDate: e.target.value }))}
            />
            <Button
              onClick={() => certificateGen.callAI('generate-certificate', certificateForm)}
              disabled={certificateGen.loading || !isVerified}
              className="w-full"
            >
              {certificateGen.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Certificate
            </Button>
            {certificateGen.data && (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={certificateGen.data.certificateText}
                  readOnly
                  rows={4}
                  className="bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(certificateGen.data!.certificateText, 'Certificate text')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        </AIFeatureCard>

        {/* Event Image Generator */}
        <AIFeatureCard
          title="Event Image Generator"
          description="Create promotional images for events"
          icon={<Image className="w-5 h-5 text-green-600" />}
          isVerified={isVerified}
        >
          <div className="space-y-3">
            <Input
              placeholder="Event Name"
              value={imageForm.eventName}
              onChange={(e) => setImageForm(prev => ({ ...prev, eventName: e.target.value }))}
            />
            <Input
              placeholder="Location"
              value={imageForm.location}
              onChange={(e) => setImageForm(prev => ({ ...prev, location: e.target.value }))}
            />
            <Input
              type="date"
              value={imageForm.date}
              onChange={(e) => setImageForm(prev => ({ ...prev, date: e.target.value }))}
            />
            <Input
              placeholder="Theme"
              value={imageForm.theme}
              onChange={(e) => setImageForm(prev => ({ ...prev, theme: e.target.value }))}
            />
            <Button
              onClick={() => imageGen.callAI('generate-event-image', imageForm)}
              disabled={imageGen.loading || !isVerified}
              className="w-full"
            >
              {imageGen.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Image
            </Button>
            {imageGen.data && (
              <div className="mt-4 space-y-2">
                <img
                  src={imageGen.data.imageDataUri}
                  alt="Generated event image"
                  className="w-full rounded-lg border"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = imageGen.data!.imageDataUri;
                      link.download = `event-image.png`;
                      link.click();
                    }}
                  >
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(imageGen.data!.imageDataUri)}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            )}
          </div>
        </AIFeatureCard>

        {/* Social Media Generator */}
        <AIFeatureCard
          title="Social Media Generator"
          description="Create engaging social media posts"
          icon={<MessageSquare className="w-5 h-5 text-purple-600" />}
          isVerified={isVerified}
        >
          <div className="space-y-3">
            <Input
              placeholder="Event Name"
              value={socialForm.eventName}
              onChange={(e) => setSocialForm(prev => ({ ...prev, eventName: e.target.value }))}
            />
            <Input
              type="date"
              value={socialForm.eventDate}
              onChange={(e) => setSocialForm(prev => ({ ...prev, eventDate: e.target.value }))}
            />
            <Input
              placeholder="Event Location"
              value={socialForm.eventLocation}
              onChange={(e) => setSocialForm(prev => ({ ...prev, eventLocation: e.target.value }))}
            />
            <Textarea
              placeholder="Event Description"
              value={socialForm.eventDescription}
              onChange={(e) => setSocialForm(prev => ({ ...prev, eventDescription: e.target.value }))}
              rows={3}
            />
            <Input
              placeholder="Target Audience"
              value={socialForm.targetAudience}
              onChange={(e) => setSocialForm(prev => ({ ...prev, targetAudience: e.target.value }))}
            />
            <Input
              placeholder="Call to Action"
              value={socialForm.callToAction}
              onChange={(e) => setSocialForm(prev => ({ ...prev, callToAction: e.target.value }))}
            />
            <Select value={socialForm.desiredTone} onValueChange={(value: any) => setSocialForm(prev => ({ ...prev, desiredTone: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="inspiring">Inspiring</SelectItem>
                <SelectItem value="celebratory">Celebratory</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => socialGen.callAI('generate-social-media-post', socialForm)}
              disabled={socialGen.loading || !isVerified}
              className="w-full"
            >
              {socialGen.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Post
            </Button>
            {socialGen.data && (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={socialGen.data.postContent}
                  readOnly
                  rows={4}
                  className="bg-muted/50"
                />
                <div className="flex flex-wrap gap-1">
                  {socialGen.data.hashtags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(socialGen.data!.postContent, 'Social media post')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        </AIFeatureCard>

        {/* Cleanup Summarizer */}
        <AIFeatureCard
          title="Cleanup Summarizer"
          description="Generate comprehensive event summaries"
          icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
          isVerified={isVerified}
        >
          <div className="space-y-3">
            <Input
              placeholder="Event Name"
              value={summaryForm.eventName}
              onChange={(e) => setSummaryForm(prev => ({ ...prev, eventName: e.target.value }))}
            />
            <Input
              placeholder="Location"
              value={summaryForm.location}
              onChange={(e) => setSummaryForm(prev => ({ ...prev, location: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Volunteers"
                value={summaryForm.totalVolunteers}
                onChange={(e) => setSummaryForm(prev => ({ ...prev, totalVolunteers: Number(e.target.value) }))}
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Waste (kg)"
                value={summaryForm.totalWasteCollectedKg}
                onChange={(e) => setSummaryForm(prev => ({ ...prev, totalWasteCollectedKg: Number(e.target.value) }))}
              />
            </div>
            <Input
              placeholder="Types of waste"
              value={summaryForm.typesOfWasteCollected}
              onChange={(e) => setSummaryForm(prev => ({ ...prev, typesOfWasteCollected: e.target.value }))}
            />
            <Textarea
              placeholder="Notable observations"
              value={summaryForm.notableObservations}
              onChange={(e) => setSummaryForm(prev => ({ ...prev, notableObservations: e.target.value }))}
              rows={2}
            />
            <Button
              onClick={() => summaryGen.callAI('summarize-cleanup-event', summaryForm)}
              disabled={summaryGen.loading || !isVerified}
              className="w-full"
            >
              {summaryGen.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Summary
            </Button>
            {summaryGen.data && (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={summaryGen.data.summary}
                  readOnly
                  rows={4}
                  className="bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(summaryGen.data!.summary, 'Event summary')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        </AIFeatureCard>

        {/* Engagement Message Generator */}
        <AIFeatureCard
          title="Engagement Messages"
          description="Create personalized volunteer engagement messages"
          icon={<MessageCircle className="w-5 h-5 text-pink-600" />}
          isVerified={isVerified}
        >
          <div className="space-y-3">
            <Input
              placeholder="Volunteer Name"
              value={engagementForm.volunteerName}
              onChange={(e) => setEngagementForm(prev => ({ ...prev, volunteerName: e.target.value }))}
            />
            <Input
              type="date"
              value={engagementForm.lastParticipationDate}
              onChange={(e) => setEngagementForm(prev => ({ ...prev, lastParticipationDate: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Events Attended"
              value={engagementForm.totalEventsAttended}
              onChange={(e) => setEngagementForm(prev => ({ ...prev, totalEventsAttended: Number(e.target.value) }))}
            />
            <Select 
              value={engagementForm.preferredCommunicationStyle} 
              onValueChange={(value: any) => setEngagementForm(prev => ({ ...prev, preferredCommunicationStyle: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="motivational">Motivational</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => engagementGen.callAI('suggest-engagement-message', engagementForm)}
              disabled={engagementGen.loading || !isVerified}
              className="w-full"
            >
              {engagementGen.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Message
            </Button>
            {engagementGen.data && (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={engagementGen.data.message}
                  readOnly
                  rows={4}
                  className="bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(engagementGen.data!.message, 'Engagement message')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        </AIFeatureCard>
      </div>

      {!isVerified && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Admin Verification Required</h3>
                <p className="text-sm text-yellow-700">
                  Complete your admin verification to access all AI features. Visit your profile to start the verification process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}