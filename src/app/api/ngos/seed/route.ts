import { NextRequest, NextResponse } from 'next/server';
import { withAdminAIVerification } from '@/lib/ai-auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { db as clientDb } from '@/lib/firebase';
import { collection as clientCollection, query as clientQuery, where as clientWhere, getDocs as clientGetDocs, doc as clientDoc, setDoc as clientSetDoc } from 'firebase/firestore';

async function handler(
  request: NextRequest,
  context: { uid: string; userProfile: any }
) {
  try {
    // Optional: allow custom seeds via request body; default to mirroring all admins
    let seeds: Array<{ uid: string; ngoName?: string; adminName?: string; avatarUrl?: string }>|null = null;
    try {
      const body = await request.json();
      if (Array.isArray(body?.seeds)) {
        seeds = body.seeds as Array<{ uid: string; ngoName?: string; adminName?: string; avatarUrl?: string }>;
      }
    } catch {}

    // Collect admin users
    let admins: Array<{ uid: string; fullName?: string; ngoName?: string; avatarUrl?: string }> = [];
    if (!seeds) {
      try {
        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
        admins = snapshot.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
      } catch (e) {
        // Dev fallback with client Firestore
        const q = clientQuery(clientCollection(clientDb, 'users'), clientWhere('role', '==', 'admin'));
        const snap = await clientGetDocs(q);
        admins = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
      }
    }

    const items = seeds ?? admins.map(a => ({
      uid: a.uid,
      ngoName: (a.ngoName && a.ngoName.trim().length > 0) ? a.ngoName : (a.fullName || 'Unknown NGO'),
      adminName: a.fullName || '',
      avatarUrl: a.avatarUrl || '',
    }));

    // Write to ngos
    let wrote = 0;
    for (const item of items) {
      const payload = {
        ngoName: item.ngoName || '',
        adminName: item.adminName || '',
        avatarUrl: item.avatarUrl || '',
        updatedAt: new Date().toISOString(),
      };
      try {
        const adminDb = getAdminDb();
        await adminDb.collection('ngos').doc(item.uid).set(payload, { merge: true });
      } catch (err) {
        await clientSetDoc(clientDoc(clientDb, 'ngos', item.uid), payload, { merge: true });
      }
      wrote++;
    }

    return NextResponse.json({ success: true, count: wrote });
  } catch (error) {
    console.error('Error seeding ngos:', error);
    return NextResponse.json({ error: 'Failed to seed ngos' }, { status: 500 });
  }
}

export const POST = withAdminAIVerification(handler);