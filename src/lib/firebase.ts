// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, arrayUnion, increment, onSnapshot, orderBy, limit, documentId } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { UserProfile, UserRole, Event, WasteLog, LeaderboardEntry } from "./types";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuB9kWfs_pn3HfnlG56i9des0D0Xjmp-s",
  authDomain: "shoreline-tzs9g.firebaseapp.com",
  projectId: "shoreline-tzs9g",
  storageBucket: "shoreline-tzs9g.appspot.com", // Corrected common typo: firebasestorage.app -> .appspot.com
  messagingSenderId: "44056276742",
  appId: "1:44056276742:web:d0cfd815558a3be19af887"
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
const db = getFirestore(app);
const storage = getStorage(app);

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
  userData: CreateUserProfileData
): Promise<void> {
  const { uid, role, ...restData } = userData;

  // Admins start as unverified, volunteers are auto-verified.
  const isVerified = role === 'volunteer';

  const userProfile: UserProfile = {
    ...restData,
    uid,
    role,
    isVerified,
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
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function getUsersByIds(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) {
    return [];
  }
  try {
    const usersQuery = query(collection(db, 'users'), where('uid', 'in', uids));
    const querySnapshot = await getDocs(usersQuery);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
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
  await updateUserProfile(uid, { 
    isAdminVerified: true,
    adminVerifiedAt: new Date().toISOString()
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
    const docRef = await addDoc(collection(db, 'events'), newEvent);
    await updateDoc(docRef, { id: docRef.id });
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
    querySnapshot.forEach((doc) => {
      const eventData = doc.data() as Event;
      events.push({
        ...eventData,
        id: doc.id, // Use the document ID as the event ID
      });
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
      return {
        ...eventData,
        id: eventDoc.id,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return null;
  }
}

export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
  try {
    await updateDoc(doc(db, 'events', eventId), updates);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

export async function joinEvent(eventId: string, userId: string): Promise<void> {
  try {
    // Add user to event's volunteer list
    await updateDoc(doc(db, 'events', eventId), {
      volunteers: arrayUnion(userId)
    });

    // Add event to user's attendedEvents list
    await updateDoc(doc(db, 'users', userId), {
      eventsAttended: arrayUnion(eventId)
    });
  } catch (error) {
    console.error('Error joining event:', error);
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
    
    // 1. Create a new WasteLog document
    const wasteLog: WasteLog = {
      ...wasteData,
      id: '', // Firestore will generate
      eventId: eventId,
      loggedBy: user.uid,
      date: new Date().toISOString(),
    };
    const wasteLogRef = await addDoc(collection(db, 'wasteLogs'), wasteLog);
    await updateDoc(wasteLogRef, { id: wasteLogRef.id });

    // 2. Update the total waste collected for the event
    await updateDoc(doc(db, 'events', eventId), {
      wasteCollectedKg: increment(wasteData.weightKg)
    });

    // 3. Add points to the user (e.g., 10 points per kg)
    const pointsToAdd = Math.round(wasteData.weightKg * 10);
    await addPointsToUser(user.uid, pointsToAdd);

  } catch (error) {
    console.error(`Error logging waste for event ${eventId}:`, error);
    throw error;
  }
}

// Real-time leaderboard functions
export async function getRealTimeLeaderboard(callback: (leaderboard: LeaderboardEntry[]) => void): Promise<() => void> {
  try {
    // Query all users, ordered by points descending
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(50) // Limit to top 50 users for performance
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
      const leaderboard: LeaderboardEntry[] = [];
      
      querySnapshot.forEach((doc, index) => {
        const userData = doc.data() as UserProfile;
        leaderboard.push({
          volunteerId: userData.uid,
          name: userData.fullName,
          email: userData.email,
          avatarUrl: userData.avatarUrl,
          points: userData.points || 0,
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
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('points', 'desc')
    );
    
    const querySnapshot = await getDocs(usersQuery);
    let rank = 0;
    
    for (const doc of querySnapshot.docs) {
      rank++;
      const userData = doc.data() as UserProfile;
      if (userData.uid === userId) {
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
export async function getTopUsers(limit: number = 3): Promise<LeaderboardEntry[]> {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    const topUsers: LeaderboardEntry[] = [];
    
    querySnapshot.forEach((doc, index) => {
      const userData = doc.data() as UserProfile;
      topUsers.push({
        volunteerId: userData.uid,
        name: userData.fullName,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
        points: userData.points || 0,
        rank: index + 1,
      });
    });
    
    return topUsers;
  } catch (error) {
    console.error('Error getting top users:', error);
    return [];
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
  const usersQuery = query(
    collection(db, 'users'),
    where('location', '!=', null)
  );

  const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
    const users: any[] = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    callback(users);
  }, (error) => {
    console.error("Error fetching real-time user locations:", error);
    onError(error);
  });

  return unsubscribe;
}

export { auth, db, storage };
