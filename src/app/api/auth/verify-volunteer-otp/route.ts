import { NextRequest, NextResponse } from 'next/server';
import { getAdminRtdb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Get OTP data from Realtime Database
    const db = getAdminRtdb();
    const otpRef = db.ref(`volunteer_otp_verification/${email.replace(/\./g, '_')}`);
    const snapshot = await otpRef.once('value');

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 400 }
      );
    }

    const otpData = snapshot.val();
    const currentTime = Date.now();

    // Check if OTP has expired
    if (currentTime > otpData.expirationTime) {
      // Remove expired OTP
      await otpRef.remove();
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // OTP is valid, remove it from database
    await otpRef.remove();

    return NextResponse.json(
      { 
        message: 'OTP verified successfully',
        verified: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error verifying volunteer OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}