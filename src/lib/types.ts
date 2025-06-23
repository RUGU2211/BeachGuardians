// Defines the core data structures used throughout the application.

// User role types
export type UserRole = 'volunteer' | 'admin';

// Represents a user's profile in Firestore.
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  points: number;
  avatarUrl: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  bio?: string;
  eventsAttended: string[]; // Array of event IDs
  
  // Fields for OTP verification
  otp?: string;
  otpExpires?: number;

  // Location tracking fields
  enableLiveLocation?: boolean;
  locationUpdateInterval?: string; // in minutes
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string; // ISO string
  };

  // NGO-specific fields (only for admin users)
  ngoName?: string;
  ngoType?: string;
  ngoRegistrationId?: string;
  ngoWebsite?: string;
  ngoPhone?: string;
  ngoAddress?: string;
  ngoDescription?: string;
}

// Represents a single cleanup event.
export interface Event {
  id: string;
  name:string;
  date: string; // ISO string
  time: string; // e.g., "10:00 AM - 2:00 PM"
  location: string;
  description: string;
  organizerId: string; // User UID of the admin/organizer
  organizerName: string;
  volunteers: string[]; // Array of user UIDs
  mapImageUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  wasteCollectedKg?: number;
  checkedInVolunteers?: Record<string, { checkInTime: string }>; // Maps UID to check-in time
}

// Represents an entry in the community leaderboard.
export interface LeaderboardEntry {
  volunteerId: string; // User UID
  name: string;
  email?: string; // Email for certificate applications
  avatarUrl?: string;
  points: number;
  rank: number;
}

// Represents a log of collected waste.
export interface WasteLog {
  id: string;
  type: string;
  weightKg: number;
  loggedBy: string; // User UID
  eventId: string;
  date: string; // ISO string
}

// Represents an achievement or badge a user can earn.
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name or URL
  dateEarned: string; // ISO string
}

// For AI Generated Content
export type SocialMediaPlatform = 'twitter' | 'facebook' | 'instagram';

export interface GeneratedSocialMediaPost {
  platform: SocialMediaPlatform;
  content: string;
  imageUrl?: string;
}

// This interface is redundant with UserProfile and can be removed
// to avoid confusion. If specific volunteer fields are needed,
// they should be added to UserProfile or a separate, non-overlapping interface.
/*
export interface Volunteer extends UserProfile {
  avatarUrl: string;
  contributions: Array<{ eventId: string; wasteLogged: number }>;
  achievements: string[];
}
*/
