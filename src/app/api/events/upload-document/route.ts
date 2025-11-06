import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getOrInitializeAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

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
      // In development, allow fallback if Admin SDK is not configured
      if (process.env.NODE_ENV === 'development' && !process.env.ADMIN_KEY) {
        console.warn('Admin SDK not configured, skipping token verification in development');
        // For development, use a placeholder UID
        uid = 'dev-user';
      } else {
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Use Admin SDK for server-side storage upload
    let adminApp: admin.app.App;
    try {
      adminApp = getOrInitializeAdminApp();
    } catch (error: any) {
      // In development without Admin SDK, use client SDK as fallback
      if (process.env.NODE_ENV === 'development' && !process.env.ADMIN_KEY) {
        console.warn('Admin SDK not configured, using client SDK fallback');
        return await uploadWithClientSDK(file, uid);
      }
      throw new Error('Firebase Admin SDK is not initialized');
    }

    // Check if Admin SDK has storage configured
    if (!adminApp.storage) {
      console.warn('Admin SDK storage not available, using client SDK fallback');
      return await uploadWithClientSDK(file, uid);
    }

    // Get Admin Storage - use default bucket from app config
    const adminStorage = adminApp.storage();
    
    // Try to get the default bucket (from app config) or use explicit bucket name
    let bucket;
    try {
      // First, try to get the default bucket (from app initialization)
      bucket = adminStorage.bucket();
      
      // Verify bucket exists and is accessible
      try {
        const [exists] = await bucket.exists();
        if (!exists) {
          // If default bucket doesn't exist, try with explicit bucket name
          const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'shoreline-tzs9g-47d06.firebasestorage.app';
          console.warn(`Default bucket not found, trying explicit bucket: ${bucketName}`);
          bucket = adminStorage.bucket(bucketName);
          
          const [bucketExists] = await bucket.exists();
          if (!bucketExists) {
            // Bucket doesn't exist, fallback to client SDK
            console.warn('Storage bucket does not exist, falling back to client SDK');
            return await uploadWithClientSDK(file, uid);
          }
        }
      } catch (checkError: any) {
        // If bucket check fails (404, etc.), fallback to client SDK
        if (checkError.code === 404 || checkError.message?.includes('not found') || checkError.message?.includes('does not exist')) {
          console.warn('Bucket check failed (bucket may not exist), falling back to client SDK:', checkError.message);
          return await uploadWithClientSDK(file, uid);
        }
        // For other errors, try to continue - upload will fail with clearer error
        console.warn('Bucket existence check failed, continuing with upload attempt:', checkError.message);
      }
    } catch (storageError: any) {
      throw new Error(`Failed to initialize storage: ${storageError.message}. Please ensure Firebase Storage is enabled in your project.`);
    }
    
    // Upload to Firebase Storage using Admin SDK
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `event-documents/${uid}/${timestamp}-${sanitizedFileName}`;
    
    try {
      // Convert File to Buffer for Admin SDK
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Upload file to bucket
      const fileRef = bucket.file(fileName);
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedBy: uid,
            uploadedAt: new Date().toISOString(),
          },
        },
      });
      
      // Try to make file publicly accessible, fallback to signed URL
      let downloadURL: string;
      try {
        await fileRef.makePublic();
        // Get public URL
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
      });
    } catch (uploadError: any) {
      console.error('Storage upload error:', uploadError);
      
      // Handle specific error codes
      if (uploadError.code === 404 || uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
        // If bucket doesn't exist, fallback to client SDK
        console.warn('Storage bucket not found, falling back to client SDK');
        try {
          return await uploadWithClientSDK(file, uid);
        } catch (clientError: any) {
          throw new Error('Storage bucket not found. Please enable Firebase Storage in your Firebase Console and ensure the bucket exists.');
        }
      }
      if (uploadError.code === 403 || uploadError.message?.includes('permission')) {
        // If permission denied, try client SDK as fallback
        console.warn('Storage permission denied with Admin SDK, trying client SDK fallback');
        try {
          return await uploadWithClientSDK(file, uid);
        } catch (clientError: any) {
          throw new Error('Storage permission denied. Please check Firebase Storage rules.');
        }
      }
      throw uploadError;
    }

  } catch (error: any) {
    console.error('Error uploading document:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload document';
    let statusCode = 500;
    
    if (error.message?.includes('Storage bucket not found') || error.code === 404) {
      errorMessage = 'Storage bucket not found. Please check Firebase Storage configuration.';
      statusCode = 404;
    } else if (error.message?.includes('Storage permission denied') || error.code === 403) {
      errorMessage = 'Storage permission denied. Please check Firebase Storage rules.';
      statusCode = 403;
    } else if (error.message?.includes('not initialized')) {
      errorMessage = 'Storage service is not configured. Please check Firebase configuration.';
      statusCode = 503;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.code || 'storage/unknown',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    );
  }
}

// Fallback function using client SDK (for development without Admin SDK)
async function uploadWithClientSDK(file: File, uid: string): Promise<NextResponse> {
  try {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('@/lib/firebase');
    
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `event-documents/${uid}/${timestamp}-${sanitizedFileName}`;
    const storageRef = ref(storage, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return NextResponse.json({
      success: true,
      url: downloadURL,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Client SDK upload error:', error);
    throw error;
  }
}

