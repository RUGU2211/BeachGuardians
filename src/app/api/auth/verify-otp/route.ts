import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { uid, otp } = await req.json();

    if (!uid || !otp) {
      return NextResponse.json({ error: 'UID and OTP are required' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
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
      await userRef.update({
        otp: null,
        otpExpires: null,
      });
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // OTP is valid, update user verification status
    await userRef.update({
      isVerified: true,
      otp: null, // Clear the OTP after successful verification
      otpExpires: null,
    });

    return NextResponse.json({ success: true, message: 'Account verified successfully.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to verify OTP: ${errorMessage}` }, { status: 500 });
  }
} 