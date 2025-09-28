import { NextRequest, NextResponse } from 'next/server';
import { getAdminRtdb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { getVolunteerVerificationEmailTemplate } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const expirationTime = Date.now() + 10 * 60 * 1000;

    // Store OTP in Realtime Database
    const db = getAdminRtdb();
    await db.ref(`volunteer_otp_verification/${email.replace(/\./g, '_')}`).set({
      otp,
      expirationTime,
      email,
      name,
      createdAt: Date.now(),
    });

    // Send OTP email
    const { subject, html } = getVolunteerVerificationEmailTemplate(name, otp);
    await sendEmail({
      to: email,
      subject,
      html,
    });

    return NextResponse.json(
      { message: 'OTP sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending volunteer OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}