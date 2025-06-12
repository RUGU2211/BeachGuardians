import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LeaderboardEntry } from '@/lib/types';
import { Award } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserVolId?: string; // To highlight current user
}

export function LeaderboardTable({ entries, currentUserVolId }: LeaderboardTableProps) {
  if (!entries || entries.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Leaderboard is currently empty. Start participating to get on the board!</p>;
  }

  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-orange-400'];


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px] text-center">Rank</TableHead>
          <TableHead>Volunteer</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, index) => (
          <TableRow key={entry.volunteerId} className={entry.volunteerId === currentUserVolId ? 'bg-primary/10' : ''}>
            <TableCell className="font-medium text-center">
              {index < 3 ? (
                <Award className={`h-6 w-6 inline-block ${rankColors[index]}`} />
              ) : (
                entry.rank
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={entry.avatarUrl} alt={entry.name} data-ai-hint="person avatar" />
                  <AvatarFallback>{entry.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{entry.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right font-semibold">{entry.points}</TableCell>
          </TableRow>
        ))}
      </TableBody>
       <TableCaption>Top volunteers making a difference. Keep up the great work!</TableCaption>
    </Table>
  );
}
