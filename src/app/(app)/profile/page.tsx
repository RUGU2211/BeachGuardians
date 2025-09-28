'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BadgeDisplay } from '@/components/gamification/BadgeDisplay';
import { Award, Edit3, Gift, Mail, Recycle, ShieldAlert, Star, Trash2, Users, FileText, Loader2, Shield, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCertificateGenerator } from '@/hooks/use-ai-api';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, WasteLog } from '@/lib/types';
import { AdminVerification } from '@/components/profile/AdminVerification';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RealTimeStats } from '@/components/profile/RealTimeStats';

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [certificateForEvent, setCertificateForEvent] = useState<string>('');
  const { loading: isGeneratingCertificate, data: certificateData, callAI: generateCertificate } = useCertificateGenerator();
  
  // Real-time state
  const [liveUserProfile, setLiveUserProfile] = useState<UserProfile | null>(null);
  const [totalWasteLogged, setTotalWasteLogged] = useState(0);
  const [recentWasteLogs, setRecentWasteLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time user profile listener
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as UserProfile;
        setLiveUserProfile(userData);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to user profile:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Real-time waste logs listener
  useEffect(() => {
    if (!user?.uid) return;

    const wasteLogsQuery = query(
      collection(db, 'wasteLogs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(wasteLogsQuery, (querySnapshot) => {
      const logs: WasteLog[] = [];
      let totalWaste = 0;

      querySnapshot.forEach((doc) => {
        const logData = doc.data() as WasteLog;
        logs.push({
          ...logData,
          id: doc.id,
        });
        totalWaste += logData.weightKg;
      });

      setRecentWasteLogs(logs);
      setTotalWasteLogged(totalWaste);
    }, (error) => {
      console.error('Error listening to waste logs:', error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile || !liveUserProfile) {
    return (
        <div className="text-center py-10">
            <p>Could not load profile information. Please try logging in again.</p>
        <Button asChild className="mt-4">
          <Link href="/login" prefetch={false}>Go to Login</Link>
        </Button>
        </div>
    );
  }

  // Use live data instead of static userProfile
  const profile = liveUserProfile;
  const isAdmin = profile.role === 'admin';
  const isVerified = isAdmin ? profile.isAdminVerified : profile.isVerified;

  const eventsAttendedCount = profile.eventsAttended?.length || 0;
  const pointsToNextLevel = 1500; // This could be dynamic based on user's current level
  const currentPoints = profile.points || 0;
  const progressToNextLevel = Math.min((currentPoints / pointsToNextLevel) * 100, 100);

  const handleGenerateCertificate = async (eventName: string, eventDate: string) => {
    setCertificateForEvent(eventName);
    const result = await generateCertificate('generate-certificate', {
      volunteerName: profile.fullName,
      eventName: eventName,
      eventDate: new Date(eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    });
    
    if (result) {
      toast({
        title: "Certificate Text Generated!",
        description: `Text for ${eventName} is ready.`,
      });
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (profile.avatarUrl) return profile.avatarUrl;
    if (user.photoURL) return user.photoURL;
    return undefined;
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-primary/20 to-background p-8 text-center md:flex-row md:justify-start md:space-x-6 md:space-y-0 md:text-left">
          <Avatar className="h-24 w-24 border-4 border-background shadow-md">
            <AvatarImage src={getAvatarUrl()} alt={profile.fullName} />
            <AvatarFallback className="text-3xl">{getInitials(profile.fullName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-headline">{profile.fullName}</CardTitle>
            <CardDescription className="text-primary-foreground/80 flex items-center justify-center md:justify-start">
              <Mail className="mr-2 h-4 w-4" /> {profile.email}
            </CardDescription>
            <div className="flex items-center justify-center md:justify-start pt-1 space-x-2">
              <Star className="mr-1 h-5 w-5 text-accent" />
              <span className="font-semibold text-lg text-accent-foreground/90">{profile.points} Points</span>
              <Badge variant={isAdmin ? (isVerified ? "default" : "secondary") : "outline"}>
                {isAdmin ? (
                  <>
                    <Shield className="w-3 h-3 mr-1" />
                    {isVerified ? 'Verified Admin' : 'Pending Admin'}
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 mr-1" />
                    Volunteer
                  </>
                )}
              </Badge>
            </div>
            {isAdmin && profile.ngoName && (
              <div className="flex items-center justify-center md:justify-start pt-1">
                <Building2 className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">{profile.ngoName}</span>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="md:ml-auto">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {!isVerified && isAdmin && (
            <AdminVerification userProfile={profile} />
          )}

          {/* Real-time Statistics */}
          <RealTimeStats className="mb-6" />
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Level Progress</h3>
            {currentPoints > 0 ? (
              <>
                <Progress value={progressToNextLevel} className="w-full h-3" />
                <p className="text-sm text-muted-foreground mt-1 text-right">{currentPoints} / {pointsToNextLevel} points to next level</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Start participating to earn points and level up!</p>
            )}
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-xl font-semibold mb-3 font-headline">My Achievements</h3>
                <p className="text-sm text-muted-foreground">No achievements earned yet. Participate in events to unlock them!</p>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-xl font-semibold mb-3 font-headline">Contribution History</h3>
            {eventsAttendedCount > 0 ? (
              <p className="text-sm text-muted-foreground">You have attended {eventsAttendedCount} events. Detailed contribution history coming soon!</p>
            ) : (
              <p className="text-sm text-muted-foreground">No events attended yet. Join your first cleanup event to start contributing!</p>
            )}
          </div>

          {isAdmin && (
            <>
           <Separator className="my-6" />
            <div>
                <h3 className="text-xl font-semibold mb-3 font-headline flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  NGO Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.ngoName && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Organization</p>
                      <p className="font-semibold">{profile.ngoName}</p>
                    </div>
                  )}
                  {profile.ngoType && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p className="font-semibold">{profile.ngoType}</p>
                    </div>
                  )}
                  {profile.ngoRegistrationId && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Registration ID</p>
                      <p className="font-mono text-sm">{profile.ngoRegistrationId}</p>
                    </div>
                  )}
                  {profile.ngoWebsite && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Website</p>
                      <a href={profile.ngoWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.ngoWebsite}
                      </a>
                    </div>
                )}
                </div>
                {profile.ngoDescription && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{profile.ngoDescription}</p>
                  </div>
                )}
              </div>
            </>
                )}
        </CardContent>
      </Card>

      {certificateData && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Certificate Text</CardTitle>
            <CardDescription>
              Certificate text for {certificateForEvent}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={certificateData.certificateText}
              readOnly
              className="min-h-[200px]"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              Generated by {certificateData.generatedBy} on {new Date(certificateData.generatedAt).toLocaleString()}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(certificateData.certificateText);
                toast({
                  title: "Copied!",
                  description: "Certificate text copied to clipboard.",
                });
              }}
            >
              Copy to Clipboard
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

