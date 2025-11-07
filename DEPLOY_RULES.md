# Deploy Firestore Security Rules

## Quick Deploy

To fix the "Missing or insufficient permissions" error, deploy the updated Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

## What Was Fixed

The security rules have been updated to allow:

1. **Filtered Queries on Users Collection**: 
   - Non-admin users can now run filtered queries (e.g., `where('role', '==', 'volunteer')`)
   - Each document in the result is still checked against the `allow read` rule
   - Unfiltered queries still require admin permissions

2. **Filtered Queries on Waste Logs**:
   - Users can query their own waste logs using `where('userId', '==', uid)`
   - The `allow read` rule ensures users can only see their own logs
   - Admins can still query all waste logs

## Key Changes

- Moved `allow read` before `allow list` in users and wasteLogs collections
- `allow read` handles both individual document reads and filtered queries
- `allow list` only restricts unfiltered collection-wide queries (admin-only)

## Verification

After deploying, verify the rules are active:

```bash
firebase firestore:rules:get
```

Or check in Firebase Console: Firestore Database > Rules

## Troubleshooting

If you still get permission errors:

1. Make sure you're logged in: `firebase login`
2. Verify your project: `firebase projects:list`
3. Set the correct project: `firebase use <project-id>`
4. Deploy again: `firebase deploy --only firestore:rules`
5. Wait a few seconds for rules to propagate
6. Clear browser cache and refresh

## Testing

After deployment, test these operations:
- Non-admin users should be able to query their own waste logs
- Non-admin users should be able to query users with filters (e.g., for live location)
- Admins should be able to query all collections without filters

