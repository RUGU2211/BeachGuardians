import { NextResponse } from 'next/server';
import { getAdminRtdb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { getAdminVerificationEmailTemplate } from '@/lib/email-templates';

export async function POST(req: Request) {
  try {
    const { email, uid } = await req.json();

    if (!email || !uid) {
      return NextResponse.json({ error: 'Email and UID are required' }, { status: 400 });
    }

    // 1. Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // 2. Set an expiration time (10 minutes from now)
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // 3. Update the user's record in Realtime Database
    const db = getAdminRtdb();
    await db.ref(`users/${uid}`).update({ otp, otpExpires });

    // 4. Send the OTP to the user's email
    const { subject, html } = getAdminVerificationEmailTemplate(otp);

    await sendEmail({
      to: email,
      subject: subject,
      html: html,
    });

    return NextResponse.json({ success: true, message: 'Verification OTP sent successfully.' });
  } catch (error) {
    console.error('Error sending verification OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to send OTP: ${errorMessage}` }, { status: 500 });
  }
} 