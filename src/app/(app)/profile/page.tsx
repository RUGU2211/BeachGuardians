
'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { mockVolunteers, getVolunteerById } from '@/lib/mockData'; 
import { BadgeDisplay } from '@/components/gamification/BadgeDisplay';
import { Award, Edit3, Gift, Mail, Recycle, ShieldAlert, Star, Trash2, Users, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Contribution, Volunteer } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateCertificateText } from '@/ai/flows/generate-certificate-text-flow';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const [displayUser, setDisplayUser] = useState<Volunteer | null>(null);
  
  const [generatedCertificateText, setGeneratedCertificateText] = useState<string | null>(null);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [certificateForEvent, setCertificateForEvent] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      const mockProfile = mockVolunteers.find(v => v.email === currentUser.email);
      if (mockProfile) {
        setDisplayUser(mockProfile);
      } else {
        // Create a basic profile for new users not in mockData
        setDisplayUser({
          id: currentUser.uid,
          name: currentUser.displayName || currentUser.email || 'New User',
          email: currentUser.email || '',
          avatarUrl: currentUser.photoURL || `https://placehold.co/100x100.png?text=${(currentUser.displayName || currentUser.email || 'U').charAt(0)}`,
          points: 0,
          contributions: [],
          achievements: [],
        });
      }
    } else if (!authLoading) {
      // If not loading and no current user, clear displayUser (e.g., after logout)
      setDisplayUser(null);
    }
  }, [currentUser, authLoading]);

  if (authLoading || (currentUser && !displayUser)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!displayUser) {
     // This case might be hit if user logs out or somehow currentUser becomes null after initial load.
     // Or if there's an issue setting the displayUser
    return (
        <div className="text-center py-10">
            <p>Could not load profile information. Please try logging in again.</p>
            <Button asChild className="mt-4"><Link href="/login">Go to Login</Link></Button>
        </div>
    );
  }

  const totalWasteLogged = displayUser.contributions.reduce((total, contribution) => {
    return total + contribution.wasteLogged.reduce((sum, log) => sum + log.weightKg, 0);
  }, 0);

  const eventsAttendedCount = displayUser.contributions.length;
  const pointsToNextLevel = 1500; // This could be dynamic based on user's current level
  const progressToNextLevel = Math.min((displayUser.points / pointsToNextLevel) * 100, 100);

  const latestContribution = displayUser.contributions.length > 0 
    ? [...displayUser.contributions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
    : null;

  const handleGenerateCertificate = async (contribution: Contribution) => {
    if (!displayUser) return;
    setIsGeneratingCertificate(true);
    setGeneratedCertificateText(null);
    setCertificateForEvent(contribution.eventName);
    try {
      const result = await generateCertificateText({
        volunteerName: displayUser.name,
        eventName: contribution.eventName,
        eventDate: new Date(contribution.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
      setGeneratedCertificateText(result.certificateText);
      toast({
        title: "Certificate Text Generated!",
        description: `Text for ${contribution.eventName} is ready.`,
      });
    } catch (error) {
      console.error("Error generating certificate text:", error);
      toast({
        title: "Error",
        description: "Failed to generate certificate text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCertificate(false);
    }
  };
  
  const userInitials = displayUser.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-primary/20 to-background p-8 text-center md:flex-row md:justify-start md:space-x-6 md:space-y-0 md:text-left">
          <Avatar className="h-24 w-24 border-4 border-background shadow-md">
            <AvatarImage src={displayUser.avatarUrl} alt={displayUser.name} data-ai-hint="person avatar" />
            <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-headline">{displayUser.name}</CardTitle>
            <CardDescription className="text-primary-foreground/80 flex items-center justify-center md:justify-start">
              <Mail className="mr-2 h-4 w-4" /> {displayUser.email}
            </CardDescription>
            <div className="flex items-center justify-center md:justify-start pt-1">
              <Star className="mr-1 h-5 w-5 text-accent" />
              <span className="font-semibold text-lg text-accent-foreground/90">{displayUser.points} Points</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="md:ml-auto">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Recycle className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalWasteLogged.toFixed(1)} kg</p>
              <p className="text-sm text-muted-foreground">Waste Collected</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{eventsAttendedCount}</p>
              <p className="text-sm text-muted-foreground">Events Attended</p>
            </div>
             <div className="p-4 bg-muted/50 rounded-lg">
              <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{displayUser.achievements.length}</p>
              <p className="text-sm text-muted-foreground">Badges Earned</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Level Progress</h3>
            {displayUser.points > 0 ? (
              <>
                <Progress value={progressToNextLevel} className="w-full h-3" />
                <p className="text-sm text-muted-foreground mt-1 text-right">{displayUser.points} / {pointsToNextLevel} points to next level</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Start participating to earn points and level up!</p>
            )}
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-xl font-semibold mb-3 font-headline">My Achievements</h3>
            {displayUser.achievements.length > 0 ? (
                <BadgeDisplay achievements={displayUser.achievements} size="md" />
            ) : (
                <p className="text-sm text-muted-foreground">No achievements earned yet. Participate in events to unlock them!</p>
            )}
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-xl font-semibold mb-3 font-headline">Contribution History</h3>
            {displayUser.contributions.length > 0 ? (
              <ul className="space-y-4">
                {displayUser.contributions.slice(0,3).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((contrib) => (
                  <li key={contrib.eventId} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-center">
                        <div>
                            <Link href={`/events/${contrib.eventId}`} className="font-medium text-primary hover:underline">
                                {contrib.eventName}
                            </Link>
                            <p className="text-sm text-muted-foreground">{new Date(contrib.date).toLocaleDateString()}</p>
                        </div>
                         <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleGenerateCertificate(contrib)} 
                            disabled={isGeneratingCertificate && certificateForEvent === contrib.eventName}
                        >
                            {isGeneratingCertificate && certificateForEvent === contrib.eventName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Generate Certificate Text
                        </Button>
                    </div>
                    {contrib.wasteLogged.length > 0 && (
                      <ul className="mt-2 text-sm list-disc list-inside pl-2 text-muted-foreground">
                        {contrib.wasteLogged.map(log => (
                          <li key={log.id}>{log.weightKg}kg of {log.type}</li>
                        ))}
                      </ul>
                    )}
                    {contrib.wasteLogged.length === 0 && (
                        <p className="mt-2 text-sm text-muted-foreground italic">No waste logged for this event contribution.</p>
                    )}
                  </li>
                ))}
                 {displayUser.contributions.length > 3 && (
                    <p className="text-sm text-muted-foreground mt-2">View all contributions on your activity page (coming soon).</p>
                 )}
              </ul>
            ) : (
              <p className="text-muted-foreground">No contributions logged yet. Join an event and log your waste!</p>
            )}
          </div>
           <Separator className="my-6" />
            <div>
                <h3 className="text-xl font-semibold mb-3 font-headline">Digital Certificates</h3>
                <p className="text-muted-foreground mb-2">Generate commemorative text for your event participation.</p>
                {displayUser.contributions.length === 0 && !generatedCertificateText && !isGeneratingCertificate && (
                     <div className="p-4 border rounded-lg bg-muted/30 text-center">
                        <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                           Participate in an event to be eligible for a certificate.
                        </p>
                    </div>
                )}
                 {isGeneratingCertificate && (
                  <div className="p-4 border rounded-lg bg-muted/30 text-center">
                    <Loader2 className="h-10 w-10 text-primary mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-muted-foreground">Generating certificate text for {certificateForEvent}...</p>
                  </div>
                )}
                {generatedCertificateText && certificateForEvent && (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Certificate for {certificateForEvent}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea value={generatedCertificateText} readOnly rows={10} className="bg-muted/50 whitespace-pre-wrap" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

