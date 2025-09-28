'use client';

import { AIFeaturesDashboard } from '@/components/admin/AIFeaturesDashboard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AIFeaturesPage() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p>Please log in to access AI features.</p>
        <Button asChild className="mt-4">
          <Link href="/login" prefetch={false}>Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Access Denied
          </CardTitle>
          <CardDescription>
            AI features are only available to administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You need admin privileges to access AI features. Contact your organization administrator for access.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <AIFeaturesDashboard />
    </div>
  );
}