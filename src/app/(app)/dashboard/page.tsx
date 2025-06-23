'use client'; // This page now has client-side interactions for potential AI image refresh, keeping it client for now.
// If AI image is fetched on server, this could be a server component, but let's manage state for potential refresh/errors client-side.

import React, { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ImpactChart } from '@/components/dashboard/ImpactChart';
import { Users, Trash2, CalendarCheck2, Award, History, ListChecks, Loader2, ShieldCheck, AlertTriangle, Sparkles, MessageSquareHeart, Calendar, Trophy, Plus, Shield, User, Clock, MapPin, TrendingUp, Activity, Settings } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateHeatmapImage } from '@/ai/flows/generate-heatmap-image-flow';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { WasteCompositionChart } from '@/components/dashboard/WasteCompositionChart';
import { TopEventsChart } from '@/components/dashboard/TopEventsChart';
import { LeaderboardWidget } from '@/components/gamification/LeaderboardWidget';
import { collection, query, getDocs, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event, WasteLog, UserProfile } from '@/lib/types';

const chartConfig = {
  wasteCollected: { label: 'Waste (kg)', color: 'hsl(var(--chart-1))' },
  volunteers: { label: 'Volunteers', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useAuth();
  const [heatmapImageUrl, setHeatmapImageUrl] = useState("https://placehold.co/800x400.png");
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);
  
  // Real-time state
  const [events, setEvents] = useState<Event[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalWasteCollected: 0,
    totalVolunteers: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    userEventsAttended: 0,
    userWasteCollected: 0,
    userPoints: 0,
    userBadges: 0,
  });
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [wasteCompositionData, setWasteCompositionData] = useState<any[]>([]);
  const [topEventsData, setTopEventsData] = useState<any[]>([]);
  const [recentWasteLogs, setRecentWasteLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  // Real-time data listeners
  useEffect(() => {
    if (!user?.uid) {
      setLoadingData(false);
      return;
    }

    const unsubscribeFunctions: (() => void)[] = [];

    // Listen to events
    const eventsQuery = query(collection(db, 'events'), orderBy('date', 'desc'));
    const eventsUnsubscribe = onSnapshot(eventsQuery, (querySnapshot) => {
      const eventsData: Event[] = [];
      querySnapshot.forEach((doc) => {
        const eventData = doc.data() as Event;
        eventsData.push({
          ...eventData,
          id: doc.id,
        });
      });
      setEvents(eventsData);
    });
    unsubscribeFunctions.push(eventsUnsubscribe);

    // Listen to waste logs
    const wasteLogsQuery = query(collection(db, 'wasteLogs'), orderBy('date', 'desc'));
    const wasteLogsUnsubscribe = onSnapshot(wasteLogsQuery, (querySnapshot) => {
      const wasteLogsData: WasteLog[] = [];
      querySnapshot.forEach((doc) => {
        const logData = doc.data() as WasteLog;
        wasteLogsData.push({
          ...logData,
          id: doc.id,
        });
      });
      setWasteLogs(wasteLogsData);
    });
    unsubscribeFunctions.push(wasteLogsUnsubscribe);

    // Listen to users (for volunteer count)
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'volunteer'));
    const usersUnsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile;
        usersData.push({
          ...userData,
          uid: doc.id,
        });
      });
      setUsers(usersData);
    });
    unsubscribeFunctions.push(usersUnsubscribe);

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid]);

  // Calculate dashboard stats and chart data when data changes
  useEffect(() => {
    if (events.length > 0 || wasteLogs.length > 0 || users.length > 0) {
      // Calculate total stats
      const totalWaste = wasteLogs.reduce((sum, log) => sum + log.weightKg, 0);
      const totalVolunteers = users.length;
      const totalEventsCount = events.length;
      const upcomingEventsCount = events.filter(event => 
        event.status === 'upcoming' || event.status === 'ongoing'
      ).length;

      setDashboardStats({
        totalWasteCollected: totalWaste,
        totalVolunteers,
        totalEvents: totalEventsCount,
        upcomingEvents: upcomingEventsCount,
        userEventsAttended: totalEventsCount,
        userWasteCollected: totalWaste,
        userPoints: 0, // Assuming userPoints is not available in the provided data
        userBadges: 0, // Assuming userBadges is not available in the provided data
      });

      // Generate monthly chart data
      const A_FEW_MONTHS = 6;
      const today = new Date();
      const chartData = Array.from({ length: A_FEW_MONTHS }).map((_, i) => {
        const targetMonthDate = subMonths(today, i);
        const monthName = format(targetMonthDate, 'MMMM');
        const monthAbbreviation = format(targetMonthDate, 'MMM');
        const year = targetMonthDate.getFullYear();
        const start = startOfMonth(targetMonthDate);
        const end = endOfMonth(targetMonthDate);

        let wasteCollectedThisMonth = 0;
        const activeVolunteersThisMonth = new Set<string>();

        wasteLogs.forEach(log => {
          const logDate = parseISO(log.date);
          if (isWithinInterval(logDate, { start, end })) {
            wasteCollectedThisMonth += log.weightKg;
            activeVolunteersThisMonth.add(log.loggedBy);
          }
        });

        events.forEach(event => {
          const eventDate = parseISO(event.date);
          if (isWithinInterval(eventDate, { start, end })) {
            if(event.status === 'completed' || event.status === 'ongoing'){
              event.volunteers.forEach(volId => activeVolunteersThisMonth.add(volId));
            }
          }
        });

        return {
          name: monthAbbreviation,
          fullName: `${monthName} ${year}`,
          wasteCollected: parseFloat(wasteCollectedThisMonth.toFixed(1)),
          volunteers: activeVolunteersThisMonth.size,
        };
      }).reverse();

      setMonthlyChartData(chartData);

      // Process waste composition data
      const wasteByType = wasteLogs.reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + log.weightKg;
        return acc;
      }, {} as Record<string, number>);

      const compositionData = Object.entries(wasteByType).map(([name, value]) => ({ name, value }));
      setWasteCompositionData(compositionData);

      // Process top events data
      const wasteByEvent = wasteLogs.reduce((acc, log) => {
        acc[log.eventId] = (acc[log.eventId] || 0) + log.weightKg;
        return acc;
      }, {} as Record<string, number>);

      const eventData = Object.entries(wasteByEvent).map(([eventId, wasteCollected]) => {
        const event = events.find(e => e.id === eventId);
        return {
          name: event?.name || 'Unknown Event',
          wasteCollected: parseFloat(wasteCollected.toFixed(2)),
        };
      });

      const topEvents = eventData.sort((a, b) => b.wasteCollected - a.wasteCollected).slice(0, 5);
      setTopEventsData(topEvents);

      // Process recent waste logs
      const recentLogs = wasteLogs.slice(0, 5).map(log => {
        const event = events.find(e => e.id === log.eventId);
        const volunteer = users.find(u => u.uid === log.loggedBy);
        return {
          ...log,
          eventName: event?.name || 'N/A',
          eventLink: event ? `/events/${event.id}` : '#',
          volunteerName: volunteer?.fullName || 'Unknown Volunteer',
          volunteerAvatar: volunteer?.avatarUrl,
          volunteerInitials: volunteer?.fullName?.split(' ').map(n=>n[0]).join('') || 'UV',
          logDateFormatted: format(parseISO(log.date), 'MMM dd, yyyy')
        };
      });
      setRecentWasteLogs(recentLogs);

      // Process upcoming events
      const upcomingEventsData = events.filter(event => 
        event.status === 'upcoming' || event.status === 'ongoing'
      );
      setUpcomingEvents(upcomingEventsData);

      setLoadingData(false);
    }
  }, [events, wasteLogs, users]);

  const fetchHeatmapImage = React.useCallback(async () => {
    setIsHeatmapLoading(true);
    try {
      const result = await generateHeatmapImage({
        prompt: "A vibrant, abstract heatmap of coastal cleanup volunteer activity. Show hotspots in fiery reds and oranges, with cooler blues and greens representing areas of lower, but still present, engagement. The style should be modern and slightly conceptual."
      });
      setHeatmapImageUrl(result.imageDataUri);
    } catch (error) {
      console.error("Failed to generate heatmap image:", error);
      toast({
        title: "Heatmap Generation Failed",
        description: "Could not generate AI heatmap. Using a default placeholder.",
        variant: "destructive",
      });
      setHeatmapImageUrl("https://placehold.co/800x400.png?text=Heatmap+Error");
    } finally {
      setIsHeatmapLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHeatmapImage();
  }, [fetchHeatmapImage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Please complete your profile setup</p>
              <Button asChild className="mt-4">
                <Link href="/profile">Complete Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = userProfile.role === 'admin';
  const isVerified = userProfile.isVerified;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (userProfile.avatarUrl) return userProfile.avatarUrl;
    if (user.photoURL) return user.photoURL;
    return undefined;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getAvatarUrl()} alt={userProfile.fullName} />
            <AvatarFallback className="text-lg">
              {getInitials(userProfile.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {userProfile.fullName}!</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={isAdmin ? (isVerified ? "default" : "secondary") : "outline"}>
                {isAdmin ? (
                  <>
                    <Shield className="w-3 h-3 mr-1" />
                    {isVerified ? 'Verified Admin' : 'Pending Admin'}
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 mr-1" />
                    Volunteer
                  </>
                )}
              </Badge>
              {isAdmin && !isVerified && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Awaiting Verification
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Events Attended"
          value={dashboardStats.userEventsAttended}
          icon={Calendar}
          description="Events participated"
          trend={`${dashboardStats.userEventsAttended > 0 ? '+' : ''}${dashboardStats.userEventsAttended} total`}
        />
        <StatCard
          title="Waste Collected"
          value={dashboardStats.userWasteCollected.toFixed(2) + " kg"}
          icon={Trash2}
          description="Your waste collected"
          trend={`${dashboardStats.userWasteCollected > 0 ? '+' : ''}${dashboardStats.userWasteCollected.toFixed(1)}kg total`}
        />
        <StatCard
          title="Points Earned"
          value={dashboardStats.userPoints.toString()}
          icon={Award}
          description="Your total points earned"
          trend={`${dashboardStats.userPoints > 0 ? '+' : ''}${dashboardStats.userPoints} points`}
        />
        <StatCard
          title="Badges Unlocked"
          value={dashboardStats.userBadges.toString()}
          icon={Trophy}
          description="Badges you've earned"
          trend={`${dashboardStats.userBadges > 0 ? '+' : ''}${dashboardStats.userBadges} badges`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Visualizations) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Heatmap */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Activity Hotspots (AI Generated)</span>
                </CardTitle>
                <CardDescription>
                  A conceptual visualization of volunteer engagement density.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHeatmapImage} disabled={isHeatmapLoading}>
                {isHeatmapLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Regenerate
              </Button>
            </CardHeader>
            <CardContent>
              {isHeatmapLoading ? (
                <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg animate-pulse">
                  <Loader2 className="h-8 w-8 text-primary/80 animate-spin" />
                </div>
              ) : (
                <Image
                  src={heatmapImageUrl}
                  alt="AI-generated heatmap of volunteer activity"
                  width={1200}
                  height={400}
                  className="rounded-lg object-cover w-full border"
                />
              )}
            </CardContent>
          </Card>

          {/* Impact Chart */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Your Impact Over Time</span>
              </CardTitle>
              <CardDescription>
                Track your waste collection progress and environmental impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImpactChart
                data={monthlyChartData}
                title="Monthly Impact Overview"
                description="Your waste collection and volunteer participation over time"
                config={chartConfig}
                dataKeys={[
                  { name: 'wasteCollected', colorVar: 'hsl(var(--chart-1))' },
                  { name: 'volunteers', colorVar: 'hsl(var(--chart-2))' },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Actions & Info) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Quick Actions */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href="/events">
                  <Calendar className="mr-2 h-4 w-4" />
                  Browse Events
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/waste-logging">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Log Waste
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/leaderboard">
                  <Trophy className="mr-2 h-4 w-4" />
                  View Leaderboard
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Admin Quick Actions */}
          {isAdmin && isVerified && (
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Admin Tools</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin/ai-content">
                    <Activity className="mr-2 h-4 w-4" />
                    AI Content Generator
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin/engagement-tool">
                    <Users className="mr-2 h-4 w-4" />
                    Engagement Tool
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin/user-management">
                    <Shield className="mr-2 h-4 w-4" />
                    User Management
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{event.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/events/${event.id}`}>View</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Leaderboard Widget */}
          <LeaderboardWidget maxEntries={5} showViewAll={true} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Waste Collected" value={dashboardStats.totalWasteCollected.toFixed(2) + " kg"} description="Total waste collected by all volunteers" icon={Trash2} />
        <StatCard title="Events Attended" value={dashboardStats.userEventsAttended} description="Events you've participated in" icon={CalendarCheck2} />
        <StatCard title="Points Earned" value={dashboardStats.userPoints.toString()} description="Your total points earned" icon={Award} />
        <StatCard title="Badges Unlocked" value={dashboardStats.userBadges.toString()} description="Badges you've earned" icon={Trophy} />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Your Impact Over Time</CardTitle>
              <CardDescription>Waste collection (in kg) over the last 7 months.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ImpactChart data={monthlyChartData} />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
               <CardHeader>
                <CardTitle>Waste Composition</CardTitle>
                <CardDescription>Breakdown of collected waste types.</CardDescription>
              </CardHeader>
              <CardContent>
                <WasteCompositionChart data={wasteCompositionData} />
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
               <CardHeader>
                <CardTitle>Top Performing Events</CardTitle>
                <CardDescription>Most waste collected (Top 5).</CardDescription>
              </CardHeader>
              <CardContent className="pr-0">
                <TopEventsChart data={topEventsData} />
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="col-span-12 lg:col-span-3 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            {/* Add any necessary header content here */}
          </CardHeader>
          <CardContent className="relative flex items-center justify-center p-0">
            {isHeatmapLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                {/* Add any necessary loading content here */}
              </div>
            )}
            <Image
              src={heatmapImageUrl}
              alt="AI-generated heatmap of volunteer activity"
              width={1200}
              height={400}
              className="rounded-lg object-cover w-full border"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
