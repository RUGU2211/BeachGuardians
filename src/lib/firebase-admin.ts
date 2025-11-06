import * as admin from 'firebase-admin';

// Development mode flag
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.ADMIN_KEY;

export function getOrInitializeAdminApp(): admin.app.App {
  if (admin.apps.length) {
    return admin.app();
  }
  
  // In development mode without proper credentials, use a mock app
  if (isDevelopment && !process.env.ADMIN_KEY) {
    console.warn('Running in development mode without Firebase Admin credentials. Using mock configuration.');
    // Return a mock app for development
    return admin.initializeApp({
      projectId: 'shoreline-tzs9g-47d06',
      databaseURL: process.env.ADMIN_RTDB_URL || 'https://shoreline-tzs9g-47d06-default-rtdb.firebaseio.com/',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'shoreline-tzs9g-47d06.firebasestorage.app',
    });
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
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'shoreline-tzs9g-47d06.firebasestorage.app',
  });
}

// Mock storage for development mode - use global to persist across requests
const getMockStorage = () => {
  if (typeof global !== 'undefined') {
    if (!(global as any).mockOtpStorage) {
      (global as any).mockOtpStorage = new Map<string, any>();
    }
    return (global as any).mockOtpStorage;
  }
  // Fallback for non-Node environments
  return new Map<string, any>();
};

// Mock database reference for development
class MockDatabaseRef {
  private path: string;
  
  constructor(path: string) {
    this.path = path;
  }
  
  async set(value: any): Promise<void> {
    console.log(`[MOCK] Setting data at ${this.path}:`, value);
    const storage = getMockStorage();
    storage.set(this.path, value);
    return Promise.resolve();
  }
  
  async update(value: any): Promise<void> {
    console.log(`[MOCK] Updating data at ${this.path}:`, value);
    const storage = getMockStorage();
    const existingData = storage.get(this.path) || {};
    const updatedData = { ...existingData, ...value };
    storage.set(this.path, updatedData);
    return Promise.resolve();
  }
  
  async get(): Promise<any> {
    console.log(`[MOCK] Getting data from ${this.path}`);
    const storage = getMockStorage();
    const data = storage.get(this.path);
    console.log(`[MOCK] Data found:`, data);
    return Promise.resolve({
      exists: () => !!data,
      val: () => data
    });
  }
  
  async once(eventType: string): Promise<any> {
    console.log(`[MOCK] Reading data from ${this.path}`);
    const storage = getMockStorage();
    const data = storage.get(this.path);
    console.log(`[MOCK] Data found:`, data);
    console.log(`[MOCK] Data exists:`, !!data);
    console.log(`[MOCK] Storage size:`, storage.size);
    console.log(`[MOCK] All keys:`, Array.from(storage.keys()));
    return Promise.resolve({
      exists: () => !!data,
      val: () => data
    });
  }
  
  async remove(): Promise<void> {
    console.log(`[MOCK] Removing data from ${this.path}`);
    const storage = getMockStorage();
    storage.delete(this.path);
    return Promise.resolve();
  }
}

class MockDatabase {
  ref(path: string): MockDatabaseRef {
    return new MockDatabaseRef(path);
  }
}

export function getAdminDb(): FirebaseFirestore.Firestore {
  if (isDevelopment && !process.env.ADMIN_KEY) {
    throw new Error('Firestore not available in development mode without credentials');
  }
  const app = getOrInitializeAdminApp();
  return app.firestore();
}

export function getAdminAuth(): admin.auth.Auth {
  if (isDevelopment && !process.env.ADMIN_KEY) {
    throw new Error('Auth not available in development mode without credentials');
  }
  const app = getOrInitializeAdminApp();
  return app.auth();
}

export function getAdminRtdb(): admin.database.Database | MockDatabase {
  if (isDevelopment && !process.env.ADMIN_KEY) {
    console.log('[MOCK] Using mock database for development');
    return new MockDatabase() as any;
  }
  const app = getOrInitializeAdminApp();
  return app.database();
}

export default admin;

// Server-side helper to delete an event using Admin SDK
export async function deleteEvent(eventId: string): Promise<void> {
  const db = getAdminDb();
  const eventRef = db.collection('events').doc(eventId);

  // Delete wasteLogs that reference this event
  const wasteLogsSnap = await db.collection('wasteLogs')
    .where('eventId', '==', eventId)
    .get();
  const wasteDeletes: Promise<FirebaseFirestore.WriteResult>[] = [];
  wasteLogsSnap.forEach(doc => {
    wasteDeletes.push(doc.ref.delete());
  });
  await Promise.all(wasteDeletes);

  // Delete registrations subcollection under this event
  const regsSnap = await eventRef.collection('registrations').get();
  const regDeletes: Promise<FirebaseFirestore.WriteResult>[] = [];
  regsSnap.forEach(doc => {
    regDeletes.push(doc.ref.delete());
  });
  await Promise.all(regDeletes);

  // Finally delete the event document
  await eventRef.delete();
}