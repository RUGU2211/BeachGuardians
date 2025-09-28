import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Initialize admin Firestore
    const adminDb = getAdminDb();

    // Read user profile to mirror into leaderboard
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userSnap.data() as any;

    const leaderboardDoc = {
      volunteerId: userId,
      name: user.displayName ?? user.fullName ?? 'Unknown',
      email: user.email ?? null,
      avatarUrl: user.photoURL ?? user.avatarUrl ?? null,
      points: Number(user.points ?? 0),
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection('leaderboard').doc(userId).set(leaderboardDoc, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    // In dev without admin credentials, firebase-admin may throw; return non-fatal
    console.error('[leaderboard/sync] error:', error?.message || error);
    return NextResponse.json({ skipped: true, reason: 'admin unavailable' }, { status: 200 });
  }
}