'use client';
import { StatCard } from '@/components/dashboard/StatCard';
import { ImpactChart } from '@/components/dashboard/ImpactChart';
import { Users, Trash2, CalendarCheck2, Award } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import { mockEvents, mockVolunteers, mockWasteLogs } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const chartConfig = {
  wasteCollected: { label: 'Waste (kg)', color: 'hsl(var(--chart-1))' },
  volunteers: { label: 'Volunteers', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const recentActivityData = [
  {
    month: 'January',
    wasteCollected: Math.floor(Math.random() * 200) + 50,
    volunteers: Math.floor(Math.random() * 50) + 10,
  },
  {
    month: 'February',
    wasteCollected: Math.floor(Math.random() * 200) + 50,
    volunteers: Math.floor(Math.random() * 50) + 10,
  },
  {
    month: 'March',
    wasteCollected: Math.floor(Math.random() * 200) + 50,
    volunteers: Math.floor(Math.random() * 50) + 10,
  },
  {
    month: 'April',
    wasteCollected: Math.floor(Math.random() * 300) + 70,
    volunteers: Math.floor(Math.random() * 60) + 15,
  },
   {
    month: 'May',
    wasteCollected: mockWasteLogs.reduce((sum, log) => sum + log.weightKg, 0),
    volunteers: mockVolunteers.length,
  },
];


export default function DashboardPage() {
  const totalWasteCollected = mockWasteLogs.reduce((sum, log) => sum + log.weightKg, 0);
  const totalVolunteers = mockVolunteers.length;
  const totalEvents = mockEvents.length;
  const upcomingEvents = mockEvents.filter(event => event.status === 'upcoming').slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Waste Collected" value={`${totalWasteCollected} kg`} icon={Trash2} description="Across all events" />
        <StatCard title="Active Volunteers" value={totalVolunteers} icon={Users} description="Registered and active" />
        <StatCard title="Events Hosted" value={totalEvents} icon={CalendarCheck2} description="Completed and upcoming" />
        <StatCard title="Top Volunteer Points" value={mockVolunteers.reduce((max, v) => Math.max(max, v.points), 0)} icon={Award} description="Highest score on leaderboard" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ImpactChart
          title="Monthly Activity Overview"
          description="Waste collected and volunteer participation over the past months."
          data={recentActivityData.map(d => ({name: d.month, wasteCollected: d.wasteCollected, volunteers: d.volunteers}))}
          config={chartConfig}
          dataKeys={[
            { name: 'wasteCollected', colorVar: 'hsl(var(--chart-1))' },
            { name: 'volunteers', colorVar: 'hsl(var(--chart-2))' },
          ]}
          className="lg:col-span-4"
        />
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Upcoming Events</CardTitle>
            <CardDescription>Quick look at the next few cleanups.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-3">
                {upcomingEvents.map(event => (
                  <li key={event.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <CalendarCheck2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">{event.name}</Link>
                      <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()} - {event.location}</p>
                    </div>
                     <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${event.id}`}>View</Link>
                     </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            )}
             <Button className="w-full mt-4" asChild>
                <Link href="/events">View All Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Cleanup Heatmap (Conceptual)</CardTitle>
          <CardDescription>Visualization of areas with most cleanup activity and reported waste.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64 bg-muted/30 rounded-md">
          <Image src="https://placehold.co/800x400.png" alt="Cleanup Heatmap Placeholder" data-ai-hint="map pollution" width={800} height={400} className="object-contain" />
        </CardContent>
      </Card>

    </div>
  );
}
