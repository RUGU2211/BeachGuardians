'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';

interface AdminVerificationProps {
    userProfile: UserProfile;
}

export function AdminVerification({ userProfile }: AdminVerificationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendVerificationEmail = async () => {
    if (!user || !userProfile) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.email, uid: user.uid }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      toast({
        title: 'Email Sent!',
        description: 'A verification code has been sent to your email.',
      });
      setEmailSent(true);
    } catch (error: any) {
      toast({
        title: 'Error sending code',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!user || !otp) return;
    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, otp }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast({
        title: 'Success!',
        description: 'Your admin account has been verified.',
      });
      
      // Refresh the user profile data and page
      // Note: A full page reload might be needed if AuthContext doesn't auto-update
      router.refresh();

    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md shadow-sm">
      <div className="flex">
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-800 font-semibold">
            Verify Your Admin Account
          </p>
          <div className="mt-2 text-sm text-yellow-700">
            {!emailSent ? (
              <>
                <p>To access all admin features, you need to verify your email address.</p>
                <Button
                  onClick={handleSendVerificationEmail}
                  disabled={isLoading}
                  className="mt-3"
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Verification Code
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p>Enter the 6-digit code we sent to your email address.</p>
                <div className="flex items-center space-x-2">
                  <Input 
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    placeholder="123456"
                    className="w-36"
                    aria-label="OTP Input"
                  />
                  <Button onClick={handleVerifyOtp} disabled={isVerifying || otp.length !== 6}>
                    {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                </div>
                 <Button variant="link" size="sm" className="p-0 h-auto text-yellow-800" onClick={handleSendVerificationEmail} disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Resend Code'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 