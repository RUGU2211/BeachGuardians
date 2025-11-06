import { NextResponse } from 'next/server';
import { getAdminRtdb, getAdminDb } from '@/lib/firebase-admin';
import { db as clientDb } from '@/lib/firebase';
import { doc as clientDoc, setDoc as clientSetDoc, getDoc as clientGetDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { uid, email, displayName } = await req.json();

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    // First check if profile already exists in Firestore
    try {
      const clientDocRef = clientDoc(clientDb, 'users', uid);
      const existingDoc = await clientGetDoc(clientDocRef);
      
      if (existingDoc.exists()) {
        return NextResponse.json({ 
          success: true, 
          message: 'Profile already exists',
          profile: existingDoc.data() 
        });
      }
    } catch (checkErr) {
      // If client check fails, try admin SDK
      try {
        const adminDb = getAdminDb();
        const existingDoc = await adminDb.collection('users').doc(uid).get();
        
        if (existingDoc.exists) {
          return NextResponse.json({ 
            success: true, 
            message: 'Profile already exists',
            profile: existingDoc.data() 
          });
        }
      } catch (adminCheckErr) {
        console.warn('Failed to check existing profile:', adminCheckErr);
      }
    }

    // Profile doesn't exist, try to get data from RTDB
    let rtdbData: any = null;
    try {
      const rtdb = getAdminRtdb();
      const snap = await (rtdb as any).ref(`users/${uid}`).get();
      rtdbData = snap?.val() || null;
      if (rtdbData) {
        console.log(`[ensure-profile] Found RTDB data for ${uid}, role: ${rtdbData.role}`);
      } else {
        console.warn(`[ensure-profile] No RTDB data found for ${uid}`);
      }
    } catch (rtdbErr) {
      console.warn(`[ensure-profile] Failed to read from RTDB for ${uid}:`, rtdbErr);
    }

    // Determine role - prefer RTDB data
    // If RTDB has role, use it; otherwise default to volunteer
    // Note: If RTDB doesn't have role, we default to volunteer to avoid creating admin profiles without proper data
    // Admin profiles should have their role set in RTDB during signup
    const userRole = rtdbData?.role || 'volunteer';
    
    if (!rtdbData && userRole === 'volunteer') {
      console.warn(`[ensure-profile] No RTDB data found for ${uid}, creating volunteer profile by default`);
    } else if (rtdbData && userRole === 'admin') {
      console.log(`[ensure-profile] Creating admin profile for ${uid} based on RTDB data`);
    }

    // Create a basic profile from available data
    const profileData: Partial<UserProfile> = {
      uid,
      email: email || rtdbData?.email || '',
      fullName: displayName || rtdbData?.fullName || rtdbData?.name || 'User',
      role: userRole,
      isVerified: rtdbData?.isVerified || false,
      isAdminVerified: rtdbData?.isAdminVerified || false,
      points: rtdbData?.points || 0,
      eventsAttended: rtdbData?.eventsAttended || [],
      avatarUrl: rtdbData?.avatarUrl || '',
      bio: rtdbData?.bio || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add admin-specific fields if role is admin
    if (profileData.role === 'admin') {
      profileData.ngoName = rtdbData?.ngoName || '';
      profileData.ngoType = rtdbData?.ngoType || '';
      profileData.ngoRegistrationId = rtdbData?.ngoRegistrationId || '';
    }

    // Remove undefined values
    const cleanedProfile = Object.fromEntries(
      Object.entries(profileData).filter(([, value]) => value !== undefined)
    );

    // Write to Firestore - ALWAYS use Admin SDK to bypass rules
    // If Admin SDK fails, we can't use client SDK as it would be subject to rules
    try {
      const adminDb = getAdminDb();
      await adminDb.collection('users').doc(uid).set(cleanedProfile, { merge: true });
      console.log(`[ensure-profile] Successfully created/updated profile for ${uid} with role: ${userRole}`);
    } catch (err: any) {
      // Admin SDK is required - if it fails, we can't proceed
      console.error(`[ensure-profile] Failed to create profile with Admin SDK for ${uid}:`, err);
      
      // Only try client SDK if Admin SDK is not available (development mode)
      // But log a warning that this might fail due to rules
      if (err?.message?.includes('not available') || err?.message?.includes('development')) {
        try {
          console.warn(`[ensure-profile] Attempting client SDK fallback for ${uid} (may fail due to rules)`);
          // For admin role, client SDK will fail due to rules - so we need to handle this
          if (userRole === 'admin') {
            return NextResponse.json({ 
              error: 'profile_creation_failed', 
              details: 'Admin SDK required to create admin profile. Please ensure ADMIN_KEY is configured.',
              requiresAdminSDK: true
            }, { status: 500 });
          }
          await clientSetDoc(clientDoc(clientDb, 'users', uid), cleanedProfile, { merge: true });
          console.log(`[ensure-profile] Successfully created profile using client SDK for ${uid}`);
        } catch (clientErr: any) {
          console.error(`[ensure-profile] Failed to create profile with client SDK for ${uid}:`, clientErr);
          return NextResponse.json({ 
            error: 'profile_creation_failed', 
            details: clientErr?.message || 'Cannot write to Firestore. Check Firestore rules.',
            code: clientErr?.code || 'unknown'
          }, { status: 500 });
        }
      } else {
        // Admin SDK error that's not about availability
        return NextResponse.json({ 
          error: 'profile_creation_failed', 
          details: err?.message || 'Failed to create profile with Admin SDK',
          code: err?.code || 'unknown'
        }, { status: 500 });
      }
    }

    // Also create NGO public profile if admin
    if (profileData.role === 'admin') {
      try {
        const ngoPublic = {
          ngoName: profileData.ngoName || profileData.fullName || 'NGO',
          adminName: profileData.fullName || 'Admin',
          avatarUrl: profileData.avatarUrl || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        try {
          const adminDb = getAdminDb();
          await adminDb.collection('ngos').doc(uid).set(ngoPublic, { merge: true });
        } catch (adminErr) {
          // Fallback to client SDK
          try {
            await clientSetDoc(clientDoc(clientDb, 'ngos', uid), ngoPublic, { merge: true });
          } catch (clientErr) {
            console.warn('Failed to create NGO public profile with both SDKs:', clientErr);
          }
        }
      } catch (ngoErr) {
        // Non-fatal error
        console.warn('Failed to create NGO public profile:', ngoErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile created successfully',
      profile: cleanedProfile 
    });
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return NextResponse.json({ 
      error: 'profile_creation_failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

