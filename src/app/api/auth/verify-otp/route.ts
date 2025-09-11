import { NextResponse } from 'next/server';
import { getAdminRtdb, getAdminDb } from '@/lib/firebase-admin';

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

    // OTP is valid, update user verification status
    await db.ref(`users/${uid}`).update({
      isVerified: true,
      otp: null,
      otpExpires: null,
    });

    // Also mirror verification to Firestore so the client profile reflects the change
    try {
      const adminDb = getAdminDb();
      await adminDb.collection('users').doc(uid).set({
        isVerified: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (mirrorErr) {
      // Log and proceed; RTDB is the source of truth for OTP, but UI reads Firestore profile
      console.error('Failed to mirror isVerified to Firestore:', mirrorErr);
    }

    return NextResponse.json({ success: true, message: 'Account verified successfully.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to verify OTP: ${errorMessage}` }, { status: 500 });
  }
} 