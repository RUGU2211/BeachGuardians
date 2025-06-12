import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { mockLeaderboard, mockVolunteers } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  // Assuming current user is mockVolunteers[0] for highlighting
  const currentUserId = mockVolunteers[0]?.id;

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <Trophy className="h-12 w-12 text-accent mx-auto mb-2" />
          <CardTitle className="text-3xl font-headline">Community Leaderboard</CardTitle>
          <CardDescription>
            See who's leading the charge in our cleanup efforts! Points are awarded for participation and waste collection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardTable entries={mockLeaderboard} currentUserVolId={currentUserId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">How Points Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Earn points and climb the leaderboard by actively participating in Shoreline activities:</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>Event Participation:</strong> Earn 50 points for each event you attend and check-in.</li>
                <li><strong>Waste Logging:</strong> Earn 10 points for every kilogram of waste you log.</li>
                <li><strong>Achievements:</strong> Unlock special badges and bonus points for milestones.</li>
                <li><strong>Bonus Points:</strong> Occasionally, special events or challenges may offer bonus points.</li>
            </ul>
            <p className="mt-2">Keep an eye on your profile for new achievements and check back here to see your rank!</p>
        </CardContent>
      </Card>
    </div>
  );
}
