'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Recycle, Users, Gift, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, WasteLog } from '@/lib/types';

interface RealTimeStatsProps {
  className?: string;
}

export function RealTimeStats({ className = '' }: RealTimeStatsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    points: 0,
    wasteCollected: 0,
    eventsAttended: 0,
    badgesEarned: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Listen to user profile changes
    const userDocRef = doc(db, 'users', user.uid);
    const userUnsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as UserProfile;
        setStats(prev => ({
          ...prev,
          points: userData.points || 0,
          eventsAttended: userData.eventsAttended?.length || 0,
        }));
      }
    });

    // Listen to waste logs
    const wasteLogsQuery = query(
      collection(db, 'wasteLogs'),
      where('loggedBy', '==', user.uid)
    );

    const wasteUnsubscribe = onSnapshot(wasteLogsQuery, (querySnapshot) => {
      let totalWaste = 0;
      querySnapshot.forEach((doc) => {
        const logData = doc.data() as WasteLog;
        totalWaste += logData.weightKg;
      });

      setStats(prev => ({
        ...prev,
        wasteCollected: totalWaste,
      }));
    });

    // Cleanup
    return () => {
      userUnsubscribe();
      wasteUnsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    // Set loading to false after initial data load
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-full mx-auto mb-2" />
              <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-1" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <Card className="p-4 bg-muted/50 rounded-lg text-center">
        <Recycle className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">{stats.wasteCollected.toFixed(1)} kg</p>
        <p className="text-sm text-muted-foreground">Waste Collected</p>
        <div className="flex items-center justify-center mt-1">
          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          <span className="text-xs text-green-600">Live</span>
        </div>
      </Card>
      
      <Card className="p-4 bg-muted/50 rounded-lg text-center">
        <Users className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">{stats.eventsAttended}</p>
        <p className="text-sm text-muted-foreground">Events Attended</p>
        <div className="flex items-center justify-center mt-1">
          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          <span className="text-xs text-green-600">Live</span>
        </div>
      </Card>
      
      <Card className="p-4 bg-muted/50 rounded-lg text-center">
        <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold">{stats.badgesEarned}</p>
        <p className="text-sm text-muted-foreground">Badges Earned</p>
        <div className="flex items-center justify-center mt-1">
          <Star className="h-3 w-3 text-yellow-500 mr-1" />
          <span className="text-xs text-yellow-600">Coming Soon</span>
        </div>
      </Card>
    </div>
  );
} 