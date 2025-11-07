import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getOrInitializeAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify token using Admin SDK
    let uid: string;
    try {
      const adminAuth = getAdminAuth();
      const decodedToken = await adminAuth.verifyIdToken(token);
      uid = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventId = formData.get('eventId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only image files (JPEG, PNG, WebP) are allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB for Google Drive)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Generate file hash for duplicate detection
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Google Drive folder link for reference (files uploaded to Firebase Storage)
    // You can manually move files from Firebase Storage to this Google Drive folder if needed
    const DRIVE_FOLDER_LINK = 'https://drive.google.com/drive/folders/1XJHcQU86zZ9zMyeAxLeFoTZjvGGRRaN8?usp=sharing';

    // Use Firebase Storage (works with service accounts, no quota issues)
    let adminApp: admin.app.App;
    try {
      adminApp = getOrInitializeAdminApp();
    } catch (error: any) {
      console.error('Failed to initialize Admin SDK:', error);
      return NextResponse.json({ 
        error: 'Storage service is not configured',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 503 });
    }

    const storage = admin.storage(adminApp);
    let bucket = storage.bucket();

    // Try to get bucket from config or environment
    if (!bucket) {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || adminApp.options.storageBucket;
      if (bucketName) {
        bucket = storage.bucket(bucketName);
      }
    }

    if (!bucket) {
      throw new Error('Storage bucket not found');
    }

    // Upload file to Firebase Storage
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `volunteer-verifications/${eventId}/${uid}/${timestamp}-${sanitizedFileName}`;
    
    try {
      const fileRef = bucket.file(fileName);
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedBy: uid,
            eventId: eventId,
            uploadedAt: new Date().toISOString(),
            photoHash: hash,
            driveFolderLink: DRIVE_FOLDER_LINK, // Store Drive folder link in metadata for reference
          },
        },
      });
      
      // Try to make file publicly accessible, fallback to signed URL
      let downloadURL: string;
      try {
        await fileRef.makePublic();
        downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (publicError: any) {
        // If making public fails, generate a signed URL (valid for 1 year)
        console.warn('Could not make file public, using signed URL:', publicError);
        const [url] = await fileRef.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        downloadURL = url;
      }
      
      return NextResponse.json({
        success: true,
        url: downloadURL,
        fileName: file.name,
        photoHash: hash,
        driveFolderLink: DRIVE_FOLDER_LINK, // Return Drive folder link for reference
      });
    } catch (uploadError: any) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

  } catch (error: any) {
    console.error('Error uploading verification photo:', error);
    
    let errorMessage = 'Failed to upload verification photo';
    let statusCode = 500;
    let helpMessage = '';
    
    // Check for specific Firebase Storage errors
    if (error.message?.includes('Storage bucket not found') || error.code === 404) {
      errorMessage = 'Storage bucket not found. Please check Firebase Storage configuration.';
      statusCode = 404;
      helpMessage = 'Verify FIREBASE_STORAGE_BUCKET is set correctly in your environment variables.';
    } else if (error.message?.includes('Storage permission denied') || error.code === 403) {
      errorMessage = 'Storage permission denied. Please check Firebase Storage rules.';
      statusCode = 403;
      helpMessage = 'Check Firebase Storage security rules and ensure the service account has write permissions.';
    } else if (error.message?.includes('not initialized')) {
      errorMessage = 'Storage service is not configured. Please check Firebase configuration.';
      statusCode = 503;
      helpMessage = 'Make sure ADMIN_KEY or GOOGLE_APPLICATION_CREDENTIALS is set correctly.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      code: error.code || 'storage/unknown',
      help: helpMessage || undefined,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: statusCode });
  }
}

