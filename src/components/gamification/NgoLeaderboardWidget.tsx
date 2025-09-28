'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Building2 } from 'lucide-react';
import { getRealTimeNgoLeaderboard } from '@/lib/firebase';
import type { NgoLeaderboardEntry } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface NgoLeaderboardWidgetProps {
  maxEntries?: number;
  showViewAll?: boolean;
  sortBy?: 'waste' | 'events';
}

export function NgoLeaderboardWidget({ maxEntries = 5, showViewAll = true, sortBy = 'waste' }: NgoLeaderboardWidgetProps) {
  const [leaderboard, setLeaderboard] = useState<NgoLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupLeaderboard = async () => {
      try {
        unsubscribe = await getRealTimeNgoLeaderboard((data) => {
          // Data comes sorted by waste; if sortBy is events, sort accordingly
          const sorted = sortBy === 'events'
            ? [...data].sort((a, b) => b.eventsCount - a.eventsCount)
            : data;
          setLeaderboard(sorted.slice(0, maxEntries));
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up NGO leaderboard widget:', error);
        setLoading(false);
      }
    };

    setupLeaderboard();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [maxEntries, sortBy]);

  const getRankIcon = (rank: number) => {
    if (isNaN(rank)) return <span className="text-sm text-muted-foreground font-medium">-</span>;
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-yellow-700" />;
    return <span className="text-sm text-muted-foreground font-medium">{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-200';
    if (rank === 2) return 'bg-gray-50 border-gray-200';
    if (rank === 3) return 'bg-yellow-50 border-yellow-200';
    return 'bg-background border-border';
  };

  const rankFor = (entry: NgoLeaderboardEntry) => (sortBy === 'events' ? entry.rankByEvents : entry.rankByWaste);

  const title = sortBy === 'events' ? 'Top NGOs by Events' : 'Top NGOs by Waste';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: maxEntries }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {showViewAll && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/leaderboard?tab=ngo">View All</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.ngoId}
              className={`flex items-center space-x-3 p-2 rounded-lg border transition-colors ${getRankColor(rankFor(entry))}`}
            >
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(rankFor(entry))}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.avatarUrl} alt={entry.ngoName} />
                <AvatarFallback className="text-xs">
                  {entry.ngoName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.ngoName}</p>
                <p className="text-xs text-muted-foreground">
                  {sortBy === 'events'
                    ? `${entry.eventsCount.toLocaleString()} events`
                    : `${entry.totalWasteKg.toLocaleString()} kg`}
                </p>
              </div>
            </div>
          ))}
        </div>
        {leaderboard.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No NGOs yet</p>
            <p className="text-xs">Create events to appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}