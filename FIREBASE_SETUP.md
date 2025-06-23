# Firebase Setup Guide

## Firebase Security Rules Deployment

To fix the "Missing or insufficient permissions" error, you need to deploy the Firestore security rules to your Firebase project.

### Prerequisites

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

### Deploy Security Rules

1. Initialize Firebase in your project (if not already done):
```bash
firebase init firestore
```

2. Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

### Security Rules Overview

The security rules in `firestore.rules` provide the following permissions:

- **Users Collection**: Users can read/write their own profiles, admins can read all profiles
- **Events Collection**: Anyone can read events, authenticated users can create events, organizers and admins can update/delete events
- **Waste Logs Collection**: Authenticated users can read/create logs, users can update/delete their own logs, admins can delete any logs

### Manual Verification Process

For NGO admin accounts:
1. Admin signs up with NGO information
2. Account is created with `isVerified: false`
3. Existing admins can verify new admin accounts through the User Management page
4. Once verified, new admins get access to admin features

### Firebase Configuration Files

- `firebase.json` - Main Firebase configuration
- `firestore.rules` - Security rules for Firestore
- `firestore.indexes.json` - Database indexes for better performance

### Troubleshooting

If you still get permission errors after deploying rules:

1. Check that the rules are deployed correctly:
```bash
firebase firestore:rules:get
```

2. Verify your Firebase project ID in `src/lib/firebase.ts` matches your actual project

3. Clear browser cache and try again

4. Check Firebase Console > Firestore > Rules to ensure rules are active 