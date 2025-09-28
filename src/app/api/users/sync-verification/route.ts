import { NextResponse } from 'next/server';
import { getAdminRtdb, getAdminDb } from '@/lib/firebase-admin';
import { db as clientDb } from '@/lib/firebase';
import { doc as clientDoc, setDoc as clientSetDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    // Read RTDB user mirror for flags
    const rtdb = getAdminRtdb();
    const snap = await (rtdb as any).ref(`users/${uid}`).get();
    const data = snap?.val() || null;

    if (!data) {
      return NextResponse.json({ success: false, reason: 'no_rtdb_user' }, { status: 200 });
    }

    const patch: Record<string, any> = {};
    if (typeof data.role === 'string') patch.role = data.role;
    if (data.isVerified === true || data.isVerified === false) patch.isVerified = !!data.isVerified;
    if (data.isAdminVerified === true) patch.isAdminVerified = true;
    patch.updatedAt = new Date().toISOString();

    // Write to Firestore users doc (admin if available, else client)
    try {
      const adminDb = getAdminDb();
      await adminDb.collection('users').doc(uid).set(patch, { merge: true });
    } catch (err) {
      await clientSetDoc(clientDoc(clientDb, 'users', uid), patch, { merge: true });
    }

    return NextResponse.json({ success: true, patched: Object.keys(patch) });
  } catch (error) {
    console.error('Error syncing verification from RTDB to Firestore:', error);
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 });
  }
}