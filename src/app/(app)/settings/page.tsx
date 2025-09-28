'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, User, Bell, MapPin, Navigation } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { locationService } from '@/lib/location-service';

const settingsFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  enableEmailNotifications: z.boolean().default(false),
  theme: z.string().default('light'),
  enableLiveLocation: z.boolean().default(false),
  locationUpdateInterval: z.string().default('5'),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [liveUserProfile, setLiveUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      bio: '',
      enableEmailNotifications: false,
      theme: 'light',
      enableLiveLocation: false,
      locationUpdateInterval: '5',
    },
  });

  // Profile loading: gate realtime in dev unless explicitly enabled
  useEffect(() => {
    const enableRealtime = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    if (!enableRealtime) {
      // One-off fetch when realtime disabled
      (async () => {
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const userData = snap.data() as UserProfile;
            setLiveUserProfile(userData);
            form.reset({
              fullName: userData.fullName || '',
              email: userData.email || '',
              bio: userData.bio || '',
              enableEmailNotifications: false,
              theme: localStorage.getItem('theme') || 'light',
              enableLiveLocation: userData.enableLiveLocation || false,
              locationUpdateInterval: userData.locationUpdateInterval || '5',
            });
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    // Realtime listener when enabled
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as UserProfile;
        setLiveUserProfile(userData);
        form.reset({
          fullName: userData.fullName || '',
          email: userData.email || '',
          bio: userData.bio || '',
          enableEmailNotifications: false,
          theme: localStorage.getItem('theme') || 'light',
          enableLiveLocation: userData.enableLiveLocation || false,
          locationUpdateInterval: userData.locationUpdateInterval || '5',
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to user profile:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, form]);

  const currentTheme = form.watch('theme');

  // Effect to apply theme to document and save to localStorage
  useEffect(() => {
    if (currentTheme) { 
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [currentTheme]);

  const onSubmit = async (data: SettingsFormValues) => {
    if (!user?.uid || !liveUserProfile) {
      toast({
        title: "Error",
        description: "User not found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Handle location tracking
      if (data.enableLiveLocation) {
        const hasPermission = await locationService.requestPermission();
        if (!hasPermission) {
          toast({
            title: "Location Permission Required",
            description: "Please allow location access to enable live tracking.",
            variant: "destructive",
          });
          return;
        }

        const trackingStarted = await locationService.startTracking(
          user.uid,
          data.locationUpdateInterval
        );

        if (!trackingStarted) {
          toast({
            title: "Location Tracking Failed",
            description: "Could not start location tracking. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Stop location tracking if disabled
        locationService.stopTracking();
      }

      // Update user profile in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        fullName: data.fullName,
        bio: data.bio || '',
        updatedAt: new Date().toISOString(),
        enableLiveLocation: data.enableLiveLocation,
        locationUpdateInterval: data.locationUpdateInterval,
      });

      toast({
        title: "Settings Saved!",
        description: data.enableLiveLocation 
          ? "Your profile has been updated and location tracking is now active."
          : "Your profile has been updated and location tracking has been disabled.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile || !liveUserProfile) {
    return (
      <div className="text-center py-10">
        <p>Could not load user information. Please try logging in again.</p>
        <Button asChild className="mt-4">
          <Link href="/login" prefetch={false}>Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><User className="mr-2 h-6 w-6 text-primary"/> Profile Information</CardTitle>
          <CardDescription>Manage your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input placeholder="your@email.com" {...field} readOnly className="bg-muted/50 cursor-not-allowed" /></FormControl>
                    <FormDescription>Your email address is not editable here.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl><Input placeholder="Tell us about yourself" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card className="mt-8 pt-6">
                <CardHeader className="pt-0">
                  <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-6 w-6 text-primary"/> Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent>
                   <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => ( // field.value will be initialized by defaultValues or form.reset
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value} // Use value, it's controlled by RHF
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose your preferred interface theme.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card className="mt-8 pt-6">
                 <CardHeader className="pt-0">
                    <CardTitle className="font-headline flex items-center"><Bell className="mr-2 h-6 w-6 text-primary"/> Notifications</CardTitle>
                    <CardDescription>Manage how you receive updates from BeachGuardians.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="enableEmailNotifications"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                                Receive emails about new events and important updates.
                            </FormDescription>
                            </div>
                            <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                </CardContent>
              </Card>

              <Card className="mt-8 pt-6">
                <CardHeader className="pt-0">
                  <CardTitle className="font-headline flex items-center"><MapPin className="mr-2 h-6 w-6 text-primary"/> Location Settings</CardTitle>
                  <CardDescription>Manage your location sharing preferences for real-time tracking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableLiveLocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Live Location Sharing</FormLabel>
                          <FormDescription>
                            Allow BeachGuardians to track your location during cleanup events for real-time coordination.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('enableLiveLocation') && (
                    <FormField
                      control={form.control}
                      name="locationUpdateInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Update Interval</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select update interval" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Every 1 minute</SelectItem>
                              <SelectItem value="5">Every 5 minutes</SelectItem>
                              <SelectItem value="10">Every 10 minutes</SelectItem>
                              <SelectItem value="15">Every 15 minutes</SelectItem>
                              <SelectItem value="30">Every 30 minutes</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How often your location should be updated when participating in events.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Button type="submit" disabled={isLoading} size="lg" className="mt-8">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
