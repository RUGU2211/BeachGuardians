import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, getAdminRtdb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Middleware to verify admin access for AI features
 * Checks if the user is authenticated, has admin role, and is verified
 */
export async function verifyAdminForAI(request: NextRequest): Promise<{ 
  success: boolean; 
  error?: string; 
  uid?: string; 
  userProfile?: any;
}> {
  try {
    const isDevEnv = process.env.NODE_ENV !== 'production';

    // Always read the auth header first
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return {
        success: false,
        error: 'Missing authentication token'
      };
    }

    // In development, prefer a lightweight local decode + Firestore/RTDB check
    if (isDevEnv) {
      try {
        const parts = token.split('.');
        if (parts.length < 2) {
          throw new Error('Malformed token');
        }
        const payloadJson = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const uid = payload.uid || payload.user_id || payload.sub;
        if (!uid) {
          throw new Error('UID not found in token');
        }

        // Try client Firestore first
        let userProfile: any | null = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          userProfile = userDoc.exists() ? (userDoc.data() as any) : null;
        } catch (e) {
          userProfile = null;
        }

        // Fallback to RTDB mock in development
        if (!userProfile) {
          try {
            const rtdb = getAdminRtdb();
            const snap = await (rtdb as any).ref(`users/${uid}`).get();
            userProfile = snap?.val() || null;
          } catch (rtdbErr) {
            // Ignore and proceed to admin SDK path
            userProfile = null;
          }
        }

        if (userProfile && userProfile.role === 'admin' && userProfile.isAdminVerified) {
          return { success: true, uid, userProfile };
        }
        // If development checks didn't verify admin, continue to Admin SDK path below
      } catch (devErr) {
        console.warn('Development admin check failed; falling back to Admin SDK:', devErr);
      }
    }

    // Verify the Firebase token
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user profile from Firestore
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    const userProfile = userDoc.data();
    
    // Check if user has admin role
    if (userProfile?.role !== 'admin') {
      return {
        success: false,
        error: 'Admin access required for AI features'
      };
    }

    // Check if admin is verified
    if (!userProfile?.isAdminVerified) {
      return {
        success: false,
        error: 'Admin verification required to access AI features'
      };
    }

    return {
      success: true,
      uid,
      userProfile
    };

  } catch (error) {
    console.error('Error verifying admin for AI:', error);
    return {
      success: false,
      error: 'Authentication verification failed'
    };
  }
}

/**
 * Higher-order function to wrap API routes with admin AI verification
 */
export function withAdminAIVerification(
  handler: (request: NextRequest, context: { uid: string; userProfile: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const verification = await verifyAdminForAI(request);
    
    if (!verification.success) {
      return NextResponse.json(
        { 
          error: verification.error,
          code: 'AI_ACCESS_DENIED'
        }, 
        { status: 403 }
      );
    }

    // Call the original handler with verified context
    return handler(request, {
      uid: verification.uid!,
      userProfile: verification.userProfile
    });
  };
}

/**
 * Response helper for AI access denied errors
 */
export function createAIAccessDeniedResponse(message?: string) {
  return NextResponse.json(
    {
      error: message || 'Admin verification required to access AI features',
      code: 'AI_ACCESS_DENIED',
      requiresAdminVerification: true
    },
    { status: 403 }
  );
}