'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface VerificationPhotoUploadProps {
  eventId: string;
  onPhotoUploaded: (photoUrl: string, photoHash: string) => void;
  onCancel?: () => void;
}

export function VerificationPhotoUpload({ eventId, onPhotoUploaded, onCancel }: VerificationPhotoUploadProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (JPEG, PNG, or WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCapturePhoto = () => {
    // Request camera access
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Create canvas to capture photo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Show camera preview in a modal or overlay
          // For now, we'll use the file input with capture attribute
          fileInputRef.current?.click();
          stream.getTracks().forEach(track => track.stop());
        });
      })
      .catch((error) => {
        console.error('Error accessing camera:', error);
        toast({
          title: 'Camera Access Denied',
          description: 'Please allow camera access or upload a photo manually',
          variant: 'destructive',
        });
      });
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No Photo Selected',
        description: 'Please select a photo to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get location if available
      let locationData: { latitude: number; longitude: number } | null = null;
      try {
        locationData = await getLocation();
        setLocation(locationData);
      } catch (error) {
        console.warn('Could not get location:', error);
        // Continue without location
      }

      // Get auth token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();

      // Upload photo
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('eventId', eventId);

      const response = await fetch('/api/volunteer-verification/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      
      toast({
        title: 'Photo Uploaded Successfully',
        description: 'Your verification photo has been uploaded and is pending admin approval.',
      });

      onPhotoUploaded(data.url, data.photoHash);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Verification Photo Required</h3>
        <p className="text-sm text-muted-foreground">
          Please upload a photo to verify your presence at this event. This photo will be reviewed by the event admin before you can log waste.
        </p>
      </div>

      {!previewUrl ? (
        <div className="space-y-4">
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Choose Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCapturePhoto}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full aspect-square max-w-md mx-auto rounded-lg overflow-hidden border-2 border-dashed border-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {location && (
        <p className="text-xs text-muted-foreground text-center">
          Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </p>
      )}
    </div>
  );
}

