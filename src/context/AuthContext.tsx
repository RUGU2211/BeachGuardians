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
        // First sync verification status from RTDB to Firestore
        try {
          await fetch('/api/users/sync-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid }),
          });
          // Wait a bit for sync to complete
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (syncErr) {
          console.warn('Verification sync failed during refresh:', syncErr);
        }
        
        // Try to fetch the profile
        let profile = await getUserProfile(user.uid);
        
        // If profile doesn't exist, ensure it exists (create if missing)
        if (!profile) {
          try {
            const ensureResponse = await fetch('/api/users/ensure-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || ''
              }),
            });
            
            if (ensureResponse.ok) {
              const ensureData = await ensureResponse.json();
              if (ensureData.profile) {
                profile = ensureData.profile;
              } else {
                // If ensure created a profile, fetch it again
                await new Promise(resolve => setTimeout(resolve, 200));
                profile = await getUserProfile(user.uid);
              }
            }
          } catch (ensureErr) {
            console.warn('Failed to ensure profile during refresh:', ensureErr);
          }
        }
        
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
          const syncResponse = await fetch('/api/users/sync-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: newUser.uid }),
          });
          if (!syncResponse.ok) {
            console.warn('Verification sync returned non-OK status:', syncResponse.status);
          }
        } catch (syncErr) {
          console.warn('Verification sync failed (non-fatal):', syncErr);
        }
        
        // Wait a bit for sync to complete before fetching profile
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let profile = null;
        // Retry fetching profile multiple times to deal with replication lag and permission issues
        for (let i = 0; i < 5; i++) {
          try {
            profile = await getUserProfile(newUser.uid);
            if (profile) break;
            
            // If profile is null and we're on a retry, try syncing again and ensuring profile exists
            if (i > 0 && !profile) {
              try {
                // First try syncing verification
                await fetch('/api/users/sync-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ uid: newUser.uid }),
                });
                
                // Then ensure profile exists (create if missing)
                const ensureResponse = await fetch('/api/users/ensure-profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    uid: newUser.uid,
                    email: newUser.email || '',
                    displayName: newUser.displayName || ''
                  }),
                });
                
                if (ensureResponse.ok) {
                  const ensureData = await ensureResponse.json();
                  if (ensureData.profile) {
                    profile = ensureData.profile;
                    break;
                  }
                }
              } catch (ensureErr) {
                console.warn('Retry sync/ensure failed:', ensureErr);
              }
            }
          } catch (err) {
            // getUserProfile should not throw, but handle just in case
            console.warn('Unexpected error fetching user profile:', err);
          }
          // Wait before retrying (exponential backoff)
          if (i < 4) { // Don't wait after last attempt
            await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
          }
        }
        
        // If still no profile after all retries, try ensuring it one more time
        if (!profile) {
          try {
            const ensureResponse = await fetch('/api/users/ensure-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                uid: newUser.uid,
                email: newUser.email || '',
                displayName: newUser.displayName || ''
              }),
            });
            
            if (ensureResponse.ok) {
              const ensureData = await ensureResponse.json();
              if (ensureData.profile) {
                profile = ensureData.profile;
              } else {
                // If ensure succeeded but no profile returned, wait and fetch again
                await new Promise(resolve => setTimeout(resolve, 500));
                profile = await getUserProfile(newUser.uid);
              }
            } else {
              // Log the error for debugging
              const errorData = await ensureResponse.json().catch(() => ({}));
              console.error(`[AuthContext] ensure-profile failed: ${ensureResponse.status}`, errorData);
            }
          } catch (ensureErr) {
            console.error('[AuthContext] Final ensure profile attempt failed:', ensureErr);
          }
        }
        
        if (profile) {
          setUserProfile(profile);
        } else {
          // Log the error but don't throw - allow UI to handle gracefully
          console.warn(`User profile for ${newUser.uid} not found after multiple attempts. User may need to complete profile setup.`);
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
