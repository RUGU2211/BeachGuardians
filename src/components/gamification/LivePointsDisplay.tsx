'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp } from 'lucide-react';

interface LivePointsDisplayProps {
  showIcon?: boolean;
  showTrend?: boolean;
  className?: string;
}

export function LivePointsDisplay({ showIcon = true, showTrend = false, className = '' }: LivePointsDisplayProps) {
  const { userProfile } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for user points
    const userDocRef = doc(db, 'users', userProfile.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setPoints(userData.points || 0);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to user points:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  if (loading) {
    return (
      <Badge variant="secondary" className={className}>
        <div className="animate-pulse">Loading...</div>
      </Badge>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
      {showIcon && <Star className="h-3 w-3" />}
      {showTrend && <TrendingUp className="h-3 w-3 text-green-500" />}
      <span>{points.toLocaleString()} pts</span>
    </Badge>
  );
} 