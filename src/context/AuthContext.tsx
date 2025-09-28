'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, getUserProfile } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async () => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      setUser(newUser);
      
      if (newUser) {
        setLoading(true);
        // Attempt to sync verification flags from RTDB mirror into Firestore
        try {
          await fetch('/api/users/sync-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: newUser.uid }),
          });
        } catch (syncErr) {
          console.warn('Verification sync failed (non-fatal):', syncErr);
        }
        let profile = null;
        // Retry fetching profile a few times to deal with replication lag
        for (let i = 0; i < 3; i++) {
          profile = await getUserProfile(newUser.uid);
          if (profile) break;
          // Wait for a short period before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
        
        if (profile) {
          setUserProfile(profile);
        } else {
          console.error(`Failed to fetch user profile for ${newUser.uid} after multiple attempts.`);
          // Keep user authenticated, but profile is null. 
          // Pages should handle this case (e.g., show a "complete profile" prompt).
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    logout: handleSignOut,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
