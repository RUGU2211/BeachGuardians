'use client';

import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { NgoLeaderboardTable } from '@/components/gamification/NgoLeaderboardTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Star, Loader2, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { getRealTimeLeaderboard, getCurrentUserRank, getRealTimeNgoLeaderboard } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { LeaderboardEntry, NgoLeaderboardEntry } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'next/navigation';

export default function LeaderboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'ngo') ? 'ngo' : 'volunteers';
  const currentUserId = userProfile?.uid;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingCertificates, setLoadingCertificates] = useState<Set<string>>(new Set());
  const [ngoLeaderboard, setNgoLeaderboard] = useState<NgoLeaderboardEntry[]>([]);
  const [loadingNgo, setLoadingNgo] = useState(true);
  const [tabValue, setTabValue] = useState<'volunteers' | 'ngo'>(initialTab as 'volunteers' | 'ngo');

  useEffect(() => {
    let unsubscribeVol: (() => void) | undefined;
    let unsubscribeNgo: (() => void) | undefined;

    const setupLeaderboard = async () => {
      try {
        // Calculate current user's rank from real-time leaderboard data
        const calculateUserRank = (leaderboardData: LeaderboardEntry[]) => {
          if (currentUserId) {
            const userIndex = leaderboardData.findIndex(entry => entry.volunteerId === currentUserId);
            if (userIndex !== -1) {
              setUserRank(userIndex + 1);
            } else {
              // If user not in top 50, try to get rank from API
              getCurrentUserRank(currentUserId).then(rank => {
                if (rank) setUserRank(rank);
              }).catch(() => {
                setUserRank(null);
              });
            }
          }
        };

        // Set up real-time volunteer leaderboard listener
        unsubscribeVol = await getRealTimeLeaderboard((data) => {
          setLeaderboard(data);
          setLoading(false);
          calculateUserRank(data);
        });

        // Set up NGO leaderboard listener
        unsubscribeNgo = await getRealTimeNgoLeaderboard((data) => {
          setNgoLeaderboard(data);
          setLoadingNgo(false);
        });
      } catch (error) {
        console.error('Error setting up leaderboard:', error);
        setLoading(false);
        setLoadingNgo(false);
      }
    };

    setupLeaderboard();

    // Cleanup function
    return () => {
      if (unsubscribeVol) unsubscribeVol();
      if (unsubscribeNgo) unsubscribeNgo();
    };
  }, [currentUserId]);

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-yellow-700';
    return 'text-muted-foreground';
  };

  const handleCertificateApplication = async (entry: LeaderboardEntry) => {
    if (loadingCertificates.has(entry.volunteerId)) return;

    setLoadingCertificates(prev => new Set(prev).add(entry.volunteerId));

    try {
      const response = await fetch('/api/certificate/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            email: entry.email || '',
            fullName: entry.name,
            points: entry.points,
            uid: entry.volunteerId,
            volunteerId: entry.volunteerId,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Certificate Sent!",
          description: `Your certificate has been sent to ${entry.email || 'your email'}.`,
        });
      } else {
        throw new Error(result.error || 'Failed to send certificate');
      }
    } catch (error) {
      console.error('Error applying for certificate:', error);
      toast({
        title: "Certificate Error",
        description: error instanceof Error ? error.message : "Failed to send certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCertificates(prev => {
        const newSet = new Set(prev);
        newSet.delete(entry.volunteerId);
        return newSet;
      });
    }
  };

  if (loading && loadingNgo) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <Trophy className="mx-auto h-16 w-16 text-yellow-400" />
        <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          Community Leaderboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See who's leading the charge in our cleanup efforts! Points are awarded for participation and waste collection.
        </p>
        {tabValue === 'volunteers' && userRank && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 inline-block">
            <p className="text-sm text-blue-800">
              <strong>Your Rank:</strong> #{userRank} of {leaderboard.length} volunteers
            </p>
          </div>
        )}
      </div>
      <Tabs value={tabValue} onValueChange={(v) => setTabValue(v as 'volunteers' | 'ngo')}>
        <div className="flex items-center justify-center">
          <TabsList>
            <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            <TabsTrigger value="ngo">NGOs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="volunteers">
      {/* Top 3 Podium - Volunteers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        {/* 2nd Place */}
        <div className="order-2 md:order-1 text-center">
          {topThree[1] && (
            <Card className="p-6 relative border-2 border-gray-300 shadow-lg bg-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-400 text-white rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl">2</div>
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-gray-400">
                <AvatarImage src={topThree[1].avatarUrl} alt={topThree[1].name} />
                <AvatarFallback>{topThree[1].name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{topThree[1].name}</h3>
              <p className="text-2xl font-bold text-gray-600">{topThree[1].points.toLocaleString()} pts</p>
              {topThree[1].volunteerId === currentUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCertificateApplication(topThree[1])}
                  disabled={loadingCertificates.has(topThree[1].volunteerId) || !topThree[1].email}
                  className="mt-3 w-full"
                >
                  {loadingCertificates.has(topThree[1].volunteerId) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  {loadingCertificates.has(topThree[1].volunteerId) ? 'Sending...' : 'Get Certificate'}
                </Button>
              )}
            </Card>
          )}
        </div>
        {/* 1st Place */}
        <div className="order-1 md:order-2 text-center">
          {topThree[0] && (
            <Card className="p-8 relative border-4 border-yellow-400 shadow-xl bg-white scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-white rounded-full h-16 w-16 flex items-center justify-center font-bold text-2xl">1</div>
              <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-yellow-500">
                <AvatarImage src={topThree[0].avatarUrl} alt={topThree[0].name} />
                <AvatarFallback>{topThree[0].name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-2xl font-bold">{topThree[0].name}</h3>
              <p className="text-3xl font-bold text-yellow-500">{topThree[0].points.toLocaleString()} pts</p>
              {topThree[0].volunteerId === currentUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCertificateApplication(topThree[0])}
                  disabled={loadingCertificates.has(topThree[0].volunteerId) || !topThree[0].email}
                  className="mt-3 w-full"
                >
                  {loadingCertificates.has(topThree[0].volunteerId) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  {loadingCertificates.has(topThree[0].volunteerId) ? 'Sending...' : 'Get Certificate'}
                </Button>
              )}
            </Card>
          )}
        </div>
        {/* 3rd Place */}
        <div className="order-3 md:order-3 text-center">
          {topThree[2] && (
            <Card className="p-6 relative border-2 border-yellow-600 shadow-md bg-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-700 text-white rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl">3</div>
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-yellow-700">
                <AvatarImage src={topThree[2].avatarUrl} alt={topThree[2].name} />
                <AvatarFallback>{topThree[2].name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{topThree[2].name}</h3>
              <p className="text-2xl font-bold text-yellow-800">{topThree[2].points.toLocaleString()} pts</p>
              {topThree[2].volunteerId === currentUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCertificateApplication(topThree[2])}
                  disabled={loadingCertificates.has(topThree[2].volunteerId) || !topThree[2].email}
                  className="mt-3 w-full"
                >
                  {loadingCertificates.has(topThree[2].volunteerId) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  {loadingCertificates.has(topThree[2].volunteerId) ? 'Sending...' : 'Get Certificate'}
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
          <CardDescription>
            The complete list of all our dedicated BeachGuardians. Updates in real-time!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restOfLeaderboard.length > 0 ? (
            <LeaderboardTable entries={restOfLeaderboard} currentUserVolId={currentUserId} startRank={4} />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No volunteers found. Be the first to join and start earning points!
            </p>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      {/* NGOs Tab */}
      <TabsContent value="ngo">
        {/* NGO Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Top NGOs by Waste</CardTitle>
            <CardDescription>
              Ranked by total kilograms of waste collected across organized events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ngoLeaderboard.length > 0 ? (
              <NgoLeaderboardTable entries={ngoLeaderboard} sortBy="waste" />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No NGO contributions found yet. Organize events and log waste to appear here.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top NGOs by Events</CardTitle>
            <CardDescription>
              Ranked by number of events organized.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ngoLeaderboard.length > 0 ? (
              <NgoLeaderboardTable entries={ngoLeaderboard} sortBy="events" />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No NGO events found yet. Create events to appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {/* How Points Work Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2 h-5 w-5 text-yellow-500"/>
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Climb the leaderboard and earn badges by actively participating in our community:</p>
            <ul className="list-none space-y-2">
                <li className="flex items-start"><Trophy className="mr-3 mt-1 h-4 w-4 text-green-500 flex-shrink-0"/><span><strong>Event Participation:</strong> Earn 50 points for each event you attend and check-in.</span></li>
                <li className="flex items-start"><Award className="mr-3 mt-1 h-4 w-4 text-blue-500 flex-shrink-0"/><span><strong>Waste Logging:</strong> Earn 10 points for every kilogram of waste you log.</span></li>
                <li className="flex items-start"><Star className="mr-3 mt-1 h-4 w-4 text-yellow-500 flex-shrink-0"/><span><strong>Achievements:</strong> Unlock special badges and bonus points for reaching milestones.</span></li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
