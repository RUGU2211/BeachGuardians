'use client'; // This page now has client-side interactions for potential AI image refresh, keeping it client for now.
// If AI image is fetched on server, this could be a server component, but let's manage state for potential refresh/errors client-side.

import React, { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ImpactChart } from '@/components/dashboard/ImpactChart';
import { Users, Trash2, CalendarCheck2, Award, History, ListChecks, Loader2, ShieldCheck, AlertTriangle, Sparkles, MessageSquareHeart, Calendar, Trophy, Plus, Shield, User, Clock, MapPin, TrendingUp, Activity, Settings, ClipboardList, Leaf, Waves, Recycle, Zap, TreePine } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { WasteCompositionChart } from '@/components/dashboard/WasteCompositionChart';
import { TopEventsChart } from '@/components/dashboard/TopEventsChart';
import { LeaderboardWidget } from '@/components/gamification/LeaderboardWidget';
import { NgoLeaderboardWidget } from '@/components/gamification/NgoLeaderboardWidget';
import EventMapPreview from '@/components/landing/EventMapPreview';
import { collection, query, where, onSnapshot, orderBy, doc, collectionGroup, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event, WasteLog, UserProfile } from '@/lib/types';
import { getEventStatus } from '@/lib/event-filters';

const chartConfig = {
  wasteCollected: { label: 'Waste (kg)', color: 'hsl(var(--chart-1))' },
  volunteers: { label: 'Volunteers', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useAuth();
  
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
  const [userImpactChartData, setUserImpactChartData] = useState<any[]>([]);
  const [wasteCompositionData, setWasteCompositionData] = useState<any[]>([]);
  const [topEventsData, setTopEventsData] = useState<any[]>([]);
  const [recentWasteLogs, setRecentWasteLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [liveUserPoints, setLiveUserPoints] = useState<number>(userProfile?.points || 0);
  const [liveUserBadges, setLiveUserBadges] = useState<number>(userProfile?.badges?.length || 0);
  const [liveUserEventsAttended, setLiveUserEventsAttended] = useState<number>(0);
  const [liveUserWasteKg, setLiveUserWasteKg] = useState<number>(0);
  const [userEnvironmentalImpact, setUserEnvironmentalImpact] = useState({
    co2Saved: 0,
    treesSaved: 0,
    oceanLifeSaved: 0,
    plasticBottlesRecycled: 0,
    landfillSpaceSaved: 0,
    energySaved: 0,
  });

  // Real-time data listeners
  useEffect(() => {
    if (!user?.uid) {
      setLoadingData(false);
      return;
    }

    const unsubscribeFunctions: (() => void)[] = [];
    // Only treat user as admin when verified; avoids admin-only queries for unverified admins
    const isAdmin = ((userProfile?.role || '').toLowerCase() === 'admin') && (userProfile?.isAdminVerified === true);

    // Listen to all events globally (real-time for everyone)
    const eventsQueryGlobal = query(collection(db, 'events'), orderBy('startDate', 'asc'));
    const unsubEventsGlobal = onSnapshot(
      eventsQueryGlobal,
      (querySnapshot) => {
        const eventsData: Event[] = [];
        querySnapshot.forEach((docSnap) => {
          const eventData = docSnap.data() as Event;
          eventsData.push({ ...eventData, id: docSnap.id });
        });
        setEvents(eventsData);
      },
      (error) => {
        console.error('Events listener (global) error:', error);
        setEvents([]);
      },
    );
    unsubscribeFunctions.push(unsubEventsGlobal);

    // Listen to waste logs
    const wasteLogsRef = collection(db, 'wasteLogs');
    // For non-admins, drop orderBy to avoid composite index requirements; sort client-side
    const wasteLogsQuery = isAdmin
      ? query(wasteLogsRef, orderBy('date', 'desc'))
      : query(wasteLogsRef, where('userId', '==', user.uid));
    const wasteLogsUnsubscribe = onSnapshot(wasteLogsQuery, (querySnapshot) => {
      let wasteLogsData: WasteLog[] = [];
      querySnapshot.forEach((doc) => {
        const logData = doc.data() as WasteLog;
        wasteLogsData.push({
          ...logData,
          id: doc.id,
        });
      });
      // Sort client-side by date desc for non-admin query
      wasteLogsData = wasteLogsData.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return db - da;
      });
      setWasteLogs(wasteLogsData);
    }, (error) => {
      console.error('Error listening to waste logs:', error);
      setWasteLogs([]);
    });
    unsubscribeFunctions.push(wasteLogsUnsubscribe);

    // Listen to users (for volunteer count) - only for admins
    if (isAdmin) {
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
      }, (error) => {
        // Silence permission-denied errors to avoid noisy console logs in non-admin contexts
        const code = (error as any)?.code || (error as any)?.name;
        if (code !== 'permission-denied') {
          console.error('Error listening to users:', error);
        }
        setUsers([]);
      });
      unsubscribeFunctions.push(usersUnsubscribe);
    } else {
      setUsers([]);
    }

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid, userProfile?.role, userProfile?.isAdminVerified]);

  // Live user points and badges from user doc
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() as any;
      const points = data?.points ?? 0;
      const badgesCount = Array.isArray(data?.badges) ? data.badges.length : (data?.badgesCount ?? 0);
      const eventsCount = Array.isArray(data?.eventsAttended)
        ? data.eventsAttended.length
        : Number(data?.eventsAttendedCount ?? 0) || 0;
      setLiveUserPoints(points);
      setLiveUserBadges(badgesCount);
      setLiveUserEventsAttended(eventsCount);
    });
    return () => unsub();
  }, [user?.uid]);

  // Removed collectionGroup listener for registrations to avoid permissions errors.
  // We now derive attended events count from the user document (eventsAttended array).

  // Personal waste logs realtime counter (safe for all roles)
  useEffect(() => {
    if (!user?.uid) return;
    // Avoid composite index: only filter by userId, sort/aggregate client-side
    const personalQuery = query(
      collection(db, 'wasteLogs'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(personalQuery, (querySnapshot) => {
      let total = 0;
      querySnapshot.forEach((doc) => {
        const log = doc.data() as WasteLog;
        total += Number(log?.weightKg || 0);
      });
      setLiveUserWasteKg(total);
    }, (error) => {
      console.error('Personal waste logs listener error:', error);
      setLiveUserWasteKg(0);
    });
    return () => unsub();
  }, [user?.uid]);

  // Calculate dashboard stats and chart data when data changes
  useEffect(() => {
    if (events.length > 0 || wasteLogs.length > 0 || users.length > 0) {
      // Calculate total stats (global totals from public events, realtime)
      const totalWaste = events.reduce((sum, evt) => sum + Number(evt.wasteCollectedKg || 0), 0);
      const isAdminRole = (userProfile?.role || '').toLowerCase() === 'admin';
      const volunteerSet = new Set<string>();
      events.forEach((evt) => (evt.volunteers || []).forEach((uid) => volunteerSet.add(uid)));
      const totalVolunteers = isAdminRole ? users.length || volunteerSet.size : volunteerSet.size;
      const totalEventsCount = events.length;
      const upcomingEventsCount = events.filter(event => {
        const status = getEventStatus(event);
        return status === 'upcoming' || status === 'ongoing';
      }).length;

      // Calculate user-specific stats
      // Fallback calculation from event doc volunteers (in case regs query fails)
      const userEventsAttendedFallback = events.filter(event => 
        event.volunteers && event.volunteers.includes(user?.uid || '')
      ).length;
      
      // Compute user waste collected:
      // - Volunteers: sum of their own logs
      // - Admins: own logs + all logs from events they organize (without double-counting)
      const eventsById = new Map<string, Event>();
      events.forEach(evt => eventsById.set(evt.id, evt));
      const adminUid = user?.uid || '';
      const isAdminUser = isAdminRole && (userProfile?.isAdminVerified === true);
      let ownLogsTotal = 0;
      let ownedEventsLogsTotal = 0;
      wasteLogs.forEach((log) => {
        const weight = Number(log.weightKg || 0);
        if (log.loggedBy === adminUid) {
          ownLogsTotal += weight;
        }
        const evt = eventsById.get(log.eventId);
        if (evt && evt.organizerId === adminUid) {
          ownedEventsLogsTotal += weight;
        }
      });
      // Avoid double-counting when admin logs at their own events
      const userWasteCollected = isAdminUser ? (ownedEventsLogsTotal) : ownLogsTotal;
      
      const userPoints = userProfile?.points || 0;
      const userBadges = userProfile?.badges?.length || 0;

      // Calculate user's environmental impact
      // Based on EPA and environmental research data:
      // - 1 kg plastic waste = ~1.7 kg CO2 equivalent saved when recycled/removed
      // - 1 tree absorbs ~22 kg CO2 per year
      // - 1 kg plastic = ~33 plastic bottles (average 30g per bottle)
      // - 1 kg plastic = ~0.001 cubic meters landfill space
      // - 1 kg plastic recycled = ~2.5 kWh energy saved
      // - 1 kg plastic removed from ocean = saves ~10 marine animals (estimated)
      const userWaste = liveUserWasteKg || userWasteCollected;
      const userImpact = {
        co2Saved: Math.round(userWaste * 1.7),
        treesSaved: Math.round((userWaste * 1.7) / 22),
        oceanLifeSaved: Math.round(userWaste * 10),
        plasticBottlesRecycled: Math.round(userWaste * 33),
        landfillSpaceSaved: Math.round(userWaste * 0.001 * 100) / 100,
        energySaved: Math.round(userWaste * 2.5),
      };
      setUserEnvironmentalImpact(userImpact);

      setDashboardStats({
        totalWasteCollected: totalWaste,
        totalVolunteers,
        totalEvents: totalEventsCount,
        upcomingEvents: upcomingEventsCount,
        userEventsAttended: liveUserEventsAttended || userEventsAttendedFallback,
        userWasteCollected: (liveUserWasteKg || userWasteCollected),
        userPoints,
        userBadges,
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
            const status = getEventStatus(event);
            if(status === 'completed' || status === 'ongoing'){
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

      // Generate user-specific impact chart data
      const userChartData = Array.from({ length: A_FEW_MONTHS }).map((_, i) => {
        const targetMonthDate = subMonths(today, i);
        const monthAbbreviation = format(targetMonthDate, 'MMM');
        const year = targetMonthDate.getFullYear();
        const start = startOfMonth(targetMonthDate);
        const end = endOfMonth(targetMonthDate);

        let userWasteThisMonth = 0;
        const adminUidForChart = user?.uid || '';
        const isAdminUserForChart = ((userProfile?.role || '').toLowerCase() === 'admin') && (userProfile?.isAdminVerified === true);
        // Volunteers: only their own logs. Admins: include logs from events they organize.
        wasteLogs.forEach(log => {
          const logDate = parseISO(log.date);
          if (!isWithinInterval(logDate, { start, end })) return;
          if (isAdminUserForChart) {
            const evt = events.find(e => e.id === log.eventId);
            if (evt && evt.organizerId === adminUidForChart) {
              userWasteThisMonth += log.weightKg;
            }
          } else {
            if (log.loggedBy === adminUidForChart) {
              userWasteThisMonth += log.weightKg;
            }
          }
        });

        return {
          name: monthAbbreviation,
          fullName: `${format(targetMonthDate, 'MMMM')} ${year}`,
          wasteCollected: parseFloat(userWasteThisMonth.toFixed(1)),
          volunteers: 1, // Always 1 for user-specific chart
        };
      }).reverse();

      setUserImpactChartData(userChartData);

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

      // Process upcoming events - dynamically calculate status
      const upcomingEventsData = events.filter(event => {
        const status = getEventStatus(event);
        return status === 'upcoming' || status === 'ongoing';
      });
      setUpcomingEvents(upcomingEventsData);

      setLoadingData(false);
    }
  }, [events, wasteLogs, users, user?.uid, userProfile]);

  // Update upcoming events periodically to handle time-based status changes
  useEffect(() => {
    if (events.length === 0) return;

    const updateUpcomingEvents = () => {
      const upcomingEventsData = events.filter(event => {
        const status = getEventStatus(event);
        return status === 'upcoming' || status === 'ongoing';
      });
      setUpcomingEvents(upcomingEventsData);
    };

    // Update immediately
    updateUpcomingEvents();

    // Update every minute to handle events that transition from upcoming to ongoing/completed
    const interval = setInterval(updateUpcomingEvents, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [events]);



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
  const isVerified = isAdmin ? userProfile.isAdminVerified : userProfile.isVerified;

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
            <h1 className="text-3xl font-bold">Welcome, {userProfile.fullName}!</h1>
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

      {/* Stats Overview (User-specific) */}
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
          value={(dashboardStats.userWasteCollected || 0).toFixed(2) + " kg"}
          icon={Trash2}
          description="Your waste collected"
          trend={`${(dashboardStats.userWasteCollected || 0) > 0 ? '+' : ''}${(dashboardStats.userWasteCollected || 0).toFixed(1)}kg total`}
        />
        <StatCard
          title="Points Earned"
          value={liveUserPoints.toString()}
          icon={Award}
          description="Your total points earned"
          trend={`${liveUserPoints > 0 ? '+' : ''}${liveUserPoints} points`}
        />
        <StatCard
          title="Badges Unlocked"
          value={liveUserBadges.toString()}
          icon={Trophy}
          description="Badges you've earned"
          trend={`${liveUserBadges > 0 ? '+' : ''}${liveUserBadges} badges`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Visualizations) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Community Impact Chart */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Community Impact Over Time</span>
              </CardTitle>
              <CardDescription>
                Overall waste collection and volunteer activity across the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImpactChart
                data={monthlyChartData}
                title="Monthly Community Impact"
                description="Waste collection and volunteer participation over time"
                config={chartConfig}
                dataKeys={[
                  { name: 'wasteCollected', colorVar: 'hsl(var(--chart-1))' },
                  { name: 'volunteers', colorVar: 'hsl(var(--chart-2))' },
                ]}
              />
            </CardContent>
          </Card>

          {/* Composition & Top Events */}
          <div className="grid gap-6 md:grid-cols-2">
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

        {/* Right Column (Actions & Info) */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Environmental Impact - Only for volunteers */}
          {!isAdmin && (
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  <span>Your Environmental Impact</span>
                </CardTitle>
                <CardDescription>
                  Environmental benefits from your waste collection efforts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <TreePine className="h-4 w-4 text-green-600" />
                      <p className="text-xs font-medium text-muted-foreground">CO₂ Saved</p>
                    </div>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      {userEnvironmentalImpact.co2Saved.toLocaleString()} kg
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <TreePine className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-medium text-muted-foreground">Trees Saved</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {userEnvironmentalImpact.treesSaved.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Waves className="h-4 w-4 text-cyan-600" />
                      <p className="text-xs font-medium text-muted-foreground">Ocean Life</p>
                    </div>
                    <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                      {userEnvironmentalImpact.oceanLifeSaved.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Recycle className="h-4 w-4 text-purple-600" />
                      <p className="text-xs font-medium text-muted-foreground">Bottles</p>
                    </div>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                      {userEnvironmentalImpact.plasticBottlesRecycled.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Map Preview */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline">Event Map Preview</CardTitle>
              <CardDescription>Live event locations based on your access</CardDescription>
            </CardHeader>
            <CardContent>
              <EventMapPreview events={undefined} compact height={280} />
            </CardContent>
          </Card>
          {/* Quick Actions */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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

          {/* Admin Tools removed as requested */}

          {/* Upcoming Events */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  const formattedDate = (() => {
                    try {
                      if (event.startDate && event.endDate) {
                        const start = parseISO(event.startDate);
                        const end = parseISO(event.endDate);
                        const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
                        const datePart = sameDay
                          ? format(start, 'MMM d, yyyy')
                          : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
                        const timePart = event.startTime && event.endTime ? `, ${event.startTime} – ${event.endTime}` : '';
                        return `${datePart}${timePart}`;
                      }
                      if (event.date) {
                        const d = parseISO(event.date);
                        const datePart = format(d, 'MMM d, yyyy');
                        const timePart = event.time ? `, ${event.time}` : '';
                        return `${datePart}${timePart}`;
                      }
                      return 'Date TBD';
                    } catch {
                      return 'Date TBD';
                    }
                  })();

                  return (
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
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/events/${event.id}`}>View</Link>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Leaderboards (admin only to avoid permission issues) */}
          {isAdmin ? (
            <>
              <LeaderboardWidget maxEntries={5} showViewAll={true} />
              <NgoLeaderboardWidget maxEntries={5} showViewAll={true} sortBy="waste" />
            </>
          ) : (
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="font-headline">Leaderboard & Rewards</CardTitle>
                <CardDescription>Your points and badges are tracked live</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Global leaderboards are visible to admins. Keep participating to climb ranks and earn badges.</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Waste Logs with static avatars */}
      <div className="grid grid-cols-1 mt-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Recent Waste Logs</span>
            </CardTitle>
            <CardDescription>Showing latest 7 logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWasteLogs.slice(0, 7).map((log, i) => {
const staticAvatars = ['/image1.png','/image_1.jpg','/image_2.jpg','/image_3.jpg','/logo.jpg'];
const avatarSrc = staticAvatars[i % staticAvatars.length];
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatarSrc} alt={log.volunteerName} />
                            <AvatarFallback>{log.volunteerInitials}</AvatarFallback>
                          </Avatar>
                          <div className="text-sm font-medium">{log.volunteerName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.eventLink && log.eventLink !== '#' ? (
                          <Link href={log.eventLink} className="text-blue-600 hover:underline text-sm">{log.eventName}</Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">{log.eventName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{log.type}</TableCell>
                      <TableCell className="text-sm">{log.weightKg}</TableCell>
                      <TableCell className="text-sm">{log.logDateFormatted}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Removed duplicate stat cards and secondary impact section to avoid repetition */}
    </div>
  );
}
