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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const expirationTime = Date.now() + 10 * 60 * 1000;

    try {
      // Store OTP in Realtime Database
      const db = getAdminRtdb();
      await db.ref(`volunteer_otp_verification/${email.replace(/\./g, '_')}`).set({
        otp,
        expirationTime,
        email,
        name,
        createdAt: Date.now(),
      });
    } catch (dbError: any) {
      console.error('Error storing OTP in database:', dbError);
      return NextResponse.json(
        { error: `Failed to store OTP: ${dbError.message || 'Database error'}` },
        { status: 500 }
      );
    }

    try {
      // Send OTP email
      const { subject, html } = getVolunteerVerificationEmailTemplate(name, otp);
      await sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (emailError: any) {
      console.error('Error sending OTP email:', emailError);
      
      // Check if it's an email configuration error
      if (emailError.message?.includes('EMAIL_USER') || emailError.message?.includes('EMAIL_PASS')) {
        return NextResponse.json(
          { error: 'Email service is not configured. Please contact the administrator.' },
          { status: 500 }
        );
      }
      
      // Provide more detailed error message
      const errorMessage = emailError.message || 'Failed to send email';
      return NextResponse.json(
        { error: `Failed to send email: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'OTP sent successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error sending volunteer OTP:', error);
    const errorMessage = error.message || 'An unexpected error occurred';
    return NextResponse.json(
      { error: `Failed to send OTP: ${errorMessage}` },
      { status: 500 }
    );
  }
}