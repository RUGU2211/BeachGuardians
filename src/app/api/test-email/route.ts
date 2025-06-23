import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, testEmailConnection } from '@/lib/email';
import { getWelcomeEmailTemplate } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Test email connection first
    const connectionTest = await testEmailConnection();
    if (!connectionTest) {
      return NextResponse.json({ error: 'Email server connection failed' }, { status: 500 });
    }

    // Send test email
    const emailTemplate = getWelcomeEmailTemplate(name);
    const result = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return NextResponse.json({ 
      message: 'Test email sent successfully',
      messageId: result.messageId 
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Test email connection
    const connectionTest = await testEmailConnection();
    
    return NextResponse.json({ 
      connection: connectionTest ? 'success' : 'failed',
      message: connectionTest ? 'Email server is ready' : 'Email server connection failed'
    });

  } catch (error) {
    console.error('Email connection test error:', error);
    return NextResponse.json({ 
      connection: 'failed',
      error: 'Failed to test email connection'
    }, { status: 500 });
  }
} 