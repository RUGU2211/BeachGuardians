// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, setLogLevel, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, arrayUnion, arrayRemove, increment, onSnapshot, orderBy, limit, documentId, writeBatch } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { UserProfile, UserRole, Event, WasteLog, LeaderboardEntry, NgoLeaderboardEntry } from "./types";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMW5xV-E06wadMsJFyRfrOiuyac1IETXk",
  authDomain: "shoreline-tzs9g-47d06.firebaseapp.com",
  projectId: "shoreline-tzs9g-47d06",
  storageBucket: "shoreline-tzs9g-47d06.firebasestorage.app",
  messagingSenderId: "1018083665520",
  appId: "1:1018083665520:web:95232bef92621fb19fb6b5"
  // measurementId: "G-XXXXXXXXXX" // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
// Reduce noisy logs and avoid WebChannel aborts behind proxies/ad blockers.
setLogLevel('error');
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  // Force long polling to avoid WebChannel in restrictive networks
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
// Optional: connect to local Firestore emulator in development if enabled
try {
  const useEmuEnv = process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR;
  const isDev = process.env.NODE_ENV === 'development';
  const useEmu = useEmuEnv === 'true' ? true : useEmuEnv === 'false' ? false : false;
  if (isDev && useEmu) {
    const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost';
    const port = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080);
    connectFirestoreEmulator(db as any, host, port);
    // Lower log noise further when using emulator
    setLogLevel('error');
  }
} catch (e) {
  // Non-fatal if emulator is not available
}
const storage = getStorage(app);

// Global realtime toggle: default off in development, on otherwise unless explicitly overridden
function isRealtimeEnabled(): boolean {
  const enableRealtimeEnv = process.env.NEXT_PUBLIC_ENABLE_REALTIME;
  const isDev = process.env.NODE_ENV === 'development';
  if (enableRealtimeEnv === 'true') return true;
  if (enableRealtimeEnv === 'false') return false;
  return !isDev; // default: disable in dev to avoid noisy WebChannel aborts
}

interface CreateUserProfileData {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  ngoName?: string;
  ngoType?: string;
  ngoRegistrationId?: string;
}

// User management functions
export async function createUserProfile(
  userData: CreateUserProfileData & { isVerified?: boolean }
): Promise<void> {
  const { uid, role, isVerified, ...restData } = userData;

  // Use provided verification status, or default to false for both roles
  // Volunteers will be verified after OTP confirmation, admins after admin verification
  const verificationStatus = isVerified ?? false;

  const userProfile: UserProfile = {
    ...restData,
    uid,
    role,
    isVerified: verificationStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatarUrl: '',
    points: 0,
    eventsAttended: [],
    bio: '',
  };

  if (role === 'admin') {
    userProfile.ngoName = userData.ngoName || '';
    userProfile.ngoType = userData.ngoType || '';
    userProfile.ngoRegistrationId = userData.ngoRegistrationId || '';
  }

  // Firestore does not allow 'undefined' values.
  const cleanedProfile = Object.fromEntries(
    Object.entries(userProfile).filter(([, value]) => value !== undefined)
  );

  await setDoc(doc(db, 'users', uid), cleanedProfile);

  // Also mirror admin public profile into `ngos` collection for leaderboard display
  if (role === 'admin') {
    const ngoPublic = Object.fromEntries(
      Object.entries({
        ngoName: userProfile.ngoName || restData.fullName,
        adminName: restData.fullName,
        avatarUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).filter(([, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'ngos', uid), ngoPublic, { merge: true });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      console.warn('Permission denied while fetching user profile:', uid);
      // Return null instead of throwing to allow UI to handle gracefully
      return null;
    }
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function getUsersByIds(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) {
    return [];
  }
  try {
    // Firestore 'in' queries are limited to 10 IDs per query
    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 10) {
      chunks.push(uids.slice(i, i + 10));
    }
    const users: UserProfile[] = [];
    for (const chunk of chunks) {
      const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
      const querySnapshot = await getDocs(usersQuery);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        users.push({ ...data, uid: docSnap.id });
      });
    }
    return users;
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return [];
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await updateDoc(doc(db, 'users', uid), updateData);
}

export async function updateUserLocation(uid: string, location: { latitude: number; longitude: number }): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      location: location,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user location:', error);
    // We don't throw here to avoid crashing the app if location updates fail
  }
}

export async function verifyAdminUser(uid: string): Promise<void> {
  // For admin accounts, mirror verification to both flags
  await updateUserProfile(uid, { 
    isAdminVerified: true,
    isVerified: true,
    adminVerifiedAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString()
  });

  // Ensure NGO public profile exists/updated after admin verification
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const profile = snap.exists() ? (snap.data() as UserProfile) : null;
    if (profile && profile.role === 'admin') {
      const ngoName = (profile.ngoName && profile.ngoName.trim().length > 0)
        ? profile.ngoName
        : profile.fullName;
      const ngoPublic = Object.fromEntries(
        Object.entries({
          ngoName,
          adminName: profile.fullName,
          avatarUrl: profile.avatarUrl || '',
          updatedAt: new Date().toISOString(),
        }).filter(([, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'ngos', uid), ngoPublic, { merge: true });
    }
  } catch (e) {
    console.warn('Failed to mirror admin verification to ngos:', e);
  }
}

export async function verifyVolunteerUser(uid: string): Promise<void> {
  await updateUserProfile(uid, { 
    isVerified: true,
    verifiedAt: new Date().toISOString()
  });
}

export async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
  const userProfile = await getUserProfile(uid);
  return userProfile?.role === 'admin' && userProfile?.isAdminVerified === true;
}

export async function checkIfUserIsVerified(uid: string): Promise<boolean> {
  const userProfile = await getUserProfile(uid);
  return userProfile?.isVerified === true;
}

// Check if user exists in our database
export async function checkIfUserExists(uid: string): Promise<boolean> {
  const userProfile = await getUserProfile(uid);
  return userProfile !== null;
}

// Admin management functions
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersQuery = query(collection(db, 'users'));
    const querySnapshot = await getDocs(usersQuery);
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const querySnapshot = await getDocs(adminQuery);
    const admins: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      admins.push(doc.data() as UserProfile);
    });
    
    return admins;
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

export async function getPendingAdminUsers(): Promise<UserProfile[]> {
  try {
    const pendingQuery = query(
      collection(db, 'users'), 
      where('role', '==', 'admin'),
      where('isAdminVerified', '==', false)
    );
    const querySnapshot = await getDocs(pendingQuery);
    const pendingAdmins: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      pendingAdmins.push(doc.data() as UserProfile);
    });
    
    return pendingAdmins;
  } catch (error) {
    console.error('Error fetching pending admin users:', error);
    return [];
  }
}

// Event management functions
export async function createEvent(eventData: Omit<Event, 'id' | 'volunteers' | 'wasteCollectedKg' | 'status' | 'organizerId' | 'organizerName'>): Promise<string> {
  try {
    const user = getAuth().currentUser;
    if (!user) throw new Error("User not authenticated");

    const userProfile = await getUserProfile(user.uid);
    if (!userProfile) throw new Error("User profile not found");

    const newEvent: Event = {
      ...eventData,
      id: '', // will be set by firestore
      organizerId: user.uid,
      organizerName: userProfile.fullName || 'Unnamed Organizer',
      volunteers: [],
      wasteCollectedKg: 0,
      status: 'upcoming',
    };
    // Attach flat location fields for compatibility if locationDetails present
    if ((newEvent as any).locationDetails?.coordinates || (newEvent as any).locationDetails?.address) {
      const ld: any = (newEvent as any).locationDetails;
      (newEvent as any).event_location = ld.address || (newEvent as any).location;
      if (ld.coordinates) {
        (newEvent as any).latitude = ld.coordinates.latitude;
        (newEvent as any).longitude = ld.coordinates.longitude;
      }
    }
    const docRef = await addDoc(collection(db, 'events'), newEvent);
    await updateDoc(docRef, { id: docRef.id });
    try {
      await fetch('/api/events/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: docRef.id }),
      });
    } catch (notifyErr) {
      console.warn('Event created, but failed to trigger broadcast email:', notifyErr);
    }
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function getAllEvents(): Promise<Event[]> {
  try {
    const eventsQuery = query(collection(db, 'events'));
    const querySnapshot = await getDocs(eventsQuery);
    const events: Event[] = [];
    querySnapshot.forEach((docSnap) => {
      const raw = docSnap.data() as any;
      const normalized: any = {
        ...raw,
        id: docSnap.id,
      };
      if (raw?.startDate?.toDate) normalized.startDate = raw.startDate.toDate().toISOString();
      if (raw?.endDate?.toDate) normalized.endDate = raw.endDate.toDate().toISOString();
      if (raw?.date?.toDate) normalized.date = raw.date.toDate().toISOString();
      events.push(normalized as Event);
    });
    return events;
  } catch (error) {
    console.error('Error fetching all events:', error);
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const eventDoc = await getDoc(doc(db, 'events', id));
    if (eventDoc.exists()) {
      const eventData = eventDoc.data() as Event;
      // Normalize Firestore Timestamp fields to ISO strings for date values
      const anyData: any = eventData as any;
      const normalized: any = { ...eventData };
      if (anyData.startDate && typeof anyData.startDate === 'object' && typeof anyData.startDate.toDate === 'function') {
        normalized.startDate = anyData.startDate.toDate().toISOString();
      }
      if (anyData.endDate && typeof anyData.endDate === 'object' && typeof anyData.endDate.toDate === 'function') {
        normalized.endDate = anyData.endDate.toDate().toISOString();
      }
      if (anyData.date && typeof anyData.date === 'object' && typeof anyData.date.toDate === 'function') {
        normalized.date = anyData.date.toDate().toISOString();
      }
      return {
        ...normalized,
        id: eventDoc.id,
      } as Event;
    }
    return null;
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return null;
  }
}

export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
  try {
    // Convert Date objects to ISO strings to keep schema consistent with Event type
    const normalizedUpdates: any = { ...updates };
    if (updates.startDate) {
      const sd: any = updates.startDate as any;
      normalizedUpdates.startDate = sd instanceof Date ? sd.toISOString() : typeof sd === 'string' ? sd : sd?.toDate?.() ? sd.toDate().toISOString() : sd;
    }
    if (updates.endDate) {
      const ed: any = updates.endDate as any;
      normalizedUpdates.endDate = ed instanceof Date ? ed.toISOString() : typeof ed === 'string' ? ed : ed?.toDate?.() ? ed.toDate().toISOString() : ed;
    }
    if (updates.date) {
      const d: any = updates.date as any;
      normalizedUpdates.date = d instanceof Date ? d.toISOString() : typeof d === 'string' ? d : d?.toDate?.() ? d.toDate().toISOString() : d;
    }

    // Mirror flat location fields if locationDetails is being updated
    if (normalizedUpdates.locationDetails) {
      const ld: any = normalizedUpdates.locationDetails as any;
      (normalizedUpdates as any).event_location = ld.address || normalizedUpdates.location;
      if (ld.coordinates) {
        (normalizedUpdates as any).latitude = ld.coordinates.latitude;
        (normalizedUpdates as any).longitude = ld.coordinates.longitude;
      }
    }

    await updateDoc(doc(db, 'events', eventId), normalizedUpdates);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated');

    const token = await user.getIdToken();
    const res = await fetch('/api/events/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ eventId }),
    });

    if (res.ok) {
      return;
    }

    // If Admin SDK is not configured on the server, fall back to client-side cascade delete.
    if (res.status === 501) {
      // Only attempt client-side fallback if the caller is an admin per profile
      const isAdmin = await checkIfUserIsAdmin(user.uid);
      if (!isAdmin) {
        throw new Error('Admin SDK not configured and user is not an admin; cannot delete event. Configure ADMIN_KEY or make user an admin.');
      }
      try {
        const wasteLogsQuery = query(collection(db, 'wasteLogs'), where('eventId', '==', eventId));
        const wasteLogsSnapshot = await getDocs(wasteLogsQuery);
        const deletePromises = wasteLogsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        const regsSnap = await getDocs(collection(db, 'events', eventId, 'registrations'));
        const regDeletes = regsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(regDeletes);

        await deleteDoc(doc(db, 'events', eventId));
        return;
      } catch (fallbackErr) {
        console.error('Client-side delete fallback failed:', fallbackErr);
        throw fallbackErr;
      }
    }

    // Otherwise, surface server error details
    let details: any = null;
    try { details = await res.json(); } catch {}
    const message = details?.error || `Failed to delete event (${res.status})`;
    throw new Error(message);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// Lightweight in-memory rate limit to avoid rapid duplicate joins under flaky networks
const joinEventLastCall: Record<string, number> = {};
function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

export async function joinEvent(eventId: string, userId: string): Promise<void> {
  const key = `${userId}:${eventId}`;
  const now = Date.now();
  // Skip if the same join was attempted in the last 10 seconds
  if (joinEventLastCall[key] && (now - joinEventLastCall[key]) < 10_000) {
    return;
  }
  joinEventLastCall[key] = now;

  const attemptJoin = async () => {
    const regRef = doc(db, 'events', eventId, 'registrations', userId);

    // Short-circuit if already registered to avoid redundant writes under poor networks
    try {
      const existing = await getDoc(regRef);
      if (existing.exists()) return;
    } catch {}

    // Determine privileges: only admins may update event document
    let isAdminUser = false;
    try {
      isAdminUser = await checkIfUserIsAdmin(userId);
    } catch {}

    // Batch allowed writes to minimize round-trips
    const batch = writeBatch(db);

    batch.set(regRef, {
      userId,
      eventId,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // Mirror registration into user profile (self-update allowed by rules)
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { eventsAttended: arrayUnion(eventId) });

    // Update event volunteers ONLY if admin (event writes are admin-only in rules)
    if (isAdminUser) {
      const eventRef = doc(db, 'events', eventId);
      batch.update(eventRef, { volunteers: arrayUnion(userId) });
    }

    await batch.commit();
  };

  try {
    await attemptJoin();
  } catch (error: any) {
    // Do not retry on resource exhaustion to avoid amplifying write pressure.
    console.error('Error joining event (no retry):', error);
    throw error;
  }
}

export async function leaveEvent(eventId: string, userId: string): Promise<void> {
  try {
    const regRef = doc(db, 'events', eventId, 'registrations', userId);

    // Determine privileges: only admins may update event document
    let isAdminUser = false;
    try {
      isAdminUser = await checkIfUserIsAdmin(userId);
    } catch {}

    // Batch delete + mirrors
    const batch = writeBatch(db);
    batch.delete(regRef);

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { eventsAttended: arrayRemove(eventId) });

    // Update event volunteers ONLY if admin
    if (isAdminUser) {
      const eventRef = doc(db, 'events', eventId);
      batch.update(eventRef, { volunteers: arrayRemove(userId) });
    }

    await batch.commit();
  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
}

// Waste and Points functions
export async function addPointsToUser(userId: string, points: number): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      points: increment(points)
    });
  } catch (error) {
    console.error(`Error adding points to user ${userId}:`, error);
    throw error;
  }
}

export async function logWasteForEvent(eventId: string, wasteData: Omit<WasteLog, 'id' | 'date' | 'eventId'>): Promise<void> {
  try {
    const user = getAuth().currentUser;
    if (!user) throw new Error("User not authenticated for logging waste.");
    
    // Create a new WasteLog document
    const wasteLog: WasteLog = {
      ...wasteData,
      id: '', // Firestore will generate
      eventId: eventId,
      loggedBy: user.uid,
      userId: user.uid,
      date: new Date().toISOString(),
      adminName: wasteData.adminName || undefined,
    };
    const wasteLogRef = await addDoc(collection(db, 'wasteLogs'), wasteLog);
    await updateDoc(wasteLogRef, { id: wasteLogRef.id });

    // Update event waste total (allowed by rules)
    await updateDoc(doc(db, 'events', eventId), {
      wasteCollectedKg: increment(wasteData.weightKg)
    });

    // Add points to the user (allowed self-update by rules)
    const pointsToAdd = Math.round(wasteData.weightKg * 10);
    await addPointsToUser(user.uid, pointsToAdd);

    // Trigger server-side leaderboard sync (admin-only write)
    try {
      await fetch('/api/leaderboard/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
    } catch (syncErr) {
      console.warn('Leaderboard sync failed (non-fatal):', syncErr);
    }
  } catch (error) {
    console.error(`Error logging waste for event ${eventId}:`, error);
    throw error;
  }
}

// Registration helpers
export async function checkUserRegistration(eventId: string, userId: string): Promise<boolean> {
  try {
    const regRef = doc(db, 'events', eventId, 'registrations', userId);
    const snap = await getDoc(regRef);
    return snap.exists();
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
}

// List registrations (admin/organizer only; relies on Firestore rules)
export async function getEventRegistrations(eventId: string): Promise<string[]> {
  try {
    const regsSnap = await getDocs(collection(db, 'events', eventId, 'registrations'));
    const uids: string[] = [];
    regsSnap.forEach((docSnap) => {
      uids.push(docSnap.id);
    });
    return uids;
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return [];
  }
}

// Unified real-time events subscription
export function subscribeToEvents(
  callback: (events: Event[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    if (!isRealtimeEnabled()) {
      let stopped = false;
      const fetchAndEmit = async () => {
        try {
          const snap = await getDocs(q);
          if (stopped) return;
          const events: Event[] = snap.docs.map((docSnap) => {
            const raw: any = docSnap.data();
            const normalized: any = { ...raw, id: docSnap.id };
            if (raw?.startDate?.toDate) normalized.startDate = raw.startDate.toDate().toISOString();
            if (raw?.endDate?.toDate) normalized.endDate = raw.endDate.toDate().toISOString();
            if (raw?.date?.toDate) normalized.date = raw.date.toDate().toISOString();
            return normalized as Event;
          });
          callback(events);
        } catch (err) {
          onError?.(err as Error);
        }
      };
      // Initial fetch and periodic polling
      fetchAndEmit();
      const interval = setInterval(fetchAndEmit, 15000);
      return () => { stopped = true; clearInterval(interval); };
    }
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const events: Event[] = snap.docs.map((docSnap) => {
          const raw: any = docSnap.data();
          const normalized: any = { ...raw, id: docSnap.id };
          if (raw?.startDate?.toDate) normalized.startDate = raw.startDate.toDate().toISOString();
          if (raw?.endDate?.toDate) normalized.endDate = raw.endDate.toDate().toISOString();
          if (raw?.date?.toDate) normalized.date = raw.date.toDate().toISOString();
          return normalized as Event;
        });
        callback(events);
      },
      (err) => onError?.(err as Error)
    );
    return unsubscribe;
  } catch (error) {
    onError?.(error as Error);
    return () => {};
  }
}

// Real-time leaderboard functions
export async function getRealTimeLeaderboard(callback: (leaderboard: LeaderboardEntry[]) => void): Promise<() => void> {
  try {
    const enableRealtimeEnv = process.env.NEXT_PUBLIC_ENABLE_REALTIME;
    const enableRealtime = enableRealtimeEnv === undefined ? true : enableRealtimeEnv === 'true';

    const lbQuery = query(
      collection(db, 'leaderboard'),
      orderBy('points', 'desc'),
      limit(50)
    );

    if (!enableRealtime) {
      const snap = await getDocs(lbQuery);
      const leaderboard: LeaderboardEntry[] = [];
      snap.forEach((doc, index) => {
        const data = doc.data() as any;
        leaderboard.push({
          volunteerId: (data?.volunteerId ?? doc.id) as string,
          name: (data?.name ?? 'Unknown') as string,
          email: data?.email,
          avatarUrl: data?.avatarUrl,
          points: Number(data?.points ?? 0),
          rank: index + 1,
        });
      });
      callback(leaderboard);
      return () => {};
    }

    const unsubscribe = onSnapshot(lbQuery, (querySnapshot) => {
      const leaderboard: LeaderboardEntry[] = [];
      querySnapshot.forEach((doc, index) => {
        const data = doc.data() as any;
        leaderboard.push({
          volunteerId: (data?.volunteerId ?? doc.id) as string,
          name: (data?.name ?? 'Unknown') as string,
          email: data?.email,
          avatarUrl: data?.avatarUrl,
          points: Number(data?.points ?? 0),
          rank: index + 1,
        });
      });
      callback(leaderboard);
    }, (error) => {
      console.error('Error listening to leaderboard:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up leaderboard listener:', error);
    throw error;
  }
}

// Get current user's rank
export async function getCurrentUserRank(userId: string): Promise<number | null> {
  try {
    const lbQuery = query(
      collection(db, 'leaderboard'),
      orderBy('points', 'desc')
    );
    
    const querySnapshot = await getDocs(lbQuery);
    let rank = 0;
    
    for (const doc of querySnapshot.docs) {
      rank++;
      const data = doc.data() as any;
      const volunteerId = (data?.volunteerId ?? doc.id) as string;
      if (volunteerId === userId) {
        return rank;
      }
    }
    
    return null; // User not found
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
}

// Get top users for podium display
export async function getTopUsers(limitCount: number = 3): Promise<LeaderboardEntry[]> {
  try {
    const lbQuery = query(
      collection(db, 'leaderboard'),
      orderBy('points', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(lbQuery);
    const topUsers: LeaderboardEntry[] = [];
    
    querySnapshot.forEach((doc, index) => {
      const data = doc.data() as any;
      topUsers.push({
        volunteerId: (data?.volunteerId ?? doc.id) as string,
        name: (data?.name ?? 'Unknown') as string,
        email: data?.email,
        avatarUrl: data?.avatarUrl,
        points: Number(data?.points ?? 0),
        rank: index + 1,
      });
    });
    
    return topUsers;
  } catch (error) {
    console.error('Error getting top users:', error);
    return [];
  }
}

// Real-time NGO leaderboard (aggregated by organizer/admin)
export async function getRealTimeNgoLeaderboard(
  callback: (leaderboard: NgoLeaderboardEntry[]) => void
): Promise<() => void> {
  try {
    // Default realtime to ON if env var is undefined; allow disabling by setting to 'false'
    const enableRealtimeEnv = process.env.NEXT_PUBLIC_ENABLE_REALTIME;
    const enableRealtime = enableRealtimeEnv === undefined ? true : enableRealtimeEnv === 'true';
    console.log('[NGOLeaderboard] realtime enabled:', enableRealtime);
    // Build a map of NGO public profiles (publicly readable collection per new rules)
    type NgoPublicDoc = { name?: string; adminName?: string; avatarUrl?: string; ngoName?: string };
    const ngosSnap = await getDocs(query(collection(db, 'ngos')));
    const adminMap = new Map<string, Pick<UserProfile, 'fullName' | 'ngoName' | 'avatarUrl'>>();
    ngosSnap.forEach((doc) => {
      const data = doc.data() as NgoPublicDoc;
      const ngoName = (data.name ?? data.ngoName ?? '').toString();
      const fullName = (data.adminName ?? '').toString();
      const avatarUrl = (data.avatarUrl ?? '').toString();
      adminMap.set(doc.id, { fullName, ngoName, avatarUrl });
    });
    console.log('[NGOLeaderboard] ngo map size:', adminMap.size);

    // If realtime disabled, perform one-off aggregation and return a no-op unsubscribe
    if (!enableRealtime) {
      const eventsSnap = await getDocs(query(collection(db, 'events')));
      console.log('[NGOLeaderboard] one-off aggregation events:', eventsSnap.size);
      const agg = new Map<string, { totalWasteKg: number; eventsCount: number }>();
      eventsSnap.forEach((doc) => {
        const evt = doc.data() as Event;
        const organizerName = (evt as any)?.organizerName as string | undefined;
        const organizerId = (evt.organizerId || '').toString().trim();
        const key = organizerId.length > 0
          ? organizerId
          : (organizerName && organizerName.toString().trim().length > 0
              ? `name:${organizerName.toString().trim()}`
              : undefined);
        if (!key) return;
        const existing = agg.get(key) || { totalWasteKg: 0, eventsCount: 0 };
        const waste = Number(evt.wasteCollectedKg || 0);
        existing.totalWasteKg += isNaN(waste) ? 0 : waste;
        existing.eventsCount += 1;
        agg.set(key, existing);
      });

      const entries: NgoLeaderboardEntry[] = Array.from(agg.entries()).map(([ngoId, metrics]) => {
        const admin = adminMap.get(ngoId);
        let ngoName: string = 'Unknown NGO';
        if (admin?.ngoName && admin.ngoName.trim().length > 0) {
          ngoName = admin.ngoName;
        } else if (admin?.fullName && admin.fullName.trim().length > 0) {
          ngoName = admin.fullName;
        } else if (ngoId.startsWith('name:')) {
          ngoName = ngoId.substring(5);
        }
        return {
          ngoId,
          ngoName,
          organizerName: admin?.fullName ?? (ngoId.startsWith('name:') ? ngoName : undefined),
          avatarUrl: admin?.avatarUrl,
          totalWasteKg: Number(metrics.totalWasteKg.toFixed(2)),
          eventsCount: metrics.eventsCount,
          rankByWaste: 0,
          rankByEvents: 0,
        };
      });

      const byWaste = [...entries].sort((a, b) => b.totalWasteKg - a.totalWasteKg);
      byWaste.forEach((entry, idx) => {
        const e = entries.find((x) => x.ngoId === entry.ngoId);
        if (e) e.rankByWaste = idx + 1;
      });
      const byEvents = [...entries].sort((a, b) => b.eventsCount - a.eventsCount);
      byEvents.forEach((entry, idx) => {
        const e = entries.find((x) => x.ngoId === entry.ngoId);
        if (e) e.rankByEvents = idx + 1;
      });
      console.log('[NGOLeaderboard] computed entries:', entries.length, 'top NGO:', byWaste[0]?.ngoName, 'wasteKg:', byWaste[0]?.totalWasteKg);
      callback(byWaste);
      return () => {};
    }

    // Listen to events to aggregate NGO metrics
    const eventsQueryRef = query(
      collection(db, 'events')
      // Optionally filter to completed events only; comment out if real-time all events wanted
      //, where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(eventsQueryRef, (snapshot) => {
      console.log('[NGOLeaderboard] events snapshot size:', snapshot.size);
      const agg = new Map<string, { totalWasteKg: number; eventsCount: number }>();

      snapshot.forEach((doc) => {
        const evt = doc.data() as Event;
        const organizerName = (evt as any)?.organizerName as string | undefined;
        const organizerId = (evt.organizerId || '').toString().trim();
        const key = organizerId.length > 0
          ? organizerId
          : (organizerName && organizerName.toString().trim().length > 0
              ? `name:${organizerName.toString().trim()}`
              : undefined);
        if (!key) return;
        const existing = agg.get(key) || { totalWasteKg: 0, eventsCount: 0 };
        const waste = Number(evt.wasteCollectedKg || 0);
        existing.totalWasteKg += isNaN(waste) ? 0 : waste;
        existing.eventsCount += 1;
        agg.set(key, existing);
      });

      // Build entries
      const entries: NgoLeaderboardEntry[] = Array.from(agg.entries()).map(([ngoId, metrics]) => {
        const admin = adminMap.get(ngoId);
        let ngoName: string = 'Unknown NGO';
        if (admin?.ngoName && admin.ngoName.trim().length > 0) {
          ngoName = admin.ngoName;
        } else if (admin?.fullName && admin.fullName.trim().length > 0) {
          ngoName = admin.fullName;
        } else if (ngoId.startsWith('name:')) {
          ngoName = ngoId.substring(5);
        }
        return {
          ngoId,
          ngoName,
          organizerName: admin?.fullName ?? (ngoId.startsWith('name:') ? ngoName : undefined),
          avatarUrl: admin?.avatarUrl,
          totalWasteKg: Number(metrics.totalWasteKg.toFixed(2)),
          eventsCount: metrics.eventsCount,
          rankByWaste: 0, // to be filled after sorting
          rankByEvents: 0, // to be filled after sorting
        };
      });

      // Rank by waste
      const byWaste = [...entries].sort((a, b) => b.totalWasteKg - a.totalWasteKg);
      byWaste.forEach((entry, idx) => {
        const e = entries.find((x) => x.ngoId === entry.ngoId);
        if (e) e.rankByWaste = idx + 1;
      });

      // Rank by events
      const byEvents = [...entries].sort((a, b) => b.eventsCount - a.eventsCount);
      byEvents.forEach((entry, idx) => {
        const e = entries.find((x) => x.ngoId === entry.ngoId);
        if (e) e.rankByEvents = idx + 1;
      });

      // Return sorted by waste by default
      console.log('[NGOLeaderboard] computed entries:', entries.length, 'top NGO:', byWaste[0]?.ngoName, 'wasteKg:', byWaste[0]?.totalWasteKg);
      callback(byWaste);
    }, (error) => {
      console.error('Error listening to NGO leaderboard:', error);
      try {
        callback([]);
      } catch {}
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up NGO leaderboard listener:', error);
    throw error;
  }
}

export async function getEventsByIds(eventIds: string[]): Promise<Event[]> {
  if (!eventIds || eventIds.length === 0) {
    return [];
  }
  try {
    const eventsQuery = query(collection(db, 'events'), where(documentId(), 'in', eventIds));
    const querySnapshot = await getDocs(eventsQuery);
    const events: Event[] = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event);
    });
    return events;
  } catch (error) {
    console.error('Error fetching events by IDs:', error);
    return [];
  }
}

export async function getWasteLogsForUserByEvent(userId: string, eventId: string): Promise<WasteLog[]> {
  try {
    const wasteLogsQuery = query(
      collection(db, 'wasteLogs'),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(wasteLogsQuery);
    const wasteLogs: WasteLog[] = [];
    querySnapshot.forEach((doc) => {
      wasteLogs.push(doc.data() as WasteLog);
    });
    return wasteLogs;
  } catch (error) {
    console.error('Error fetching waste logs for user by event:', error);
    return [];
  }
}

export function getRealTimeLocatedUsers(
  callback: (users: any[]) => void,
  onError: (error: Error) => void
): () => void {
  // Use a single-field query and filter client-side to avoid
  // composite index requirements while indexes are building.
  const usersQuery = query(
    collection(db, 'users'),
    where('enableLiveLocation', '==', true)
  );
  if (!isRealtimeEnabled()) {
    let stopped = false;
    const fetchAndEmit = async () => {
      try {
        const snap = await getDocs(usersQuery);
        if (stopped) return;
        const users: any[] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const locatedUsers = users.filter((u) => {
          const loc = (u as any).location;
          return loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
        });
        callback(locatedUsers);
      } catch (error) {
        console.error("Error fetching user locations:", error);
        onError(error as Error);
      }
    };
    // Initial fetch and periodic polling
    fetchAndEmit();
    const interval = setInterval(fetchAndEmit, 15000);
    return () => { stopped = true; clearInterval(interval); };
  }

  const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
    const users: any[] = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    // Filter out users without a valid location object
    const locatedUsers = users.filter((u) => {
      const loc = (u as any).location;
      return loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
    });
    callback(locatedUsers);
  }, (error) => {
    console.error("Error fetching real-time user locations:", error);
    onError(error);
  });

  return unsubscribe;
}

export { auth, db, storage };