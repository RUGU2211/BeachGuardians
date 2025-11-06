'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Map, Download, Loader2, Users, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Event, UserProfile, WasteLog } from '@/lib/types';
import { parseISO, format } from 'date-fns';

interface TopVolunteer extends UserProfile {
  totalWasteContributed?: number;
  eventsCount?: number;
}

interface AnalyticsData {
  totalEvents: number;
  totalVolunteers: number;
  totalWasteCollected: number;
  activeVolunteers: number;
  upcomingEvents: number;
  completedEvents: number;
  wasteByMonth: { month: string; amount: number }[];
  topVolunteers: TopVolunteer[];
}

export default function ImpactAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();

  // Use refs to store data that all listeners can access
  const eventsRef = useRef<Event[]>([]);
  const usersRef = useRef<UserProfile[]>([]);
  const wasteLogsRef = useRef<WasteLog[]>([]);

  useEffect(() => {
    let eventsUnsubscribe: (() => void) | null = null;
    let usersUnsubscribe: (() => void) | null = null;
    let wasteLogsUnsubscribe: (() => void) | null = null;

    // Only setup real-time listeners for verified admin users
    if (!authLoading && userProfile?.role === 'admin' && userProfile?.isAdminVerified) {
      // Real-time listener for events
      eventsUnsubscribe = onSnapshot(
        collection(db, 'events'),
        (snapshot) => {
          eventsRef.current = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Event[];
          calculateAndUpdateAnalytics(eventsRef.current, usersRef.current, wasteLogsRef.current);
        },
        (error) => {
          console.error('Error listening to events:', error);
          toast({
            title: 'Error',
            description: 'Failed to load events data.',
            variant: 'destructive',
          });
          setLoading(false);
        }
      );

      // Real-time listener for users
      usersUnsubscribe = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          usersRef.current = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
          })) as UserProfile[];
          calculateAndUpdateAnalytics(eventsRef.current, usersRef.current, wasteLogsRef.current);
        },
        (error) => {
          console.error('Error listening to users:', error);
          toast({
            title: 'Error',
            description: 'Failed to load users data.',
            variant: 'destructive',
          });
          setLoading(false);
        }
      );

      // Real-time listener for waste logs
      wasteLogsUnsubscribe = onSnapshot(
        collection(db, 'wasteLogs'),
        (snapshot) => {
          wasteLogsRef.current = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as WasteLog[];
          calculateAndUpdateAnalytics(eventsRef.current, usersRef.current, wasteLogsRef.current);
        },
        (error) => {
          console.error('Error listening to waste logs:', error);
          toast({
            title: 'Error',
            description: 'Failed to load waste logs data.',
            variant: 'destructive',
          });
          setLoading(false);
        }
      );
    } else if (!authLoading) {
      // Stop loading state if user is not permitted, ProtectedRoute will render the guard
      setLoading(false);
    }

    // Cleanup listeners on unmount
    return () => {
      if (eventsUnsubscribe) eventsUnsubscribe();
      if (usersUnsubscribe) usersUnsubscribe();
      if (wasteLogsUnsubscribe) wasteLogsUnsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userProfile?.role, userProfile?.isAdminVerified]);

  const calculateAndUpdateAnalytics = (events: Event[], users: UserProfile[], wasteLogs: WasteLog[]) => {
    try {
      const now = new Date();
      
      // Calculate basic metrics
      const totalEvents = events.length;
      const volunteers = users.filter(u => u.role === 'volunteer');
      const totalVolunteers = volunteers.length;
      const totalWasteCollected = wasteLogs.reduce((sum, log) => sum + (log.weightKg || 0), 0);
      const activeVolunteers = volunteers.filter(u => u.eventsAttended && u.eventsAttended.length > 0).length;
      
      // Calculate event status
      const upcomingEvents = events.filter(e => {
        const eventDate = e.date ? (typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date)) : null;
        return eventDate && eventDate > now;
      }).length;
      
      const completedEvents = events.filter(e => {
        const eventDate = e.date ? (typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date)) : null;
        return eventDate && eventDate < now;
      }).length;

      // Calculate waste by month with proper date handling
      const wasteByMonth: Record<string, number> = {};
      wasteLogs.forEach(log => {
        if (!log.date || !log.weightKg) return;
        
        try {
          let logDate: Date;
          if (typeof log.date === 'string') {
            logDate = parseISO(log.date);
          } else if (log.date instanceof Date) {
            logDate = log.date;
          } else if (log.date && typeof (log.date as any).toDate === 'function') {
            // Firestore Timestamp
            logDate = (log.date as any).toDate();
          } else {
            logDate = new Date(log.date);
          }
          
          if (isNaN(logDate.getTime())) return;
          
          const monthKey = format(logDate, 'MMM yyyy');
          wasteByMonth[monthKey] = (wasteByMonth[monthKey] || 0) + (log.weightKg || 0);
        } catch (dateError) {
          console.warn('Error parsing date for waste log:', log.date, dateError);
        }
      });

      // Convert to array and sort by date
      const wasteByMonthArray = Object.entries(wasteByMonth)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => {
          try {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
        });

      // Get top volunteers sorted by points and contributions
      // Calculate total waste contributed by each volunteer
      const volunteerContributions = volunteers.map(volunteer => {
        const volunteerWasteLogs = wasteLogs.filter(
          log => log.userId === volunteer.uid || log.loggedBy === volunteer.uid
        );
        const totalWasteContributed = volunteerWasteLogs.reduce(
          (sum, log) => sum + (log.weightKg || 0), 
          0
        );
        const eventsCount = volunteer.eventsAttended?.length || 0;
        
        return {
          ...volunteer,
          totalWasteContributed,
          eventsCount,
          // Sort by points first, then by waste contributed
          sortScore: (volunteer.points || 0) * 1000 + totalWasteContributed,
        };
      });

      // Sort by combined score (points + contributions)
      const topVolunteers = volunteerContributions
        .filter(v => (v.points || 0) > 0 || v.totalWasteContributed > 0)
        .sort((a, b) => b.sortScore - a.sortScore)
        .slice(0, 5)
        .map(({ sortScore, ...rest }) => rest); // Remove sortScore from output

      setAnalyticsData({
        totalEvents,
        totalVolunteers,
        totalWasteCollected,
        activeVolunteers,
        upcomingEvents,
        completedEvents,
        wasteByMonth: wasteByMonthArray,
        topVolunteers,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error calculating analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate analytics data.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analyticsData) return;
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      ...analyticsData,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beachguardians-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Report Downloaded',
      description: 'Analytics report has been downloaded.',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin={true} requireVerification={true}>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true} requireVerification={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Impact Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Visualize and analyze the impact of your cleanup efforts.
            </p>
          </div>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{analyticsData?.totalEvents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Volunteers</p>
                  <p className="text-2xl font-bold">{analyticsData?.totalVolunteers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Waste Collected</p>
                  <p className="text-2xl font-bold">{(analyticsData?.totalWasteCollected || 0).toFixed(1)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Volunteers</p>
                  <p className="text-2xl font-bold">{analyticsData?.activeVolunteers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5" />
                Waste Collection Trends
              </CardTitle>
              <CardDescription>
                Total waste collected over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData?.wasteByMonth && analyticsData.wasteByMonth.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.wasteByMonth.map((item, index) => {
                    const maxAmount = Math.max(...analyticsData.wasteByMonth.map(w => w.amount));
                    const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                    return (
                      <div key={`${item.month}-${index}`} className="flex items-center justify-between">
                        <span className="text-sm font-medium w-24">{item.month}</span>
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${Math.min(percentage, 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-20 text-right">
                            {item.amount.toFixed(1)} kg
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <Trash2 className="mx-auto h-12 w-12 mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No waste data available yet</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Waste data will appear here once volunteers start logging waste
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Map className="mr-2 h-5 w-5" />
                Event Status
              </CardTitle>
              <CardDescription>
                Overview of event completion status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Upcoming</span>
                  <span className="text-lg font-bold text-blue-600">{analyticsData?.upcomingEvents || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-lg font-bold text-green-600">{analyticsData?.completedEvents || 0}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-lg font-bold">
                      {analyticsData && analyticsData.totalEvents > 0 
                        ? `${((analyticsData.completedEvents / analyticsData.totalEvents) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Volunteers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Volunteers</CardTitle>
            <CardDescription>
              Volunteers with the highest points and contributions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.topVolunteers && analyticsData.topVolunteers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.topVolunteers.map((volunteer, index) => (
                  <div key={volunteer.uid} className="p-4 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{volunteer.fullName}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Points:</span>
                            <span className="text-xs font-semibold text-primary">{volunteer.points || 0}</span>
                          </div>
                          {volunteer.totalWasteContributed !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Waste:</span>
                              <span className="text-xs font-semibold text-green-600">
                                {volunteer.totalWasteContributed.toFixed(1)} kg
                              </span>
                            </div>
                          )}
                          {volunteer.eventsCount !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Events:</span>
                              <span className="text-xs font-semibold text-blue-600">{volunteer.eventsCount || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No volunteer data available yet</p>
                <p className="text-xs mt-2">
                  Volunteer rankings will appear here once volunteers start earning points
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}