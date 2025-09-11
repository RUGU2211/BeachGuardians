import * as admin from 'firebase-admin';

function getOrInitializeAdminApp(): admin.app.App {
  if (admin.apps.length) {
    return admin.app();
  }
  const serviceAccountJson = process.env.ADMIN_KEY || process.env.FIREBASE_ADMIN_CONFIG;
  const serviceAccountPath = process.env.ADMIN_KEY_PATH;
  let serviceAccount: admin.ServiceAccount;
  if (serviceAccountJson) {
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      throw new Error('ADMIN_KEY is not valid JSON.');
    }
  } else if (serviceAccountPath) {
    // Lazy require fs to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    try {
      const fileContent: string = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
    } catch (fileError) {
      throw new Error('Failed to read or parse service account from ADMIN_KEY_PATH.');
    }
  } else {
    throw new Error('Missing ADMIN_KEY or ADMIN_KEY_PATH env var for Firebase Admin initialization.');
  }
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.ADMIN_RTDB_URL || 'https://shoreline-tzs9g-47d06-default-rtdb.firebaseio.com/',
  });
}

export function getAdminDb(): FirebaseFirestore.Firestore {
  const app = getOrInitializeAdminApp();
  return app.firestore();
}

export function getAdminAuth(): admin.auth.Auth {
  const app = getOrInitializeAdminApp();
  return app.auth();
}

export function getAdminRtdb(): admin.database.Database {
  const app = getOrInitializeAdminApp();
  return app.database();
}

export default admin;