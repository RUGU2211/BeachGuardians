'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Map, Download, Loader2, Users, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Event, UserProfile, WasteLog } from '@/lib/types';

interface AnalyticsData {
  totalEvents: number;
  totalVolunteers: number;
  totalWasteCollected: number;
  activeVolunteers: number;
  upcomingEvents: number;
  completedEvents: number;
  wasteByMonth: { month: string; amount: number }[];
  topVolunteers: UserProfile[];
}

export default function ImpactAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch events
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];

      // Fetch users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      })) as UserProfile[];

      // Fetch waste logs
      const wasteRef = collection(db, 'wasteLogs');
      const wasteSnapshot = await getDocs(wasteRef);
      const wasteLogs = wasteSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as WasteLog[];

      // Calculate analytics
      const now = new Date();
      const totalEvents = events.length;
      const totalVolunteers = users.filter(u => u.role === 'volunteer').length;
      const totalWasteCollected = wasteLogs.reduce((sum, log) => sum + log.weightKg, 0);
      const activeVolunteers = users.filter(u => u.role === 'volunteer' && u.eventsAttended && u.eventsAttended.length > 0).length;
      const upcomingEvents = events.filter(e => new Date(e.date) > now).length;
      const completedEvents = events.filter(e => new Date(e.date) < now).length;

      // Calculate waste by month
      const wasteByMonth = wasteLogs.reduce((acc, log) => {
        const date = new Date(log.date);
        const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + log.weightKg;
        return acc;
      }, {} as Record<string, number>);

      const wasteByMonthArray = Object.entries(wasteByMonth)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Get top volunteers
      const topVolunteers = users
        .filter(u => u.role === 'volunteer')
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

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

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data.',
        variant: 'destructive',
      });
    } finally {
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
                  {analyticsData.wasteByMonth.map((item, index) => (
                    <div key={item.month} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.month}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((item.amount / Math.max(...analyticsData.wasteByMonth.map(w => w.amount))) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {item.amount.toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground">No waste data available yet</p>
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
                  <div key={volunteer.uid} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{volunteer.fullName}</p>
                      <p className="text-xs text-muted-foreground">{volunteer.points} points</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No volunteer data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
} 