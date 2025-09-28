import { NextRequest, NextResponse } from 'next/server';
import { withAdminAIVerification } from '@/lib/ai-auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { db as clientDb } from '@/lib/firebase';
import { doc as clientDoc, setDoc as clientSetDoc } from 'firebase/firestore';

async function handler(
  request: NextRequest,
  context: { uid: string; userProfile: any }
) {
  try {
    const { uid, userProfile } = context;

    const ngoName = (userProfile?.ngoName && userProfile.ngoName.trim().length > 0)
      ? userProfile.ngoName
      : userProfile?.fullName || 'Unknown NGO';

    const payload = {
      ngoName,
      adminName: userProfile?.fullName || '',
      avatarUrl: userProfile?.avatarUrl || '',
      updatedAt: new Date().toISOString(),
    };

    try {
      const adminDb = getAdminDb();
      await adminDb.collection('ngos').doc(uid).set(payload, { merge: true });
    } catch (err) {
      // Development fallback without Admin credentials
      await clientSetDoc(clientDoc(clientDb, 'ngos', uid), payload, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error mirroring admin profile to ngos:', error);
    return NextResponse.json({ error: 'Failed to mirror admin profile' }, { status: 500 });
  }
}

export const POST = withAdminAIVerification(handler);