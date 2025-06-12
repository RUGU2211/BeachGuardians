export interface Volunteer {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  contributions: Contribution[];
  achievements: Achievement[];
  points: number;
}

export interface Contribution {
  eventId: string;
  eventName: string;
  date: string;
  wasteLogged: WasteLog[];
}

export interface WasteLog {
  id: string;
  type: string;
  weightKg: number;
  loggedBy: string; // volunteerId
  eventId: string;
  date: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name or URL
  dateEarned: string;
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO string
  time: string; // e.g., "10:00 AM - 2:00 PM"
  location: string;
  description: string;
  organizer: string; // Could be volunteerId or org name
  volunteers: string[]; // Array of volunteerIds
  mapImageUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  wasteCollectedKg?: number; // Total waste collected for the event
}

export interface LeaderboardEntry {
  volunteerId: string;
  name: string;
  avatarUrl?: string;
  points: number;
  rank: number;
}

// For AI Generated Content
export type SocialMediaPlatform = 'twitter' | 'facebook' | 'instagram';

export interface GeneratedSocialMediaPost {
  platform: SocialMediaPlatform;
  content: string;
  imageUrl?: string; // Optional URL for a generated flier/image
}
