'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserVolId?: string | null;
  startRank?: number;
}

export function LeaderboardTable({ entries, currentUserVolId, startRank = 1 }: LeaderboardTableProps) {
  const { toast } = useToast();
  const [loadingCertificates, setLoadingCertificates] = useState<Set<string>>(new Set());

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-yellow-700';
    return 'text-muted-foreground';
  };

  const handleCertificateApplication = async (entry: LeaderboardEntry) => {
    if (loadingCertificates.has(entry.volunteerId)) return;

    setLoadingCertificates(prev => new Set(prev).add(entry.volunteerId));

    try {
      const response = await fetch('/api/certificate/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            email: entry.email || '',
            fullName: entry.name,
            points: entry.points,
            uid: entry.volunteerId,
            volunteerId: entry.volunteerId,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Certificate Sent!",
          description: `Your certificate has been sent to ${entry.email || 'your email'}.`,
        });
      } else {
        throw new Error(result.error || 'Failed to send certificate');
      }
    } catch (error) {
      console.error('Error applying for certificate:', error);
      toast({
        title: "Certificate Error",
        description: error instanceof Error ? error.message : "Failed to send certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCertificates(prev => {
        const newSet = new Set(prev);
        newSet.delete(entry.volunteerId);
        return newSet;
      });
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] text-center">Rank</TableHead>
            <TableHead>Volunteer</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="w-[150px] text-center">Certificate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const rank = startRank + index;
            const isCurrentUser = entry.volunteerId === currentUserVolId;
            const isLoading = loadingCertificates.has(entry.volunteerId);
            
            return (
              <TableRow key={entry.volunteerId} className={cn(isCurrentUser ? 'bg-blue-50' : '')}>
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
                      <AvatarImage src={entry.avatarUrl} alt={entry.name} />
                      <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{entry.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{entry.points.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  {isCurrentUser ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCertificateApplication(entry)}
                      disabled={isLoading || !entry.email}
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1" />
                      )}
                      {isLoading ? 'Sending...' : 'Get Certificate'}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled={true} className="w-full">
                      Apply
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
