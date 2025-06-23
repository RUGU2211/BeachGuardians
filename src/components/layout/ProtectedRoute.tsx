'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireVerification?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireVerification = false 
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Check if user profile exists
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Profile Setup Required</span>
            </CardTitle>
            <CardDescription>
              Please complete your profile setup to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              It looks like your profile hasn't been set up yet. Please contact support for assistance.
            </div>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5 text-red-500" />
              <span>Admin Access Required</span>
            </CardTitle>
            <CardDescription>
              This page is only accessible to admin users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Badge variant="outline">
                <Shield className="w-3 h-3 mr-1" />
                Admin Only
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Your current role: <strong>{userProfile.role}</strong>
            </div>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check verification requirement
  if (requireVerification && !userProfile.isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Account Verification Required</span>
            </CardTitle>
            <CardDescription>
              Your account is pending verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Badge variant="secondary">
                <Shield className="w-3 h-3 mr-1" />
                Pending Verification
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {userProfile.role === 'admin' 
                ? "Your admin account is being reviewed. You'll receive access to admin features once verified."
                : "Your account is being reviewed. You'll receive access to all features once verified."
              }
            </div>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
} 