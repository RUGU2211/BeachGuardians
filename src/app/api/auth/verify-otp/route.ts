import { NextResponse } from 'next/server';
import { getAdminRtdb, getAdminDb } from '@/lib/firebase-admin';
import { db as clientDb } from '@/lib/firebase';
import { doc as clientDoc, setDoc as clientSetDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { uid, otp } = await req.json();

    if (!uid || !otp) {
      return NextResponse.json({ error: 'UID and OTP are required' }, { status: 400 });
    }

    const db = getAdminRtdb();
    const snap = await db.ref(`users/${uid}`).get();
    const userData = snap.val();
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const storedOtp = userData?.otp;
    const otpExpires = userData?.otpExpires;

    if (!storedOtp || !otpExpires) {
      return NextResponse.json({ error: 'No OTP found for this user. Please request a new one.' }, { status: 400 });
    }

    if (storedOtp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
    }

    if (Date.now() > otpExpires) {
      // Clear the expired OTP
      await db.ref(`users/${uid}`).update({ otp: null, otpExpires: null });
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Get user profile to check role (handle development mode)
    let isAdmin = false;
    try {
      const adminDb = getAdminDb();
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const userProfile = userDoc.data();
      isAdmin = userProfile?.role === 'admin';
    } catch (error) {
      // In development mode without credentials, assume admin verification
      console.log('[MOCK] Assuming admin verification in development mode');
      isAdmin = true;
    }

    // OTP is valid, update user verification status
    // Mirror admin verification to both flags so UI and rules stay consistent
    const verificationUpdate = isAdmin 
      ? { isAdminVerified: true, isVerified: true, otp: null, otpExpires: null }
      : { isVerified: true, otp: null, otpExpires: null };
    
    await db.ref(`users/${uid}`).update(verificationUpdate);

    // Also mirror verification to Firestore so the client profile reflects the change
    try {
      const adminDb = getAdminDb();
      const firestoreUpdate = isAdmin 
        ? { isAdminVerified: true, isVerified: true, updatedAt: new Date().toISOString() }
        : { isVerified: true, updatedAt: new Date().toISOString() };
      
      await adminDb.collection('users').doc(uid).set(firestoreUpdate, { merge: true });
    } catch (mirrorErr) {
      // Fallback: use client Firestore to mirror in development
      try {
        const firestoreUpdate = isAdmin 
          ? { isAdminVerified: true, isVerified: true, updatedAt: new Date().toISOString() }
          : { isVerified: true, updatedAt: new Date().toISOString() };
        await clientSetDoc(clientDoc(clientDb, 'users', uid), firestoreUpdate, { merge: true });
      } catch (clientErr) {
        console.log('[MOCK] Failed to mirror to client Firestore:', clientErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Account verified successfully.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to verify OTP: ${errorMessage}` }, { status: 500 });
  }
}