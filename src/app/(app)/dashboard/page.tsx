
'use client';
import { StatCard } from '@/components/dashboard/StatCard';
import { ImpactChart } from '@/components/dashboard/ImpactChart';
import { Users, Trash2, CalendarCheck2, Award, History, ListChecks } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import { mockEvents, mockVolunteers, mockWasteLogs, getEventById, getVolunteerById } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const chartConfig = {
  wasteCollected: { label: 'Waste (kg)', color: 'hsl(var(--chart-1))' },
  volunteers: { label: 'Volunteers', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const generateMonthlyData = () => {
  const A_FEW_MONTHS = 6;
  const today = new Date();
  const data = Array.from({ length: A_FEW_MONTHS }).map((_, i) => {
    const targetMonthDate = subMonths(today, i);
    const monthName = format(targetMonthDate, 'MMMM');
    const monthAbbreviation = format(targetMonthDate, 'MMM');
    const year = targetMonthDate.getFullYear();
    const start = startOfMonth(targetMonthDate);
    const end = endOfMonth(targetMonthDate);

    let wasteCollectedThisMonth = 0;
    const activeVolunteersThisMonth = new Set<string>();

    mockWasteLogs.forEach(log => {
      const logDate = parseISO(log.date); // Assuming log.date is ISO string
      if (isWithinInterval(logDate, { start, end })) {
        wasteCollectedThisMonth += log.weightKg;
        activeVolunteersThisMonth.add(log.loggedBy);
      }
    });

    mockEvents.forEach(event => {
      const eventDate = parseISO(event.date); // Assuming event.date is ISO string
      if (isWithinInterval(eventDate, { start, end })) {
        if(event.status === 'completed' || event.status === 'ongoing'){ // Count volunteers for completed or ongoing events in the month
            event.volunteers.forEach(volId => activeVolunteersThisMonth.add(volId));
        }
      }
    });

    return {
      name: monthAbbreviation, // For XAxis (e.g., "Jun")
      fullName: `${monthName} ${year}`, // For tooltip or other displays
      wasteCollected: parseFloat(wasteCollectedThisMonth.toFixed(1)),
      volunteers: activeVolunteersThisMonth.size,
    };
  }).reverse(); // Reverse to have oldest month first for chart progression

  // If there's no data for the current month yet, ensure it's present with 0 values
  const currentMonthAbbrev = format(today, 'MMM');
  if (!data.find(d => d.name === currentMonthAbbrev && d.fullName.endsWith(today.getFullYear().toString()))) {
    data.push({
        name: currentMonthAbbrev,
        fullName: `${format(today, 'MMMM')} ${today.getFullYear()}`,
        wasteCollected: 0,
        volunteers: 0,
    });
    if(data.length > A_FEW_MONTHS) data.shift(); // Keep it to A_FEW_MONTHS
  }


  return data;
};


export default function DashboardPage() {
  const totalWasteCollected = mockWasteLogs.reduce((sum, log) => sum + log.weightKg, 0);
  const totalVolunteers = mockVolunteers.length;
  const totalEvents = mockEvents.length;
  const upcomingEvents = mockEvents.filter(event => event.status === 'upcoming' || event.status === 'ongoing').slice(0, 3);

  const monthlyChartData = generateMonthlyData();

  const recentWasteLogs = [...mockWasteLogs]
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .slice(0, 5)
    .map(log => {
      const event = getEventById(log.eventId);
      const volunteer = getVolunteerById(log.loggedBy);
      return {
        ...log,
        eventName: event?.name || 'N/A',
        eventLink: event ? `/events/${event.id}` : '#',
        volunteerName: volunteer?.name || 'Unknown Volunteer',
        volunteerAvatar: volunteer?.avatarUrl,
        volunteerInitials: volunteer?.name.split(' ').map(n=>n[0]).join('') || 'UV',
        logDateFormatted: format(parseISO(log.date), 'MMM dd, yyyy')
      };
    });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Waste Collected" value={`${totalWasteCollected.toFixed(1)} kg`} icon={Trash2} description="Across all events" />
        <StatCard title="Active Volunteers" value={totalVolunteers} icon={Users} description="Registered and active" />
        <StatCard title="Events Hosted" value={totalEvents} icon={CalendarCheck2} description="Completed and upcoming" />
        <StatCard title="Top Volunteer Points" value={mockVolunteers.reduce((max, v) => Math.max(max, v.points), 0)} icon={Award} description="Highest score on leaderboard" />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <ImpactChart
          title="Monthly Activity Overview"
          description="Waste collected and volunteer participation over the past months."
          data={monthlyChartData}
          config={chartConfig}
          dataKeys={[
            { name: 'wasteCollected', colorVar: 'hsl(var(--chart-1))' },
            { name: 'volunteers', colorVar: 'hsl(var(--chart-2))' },
          ]}
          className="lg:col-span-4"
        />
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><CalendarCheck2 className="mr-2 h-6 w-6 text-primary" />Upcoming Events</CardTitle>
            <CardDescription>Quick look at the next few cleanups.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-3">
                {upcomingEvents.map(event => (
                  <li key={event.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Image src={event.mapImageUrl || "https://placehold.co/40x40.png"} alt={event.name} width={40} height={40} className="rounded-md object-cover" data-ai-hint="event location" />
                    <div className="flex-1">
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">{event.name}</Link>
                      <p className="text-xs text-muted-foreground">{format(parseISO(event.date), 'MMM dd, yyyy')} - {event.location}</p>
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
      
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><History className="mr-2 h-6 w-6 text-primary" />Recent Waste Logs</CardTitle>
          <CardDescription>Latest waste collection entries by volunteers.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentWasteLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Waste Type</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWasteLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">{log.logDateFormatted}</TableCell>
                    <TableCell>
                      <Link href={log.eventLink} className="font-medium hover:underline">
                        {log.eventName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={log.volunteerAvatar} alt={log.volunteerName} data-ai-hint="person avatar" />
                          <AvatarFallback>{log.volunteerInitials}</AvatarFallback>
                        </Avatar>
                        <span>{log.volunteerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{log.type}</TableCell>
                    <TableCell className="text-right font-medium">{log.weightKg.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No waste logs recorded recently.</p>
          )}
           <Button className="w-full mt-4" asChild variant="outline">
              <Link href="/waste-logging">Log New Waste</Link>
            </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
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

