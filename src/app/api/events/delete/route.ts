import { NextRequest, NextResponse } from 'next/server';
import { deleteEvent as adminDeleteEvent, getAdminDb } from '@/lib/firebase-admin';
import { withAdminAIVerification } from '@/lib/ai-auth-middleware';

export const POST = withAdminAIVerification(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { eventId } = body as { eventId?: string };
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Ensure Admin SDK is available for destructive operation
    try {
      // Touch admin DB to assert availability
      await getAdminDb();
    } catch (e) {
      return NextResponse.json({ error: 'Admin SDK not configured', code: 'ADMIN_SDK_REQUIRED' }, { status: 501 });
    }

    await adminDeleteEvent(eventId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete event API error:', error);
    return NextResponse.json({ error: 'Failed to delete event', details: String(error?.message || error) }, { status: 500 });
  }
});