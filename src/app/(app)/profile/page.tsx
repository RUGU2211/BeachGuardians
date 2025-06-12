'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { mockVolunteers, mockAchievements, mockWasteLogs } from '@/lib/mockData'; // Use specific volunteer
import { BadgeDisplay } from '@/components/gamification/BadgeDisplay';
import { Award, Edit3, Gift, Mail, Recycle, ShieldAlert, Star, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import type { Contribution } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

// Assume we have a way to get the current logged-in volunteer's ID
// For now, let's pick the first volunteer from mock data
const currentVolunteer = mockVolunteers[0]; 

export default function ProfilePage() {
  if (!currentVolunteer) {
    return <div>Loading profile...</div>; // Or a proper error/loading state
  }

  const totalWasteLogged = currentVolunteer.contributions.reduce((total, contribution) => {
    return total + contribution.wasteLogged.reduce((sum, log) => sum + log.weightKg, 0);
  }, 0);

  const eventsAttendedCount = currentVolunteer.contributions.length;

  // Gamification example: next level
  const pointsToNextLevel = 1500;
  const progressToNextLevel = Math.min((currentVolunteer.points / pointsToNextLevel) * 100, 100);


  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-primary/20 to-background p-8 text-center md:flex-row md:justify-start md:space-x-6 md:space-y-0 md:text-left">
          <Avatar className="h-24 w-24 border-4 border-background shadow-md">
            <AvatarImage src={currentVolunteer.avatarUrl} alt={currentVolunteer.name} data-ai-hint="person avatar" />
            <AvatarFallback className="text-3xl">
              {currentVolunteer.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-headline">{currentVolunteer.name}</CardTitle>
            <CardDescription className="text-primary-foreground/80 flex items-center justify-center md:justify-start">
              <Mail className="mr-2 h-4 w-4" /> {currentVolunteer.email}
            </CardDescription>
            <div className="flex items-center justify-center md:justify-start pt-1">
              <Star className="mr-1 h-5 w-5 text-accent" />
              <span className="font-semibold text-lg text-accent-foreground/90">{currentVolunteer.points} Points</span>
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
              <p className="text-2xl font-bold">{currentVolunteer.achievements.length}</p>
              <p className="text-sm text-muted-foreground">Badges Earned</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Level Progress</h3>
            <Progress value={progressToNextLevel} className="w-full h-3" />
            <p className="text-sm text-muted-foreground mt-1 text-right">{currentVolunteer.points} / {pointsToNextLevel} points to next level</p>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-xl font-semibold mb-3 font-headline">My Achievements</h3>
            <BadgeDisplay achievements={currentVolunteer.achievements} size="md" />
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-xl font-semibold mb-3 font-headline">Contribution History</h3>
            {currentVolunteer.contributions.length > 0 ? (
              <ul className="space-y-4">
                {currentVolunteer.contributions.map((contrib, index) => (
                  <li key={index} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-center">
                      <Link href={`/events/${contrib.eventId}`} className="font-medium text-primary hover:underline">
                        {contrib.eventName}
                      </Link>
                      <span className="text-sm text-muted-foreground">{new Date(contrib.date).toLocaleDateString()}</span>
                    </div>
                    {contrib.wasteLogged.length > 0 && (
                      <ul className="mt-2 text-sm list-disc list-inside pl-2 text-muted-foreground">
                        {contrib.wasteLogged.map(log => (
                          <li key={log.id}>{log.weightKg}kg of {log.type}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No contributions logged yet.</p>
            )}
          </div>
           <Separator className="my-6" />
            <div>
                <h3 className="text-xl font-semibold mb-3 font-headline">Digital Certificates</h3>
                <p className="text-muted-foreground mb-2">View and download your certificates of participation and achievement.</p>
                {/* Placeholder for certificate list */}
                <div className="p-4 border rounded-lg bg-muted/30 text-center">
                    <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Certificate generation feature coming soon!</p>
                     <Button variant="secondary" className="mt-2" disabled>Download Example Certificate</Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
