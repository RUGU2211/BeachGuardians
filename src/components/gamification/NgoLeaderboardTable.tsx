'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NgoLeaderboardEntry } from '@/lib/types';

interface NgoLeaderboardTableProps {
  entries: NgoLeaderboardEntry[];
  sortBy?: 'waste' | 'events';
  startRank?: number;
}

export function NgoLeaderboardTable({ entries, sortBy = 'waste', startRank = 1 }: NgoLeaderboardTableProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-yellow-700';
    return 'text-muted-foreground';
  };

  const rankFor = (entry: NgoLeaderboardEntry) => (sortBy === 'events' ? entry.rankByEvents : entry.rankByWaste);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] text-center">Rank</TableHead>
            <TableHead>NGO</TableHead>
            <TableHead className="text-right">Total Waste (kg)</TableHead>
            <TableHead className="text-right">Events</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const rank = rankFor(entry);
            return (
              <TableRow key={entry.ngoId}>
                <TableCell className="font-bold text-lg text-center">
                  <div className="flex items-center justify-center">
                    {rank <= 3 ? (
                      <Trophy className={cn('h-5 w-5', getRankColor(rank))} />
                    ) : (
                      <span className="text-muted-foreground">{rank}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={entry.avatarUrl} alt={entry.ngoName} />
                      <AvatarFallback>{entry.ngoName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{entry.ngoName}</span>
                      {entry.organizerName && (
                        <span className="text-xs text-muted-foreground">Organizer: {entry.organizerName}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{entry.totalWasteKg.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{entry.eventsCount.toLocaleString()}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}