import * as admin from 'firebase-admin';

// Ensure the app is only initialized once
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('The FIREBASE_PRIVATE_KEY environment variable is not set.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key must be formatted correctly
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin; 