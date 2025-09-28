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
  isAdminVerified?: boolean; // For admin users only
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

// Event categories for filtering
export type EventCategory = 'beach_cleanup' | 'river_cleanup' | 'park_cleanup' | 'street_cleanup' | 'awareness_campaign' | 'tree_planting' | 'recycling_drive' | 'educational_workshop';

// Represents a single cleanup event.
export interface Event {
  id: string;
  name:string;
  startDate: string; // ISO string - event start date and time
  endDate: string; // ISO string - event end date and time
  date: string; // ISO string - kept for backward compatibility
  time: string; // e.g., "10:00 AM - 2:00 PM" - kept for backward compatibility
  location: string;
  // Flat fields for easier querying and interoperability
  event_location?: string; // Full formatted address (duplicate of locationDetails.address)
  latitude?: number;
  longitude?: number;
  description: string;
  category: EventCategory; // Event category for filtering
  organizerId: string; // User UID of the admin/organizer
  organizerName: string;
  volunteers: string[]; // Array of user UIDs
  mapImageUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  wasteCollectedKg?: number;
  checkedInVolunteers?: Record<string, { checkInTime: string }>; // Maps UID to check-in time
  
  // Enhanced location fields
  locationDetails?: {
    address: string; // Full formatted address
    coordinates: {
      latitude: number;
      longitude: number;
    };
    placeId?: string; // Google Places ID for enhanced functionality
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
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

// Represents an entry in the NGO leaderboard.
export interface NgoLeaderboardEntry {
  ngoId: string; // Admin user UID
  ngoName: string;
  organizerName?: string;
  avatarUrl?: string;
  totalWasteKg: number;
  eventsCount: number;
  rankByWaste: number;
  rankByEvents: number;
}

// Represents a log of collected waste.
export interface WasteLog {
  id: string;
  type: string;
  weightKg: number;
  loggedBy: string; // User UID
  userId?: string; // Duplicate of loggedBy for rules-compliant queries
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

// Event filtering types
export interface EventFilters {
  category?: EventCategory | 'all';
  status?: Event['status'] | 'all';
  dateRange?: {
    start: string; // ISO string
    end: string; // ISO string
  };
  location?: string; // City, state, or search term
  organizer?: string; // NGO name or organizer name
  searchQuery?: string; // General search across name, description
}

export interface EventSortOptions {
  field: 'startDate' | 'endDate' | 'name' | 'location' | 'organizerName';
  direction: 'asc' | 'desc';
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
