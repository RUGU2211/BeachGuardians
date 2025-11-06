'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Map, Download, Loader2, Users, Trash2, Calendar, TrendingUp, Leaf, Waves, Recycle, Zap, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Event, UserProfile, WasteLog } from '@/lib/types';
import { parseISO, format } from 'date-fns';

interface TopVolunteer extends UserProfile {
  totalWasteContributed?: number;
  eventsCount?: number;
}

interface EnvironmentalImpact {
  co2Saved: number; // kg CO2 equivalent saved
  treesSaved: number; // trees saved (1 tree = ~22kg CO2)
  oceanLifeSaved: number; // marine animals saved (estimated)
  plasticBottlesRecycled: number; // equivalent plastic bottles
  landfillSpaceSaved: number; // cubic meters saved
  energySaved: number; // kWh saved from recycling
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
  environmentalImpact: EnvironmentalImpact;
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
      const adminUid = userProfile.uid;
      
      // Real-time listener for events - filter by admin's events only
      eventsUnsubscribe = onSnapshot(
        query(collection(db, 'events'), where('organizerId', '==', adminUid)),
        (snapshot) => {
          eventsRef.current = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Event[];
          calculateAndUpdateAnalytics(eventsRef.current, usersRef.current, wasteLogsRef.current, adminUid);
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
          calculateAndUpdateAnalytics(eventsRef.current, usersRef.current, wasteLogsRef.current, adminUid);
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

      // Real-time listener for waste logs - filter by admin's events only
      wasteLogsUnsubscribe = onSnapshot(
        collection(db, 'wasteLogs'),
        (snapshot) => {
          const allWasteLogs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as WasteLog[];
          
          // Filter waste logs to only include those from admin's events
          const adminEventIds = new Set(eventsRef.current.map(e => e.id));
          wasteLogsRef.current = allWasteLogs.filter(log => adminEventIds.has(log.eventId));
          
          calculateAndUpdateAnalytics(eventsRef.current, usersRef.current, wasteLogsRef.current, adminUid);
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

  const calculateAndUpdateAnalytics = (events: Event[], users: UserProfile[], wasteLogs: WasteLog[], adminUid?: string) => {
    try {
      const now = new Date();
      
      // Filter events to only include admin's events (if adminUid provided)
      const adminEvents = adminUid 
        ? events.filter(e => e.organizerId === adminUid)
        : events;
      
      // Filter waste logs to only include those from admin's events
      const adminEventIds = new Set(adminEvents.map(e => e.id));
      const adminWasteLogs = adminUid
        ? wasteLogs.filter(log => adminEventIds.has(log.eventId))
        : wasteLogs;
      
      // Get volunteers who participated in admin's events
      const adminEventVolunteerIds = new Set<string>();
      adminEvents.forEach(e => {
        (e.volunteers || []).forEach((uid: string) => adminEventVolunteerIds.add(uid));
      });
      const adminVolunteers = adminUid
        ? users.filter(u => adminEventVolunteerIds.has(u.uid))
        : users.filter(u => u.role === 'volunteer');
      
      // Calculate basic metrics (only from admin's events)
      const totalEvents = adminEvents.length;
      const totalVolunteers = adminVolunteers.length;
      const totalWasteCollected = adminWasteLogs.reduce((sum, log) => sum + (log.weightKg || 0), 0);
      const activeVolunteers = adminVolunteers.filter(u => u.eventsAttended && u.eventsAttended.length > 0).length;
      
      // Calculate event status (only admin's events)
      const upcomingEvents = adminEvents.filter(e => {
        const eventDate = e.date ? (typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date)) : null;
        return eventDate && eventDate > now;
      }).length;
      
      const completedEvents = adminEvents.filter(e => {
        const eventDate = e.date ? (typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date)) : null;
        return eventDate && eventDate < now;
      }).length;

      // Calculate waste by month with proper date handling (only from admin's events)
      const wasteByMonth: Record<string, number> = {};
      adminWasteLogs.forEach(log => {
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

      // Get top volunteers sorted by points and contributions (only from admin's events)
      // Calculate total waste contributed by each volunteer in admin's events
      const volunteerContributions = adminVolunteers.map(volunteer => {
        const volunteerWasteLogs = adminWasteLogs.filter(
          log => (log.userId === volunteer.uid || log.loggedBy === volunteer.uid) && adminEventIds.has(log.eventId)
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

      // Calculate environmental impact
      // Based on EPA and environmental research data:
      // - 1 kg plastic waste = ~1.7 kg CO2 equivalent saved when recycled/removed
      // - 1 tree absorbs ~22 kg CO2 per year
      // - 1 kg plastic = ~33 plastic bottles (average 30g per bottle)
      // - 1 kg plastic = ~0.001 cubic meters landfill space
      // - 1 kg plastic recycled = ~2.5 kWh energy saved
      // - 1 kg plastic removed from ocean = saves ~10 marine animals (estimated)
      const environmentalImpact: EnvironmentalImpact = {
        co2Saved: Math.round(totalWasteCollected * 1.7), // kg CO2 equivalent
        treesSaved: Math.round((totalWasteCollected * 1.7) / 22), // trees (1 tree = 22kg CO2/year)
        oceanLifeSaved: Math.round(totalWasteCollected * 10), // marine animals saved
        plasticBottlesRecycled: Math.round(totalWasteCollected * 33), // equivalent bottles
        landfillSpaceSaved: Math.round(totalWasteCollected * 0.001 * 100) / 100, // cubic meters
        energySaved: Math.round(totalWasteCollected * 2.5), // kWh
      };

      setAnalyticsData({
        totalEvents,
        totalVolunteers,
        totalWasteCollected,
        activeVolunteers,
        upcomingEvents,
        completedEvents,
        wasteByMonth: wasteByMonthArray,
        topVolunteers,
        environmentalImpact,
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

  const handleDownloadReport = async () => {
    if (!analyticsData) return;
    
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Set up PDF document
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      
      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('BeachGuardians Impact Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Date
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Key Metrics Section
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Metrics', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Events: ${analyticsData.totalEvents}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Volunteers: ${analyticsData.totalVolunteers}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Active Volunteers: ${analyticsData.activeVolunteers}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Waste Collected: ${analyticsData.totalWasteCollected.toFixed(1)} kg`, 20, yPosition);
      yPosition += 7;
      doc.text(`Upcoming Events: ${analyticsData.upcomingEvents}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Completed Events: ${analyticsData.completedEvents}`, 20, yPosition);
      yPosition += 15;
      
      // Environmental Impact Section
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Environmental Impact', 20, yPosition);
      yPosition += 10;
      
      // Create a table for environmental impact
      const impact = analyticsData.environmentalImpact;
      const tableStartY = yPosition;
      const col1X = 20;
      const col2X = 120;
      const rowHeight = 8;
      
      // Table header
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Metric', col1X, yPosition);
      doc.text('Value', col2X, yPosition);
      yPosition += rowHeight;
      
      // Draw header line
      doc.setLineWidth(0.5);
      doc.line(col1X, yPosition - 2, pageWidth - 20, yPosition - 2);
      yPosition += 3;
      
      // Table rows
      doc.setFont('helvetica', 'normal');
      const impactData = [
        ['CO₂ Saved', `${impact.co2Saved.toLocaleString()} kg CO₂e`],
        ['Trees Saved', `${impact.treesSaved.toLocaleString()} trees`],
        ['Ocean Life Saved', `${impact.oceanLifeSaved.toLocaleString()} marine animals`],
        ['Plastic Bottles Recycled', `${impact.plasticBottlesRecycled.toLocaleString()} bottles`],
        ['Landfill Space Saved', `${impact.landfillSpaceSaved.toFixed(2)} m³`],
        ['Energy Saved', `${impact.energySaved.toLocaleString()} kWh`],
      ];
      
      impactData.forEach(([metric, value]) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(metric, col1X, yPosition);
        doc.text(value, col2X, yPosition);
        yPosition += rowHeight;
      });
      
      yPosition += 10;
      
      // Waste Collection Trends
      if (analyticsData.wasteByMonth.length > 0) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Waste Collection Trends', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        analyticsData.wasteByMonth.forEach((item) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${item.month}: ${item.amount.toFixed(1)} kg`, 20, yPosition);
          yPosition += 7;
        });
        yPosition += 10;
      }
      
      // Top Volunteers
      if (analyticsData.topVolunteers.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Performing Volunteers', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        analyticsData.topVolunteers.forEach((volunteer, index) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${index + 1}. ${volunteer.fullName || volunteer.displayName || 'Volunteer'}`, 20, yPosition);
          yPosition += 6;
          doc.text(`   Points: ${volunteer.points || 0} | Waste: ${(volunteer.totalWasteContributed || 0).toFixed(1)} kg | Events: ${volunteer.eventsCount || 0}`, 25, yPosition);
          yPosition += 8;
        });
      }
      
      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('BeachGuardians - Protecting Our Coastlines', pageWidth / 2, pageHeight - 5, { align: 'center' });
      }
      
      // Save PDF
      doc.save(`beachguardians-impact-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: 'Report Downloaded',
        description: 'Impact report has been downloaded as PDF.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report. Please try again.',
        variant: 'destructive',
      });
    }
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
          <Button variant="outline" onClick={handleDownloadReport} disabled={!analyticsData}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF Report
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

        {/* Environmental Impact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Leaf className="mr-2 h-5 w-5 text-green-600" />
              Environmental Impact
            </CardTitle>
            <CardDescription>
              Environmental benefits from waste collection and recycling efforts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.environmentalImpact ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <TreePine className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CO₂ Saved</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {analyticsData.environmentalImpact.co2Saved.toLocaleString()} kg
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Carbon dioxide equivalent prevented</p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <TreePine className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Trees Saved</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {analyticsData.environmentalImpact.treesSaved.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Equivalent trees absorbing CO₂</p>
                </div>

                <div className="p-4 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                      <Waves className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ocean Life Saved</p>
                      <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                        {analyticsData.environmentalImpact.oceanLifeSaved.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Marine animals protected</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Recycle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bottles Recycled</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {analyticsData.environmentalImpact.plasticBottlesRecycled.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Equivalent plastic bottles</p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Trash2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Landfill Space</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {analyticsData.environmentalImpact.landfillSpaceSaved.toFixed(2)} m³
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Space saved in landfills</p>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Energy Saved</p>
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {analyticsData.environmentalImpact.energySaved.toLocaleString()} kWh
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Energy from recycling</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Leaf className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No environmental impact data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

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