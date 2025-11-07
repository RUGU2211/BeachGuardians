"use client";
import { useEffect, useState } from 'react';
import type { LeaderboardEntry, NgoLeaderboardEntry } from '@/lib/types';
import { getRealTimeLeaderboard, getRealTimeNgoLeaderboard } from '@/lib/firebase';

export default function LeaderboardHighlights() {
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [topNgos, setTopNgos] = useState<NgoLeaderboardEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    let unsubscribeVol: (() => void) | undefined;
    let unsubscribeNgo: (() => void) | undefined;

    (async () => {
      // Real-time volunteer leaderboard
      try {
        unsubscribeVol = await getRealTimeLeaderboard((leaderboard) => {
          if (!mounted) return;
          setTopUsers(leaderboard.slice(0, 5));
        });
      } catch (err) {
        console.error('Error setting up volunteer leaderboard:', err);
        if (mounted) {
          setTopUsers([]);
        }
      }

      // Real-time NGO leaderboard
      try {
        unsubscribeNgo = await getRealTimeNgoLeaderboard((ngos) => {
          if (!mounted) return;
          setTopNgos(ngos.slice(0, 5));
        });
      } catch (err) {
        console.error('Error setting up NGO leaderboard:', err);
        if (mounted) {
          setTopNgos([]);
        }
      }
    })();

    return () => { 
      mounted = false; 
      if (unsubscribeVol) unsubscribeVol(); 
      if (unsubscribeNgo) unsubscribeNgo(); 
    };
  }, []);

  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Leaderboard & Rewards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border p-5">
            <h3 className="text-xl font-semibold mb-3">Top Participants</h3>
            <ul className="space-y-3">
              {topUsers.map((u, idx) => (
                <li key={u.volunteerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{idx + 1}</span>
                    <span className="font-medium">{u.name || u.volunteerId}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{u.points} pts</span>
                </li>
              ))}
              {topUsers.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            </ul>
          </div>
          <div className="rounded-xl border p-5">
            <h3 className="text-xl font-semibold mb-3">Top NGOs</h3>
            <ul className="space-y-3">
              {topNgos.map((n, idx) => (
                <li key={n.ngoId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{idx + 1}</span>
                    <span className="font-medium">{n.ngoName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{n.totalWasteKg} kg</span>
                </li>
              ))}
              {topNgos.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}