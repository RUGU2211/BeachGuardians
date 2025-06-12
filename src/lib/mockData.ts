import type { Event, Volunteer, WasteLog, Achievement, LeaderboardEntry } from './types';

export const mockAchievements: Achievement[] = [
  { id: 'ach1', name: 'First Cleanup', description: 'Participated in your first cleanup event.', icon: 'Sparkles', dateEarned: '2023-05-10' },
  { id: 'ach2', name: 'Recycling Hero', description: 'Collected over 10kg of recyclables.', icon: 'Recycle', dateEarned: '2023-06-15' },
  { id: 'ach3', name: 'Beach Guardian', description: 'Attended 5 beach cleanup events.', icon: 'Waves', dateEarned: '2023-08-20' },
];

export const mockVolunteers: Volunteer[] = [
  {
    id: 'vol1',
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    avatarUrl: 'https://placehold.co/100x100.png',
    points: 1250,
    contributions: [
      { eventId: 'evt1', eventName: 'Beach Cleanup Day', date: '2023-07-15', wasteLogged: [{ id: 'wl1', type: 'Plastic Bottles', weightKg: 5, loggedBy: 'vol1', eventId: 'evt1', date: '2023-07-15' }] },
      { eventId: 'evt2', eventName: 'Park Restoration', date: '2023-08-05', wasteLogged: [{ id: 'wl2', type: 'General Waste', weightKg: 3, loggedBy: 'vol1', eventId: 'evt2', date: '2023-08-05' }] },
    ],
    achievements: [mockAchievements[0], mockAchievements[1]],
  },
  {
    id: 'vol2',
    name: 'Bob The Builder',
    email: 'bob@example.com',
    avatarUrl: 'https://placehold.co/100x100.png',
    points: 980,
    contributions: [
      { eventId: 'evt1', eventName: 'Beach Cleanup Day', date: '2023-07-15', wasteLogged: [{ id: 'wl3', type: 'Plastic Bags', weightKg: 2, loggedBy: 'vol2', eventId: 'evt1', date: '2023-07-15' }] },
    ],
    achievements: [mockAchievements[0]],
  },
  {
    id: 'vol3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    points: 1500,
    contributions: [
      { eventId: 'evt1', eventName: 'Beach Cleanup Day', date: '2023-07-15', wasteLogged: [] },
      { eventId: 'evt2', eventName: 'Park Restoration', date: '2023-08-05', wasteLogged: [] },
      { eventId: 'evt3', eventName: 'River Bank Cleanup', date: '2023-09-10', wasteLogged: [] },
    ],
    achievements: mockAchievements,
  },
];

export const mockEvents: Event[] = [
  {
    id: 'evt1',
    name: 'Annual Beach Cleanup Day',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    time: '9:00 AM - 12:00 PM',
    location: 'Sunnyvale Beach, Main Entrance',
    description: 'Join us for our biggest cleanup event of the year! Help us keep Sunnyvale Beach pristine. Gloves and bags will be provided.',
    organizer: 'Shoreline Foundation',
    volunteers: ['vol1', 'vol2', 'vol3'],
    mapImageUrl: 'https://placehold.co/600x400.png',
    status: 'upcoming',
    wasteCollectedKg: 0,
  },
  {
    id: 'evt2',
    name: 'Riverside Park Restoration',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    time: '10:00 AM - 1:00 PM',
    location: 'Riverside Park, Near the Old Oak Tree',
    description: 'Help remove invasive species and plant native trees in Riverside Park. A great way to contribute to local biodiversity.',
    organizer: 'Friends of Riverside Park',
    volunteers: ['vol1', 'vol3'],
    mapImageUrl: 'https://placehold.co/600x400.png',
    status: 'upcoming',
    wasteCollectedKg: 0,
  },
  {
    id: 'evt3',
    name: 'Community Garden Weeding',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    time: '2:00 PM - 4:00 PM',
    location: 'GreenThumb Community Garden',
    description: 'Help us prepare the community garden for the new planting season. All ages welcome!',
    organizer: 'GreenThumb Gardeners',
    volunteers: ['vol2'],
    status: 'completed',
    wasteCollectedKg: 25,
  },
];

export const mockWasteLogs: WasteLog[] = [
  { id: 'wl1', type: 'Plastic Bottles', weightKg: 5, loggedBy: 'vol1', eventId: 'evt1', date: '2023-07-15' },
  { id: 'wl2', type: 'General Waste', weightKg: 3, loggedBy: 'vol1', eventId: 'evt2', date: '2023-08-05' },
  { id: 'wl3', type: 'Plastic Bags', weightKg: 2, loggedBy: 'vol2', eventId: 'evt1', date: '2023-07-15' },
  { id: 'wl4', type: 'Glass Bottles', weightKg: 7, loggedBy: 'vol3', eventId: 'evt3', date: '2023-09-10' },
  { id: 'wl5', type: 'Cigarette Butts', weightKg: 0.5, loggedBy: 'vol1', eventId: 'evt1', date: '2023-07-15' },
];

export const mockLeaderboard: LeaderboardEntry[] = mockVolunteers
  .map(v => ({
    volunteerId: v.id,
    name: v.name,
    avatarUrl: v.avatarUrl,
    points: v.points,
    rank: 0, // Placeholder, will be calculated
  }))
  .sort((a, b) => b.points - a.points)
  .map((entry, index) => ({ ...entry, rank: index + 1 }));

export const getVolunteerById = (id: string): Volunteer | undefined => mockVolunteers.find(v => v.id === id);
export const getEventById = (id: string): Event | undefined => mockEvents.find(e => e.id === id);
