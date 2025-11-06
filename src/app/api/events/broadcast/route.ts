import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, getDoc, doc, getDocs } from 'firebase/firestore';
import { sendEmail } from '@/lib/email';
import { getNewEventNotificationTemplate } from '@/lib/email-templates';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId } = body as { eventId?: string };
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const origin = `${proto}://${host}`;

    // Try fetching via Firebase Admin first
    let eventData: any | null = null;
    let recipients: { email: string; name?: string }[] = [];

    try {
      const adminDb = await getAdminDb();
      const eventDoc = await adminDb.collection('events').doc(eventId).get();
      if (!eventDoc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      eventData = eventDoc.data();

      const usersSnap = await adminDb.collection('users').get();
      usersSnap.forEach((u) => {
        const data = u.data() || {};
        const email = data.email as string | undefined;
        const role = (data.role || '').toLowerCase();
        if (email && (role === 'volunteer' || role === 'admin')) {
          recipients.push({ email, name: data.fullName });
        }
      });
    } catch (err) {
      // Fallback to client SDK if Admin SDK is not configured
      const eventDocRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventDocRef);
      if (!eventDoc.exists()) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      eventData = eventDoc.data();

      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((u) => {
        const data = u.data() as any;
        const email = data.email as string | undefined;
        const role = (data.role || '').toLowerCase();
        if (email && (role === 'volunteer' || role === 'admin')) {
          recipients.push({ email, name: data.fullName });
        }
      });
    }

    const eventName = eventData?.name || 'New Event';
    const eventDateInput = eventData?.startDate || eventData?.date;
    const eventDateStr = (() => {
      try {
        const d = typeof eventDateInput === 'string' ? new Date(eventDateInput) : new Date(eventDateInput);
        return d.toLocaleString();
      } catch {
        return String(eventDateInput || 'TBA');
      }
    })();
    const eventLocation = eventData?.location || 'TBA';

    const dashboardUrl = `${origin}/dashboard`;
    const eventUrl = `${origin}/events/${eventId}`;

    const template = getNewEventNotificationTemplate(eventName, eventDateStr, eventLocation);
    const html = `${template.html}
      <div style="margin-top:24px;text-align:center;">
        <a href="${eventUrl}" style="background:#56A3D1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;margin:0 8px;">View Event</a>
        <a href="${dashboardUrl}" style="background:#F0F8FF;color:#56A3D1;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;margin:0 8px;border:1px solid #56A3D1;">Open Dashboard</a>
      </div>
    `;

    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendEmail({ to: r.email, subject: template.subject, html })
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    return NextResponse.json({ ok: true, sent, failed });
  } catch (error: any) {
    console.error('Broadcast new event error:', error);
    return NextResponse.json({ error: 'Failed to broadcast event', details: String(error?.message || error) }, { status: 500 });
  }
}