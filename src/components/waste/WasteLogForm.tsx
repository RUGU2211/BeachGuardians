'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { logWasteForEvent, getAllEvents, checkUserRegistration, checkVolunteerVerification, createVolunteerVerification, getVolunteerVerification } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import type { Event } from '@/lib/types';
import { Loader2, CheckCircle, Clock, XCircle, AlertCircle, Upload, FileCheck } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const wasteLogFormSchema = z.object({
  eventId: z.string({ required_error: 'Please select an event.' }),
  wasteType: z.string().min(1, { message: 'Please select a waste type.' }),
  otherWasteType: z.string().optional(),
  weightKg: z.coerce.number().min(0.1, { message: 'Weight must be at least 0.1 kg.' }),
  adminName: z.string().min(2, { message: 'Admin name must be at least 2 characters.' }).optional(),
  driveLink: z.string().url({ message: 'Please enter a valid Google Drive link.' }).optional(),
}).refine(data => {
  if (data.wasteType === 'Other' && (!data.otherWasteType || data.otherWasteType.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Please specify the type of waste if "Other" is selected.',
  path: ['otherWasteType'],
}).refine(data => {
  // For volunteers, Drive link is required
  // We'll check this in the component based on user role
  return true;
}, {
  message: 'Please provide a Google Drive link to your waste collection photos/videos.',
  path: ['driveLink'],
});

type WasteLogFormValues = z.infer<typeof wasteLogFormSchema>;

const wasteTypes = ['Plastic Bottles', 'Plastic Bags', 'Glass', 'Metal Cans', 'Paper/Cardboard', 'Cigarette Butts', 'Fishing Gear', 'General Litter', 'Other'];

export function WasteLogForm() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisteredForSelected, setIsRegisteredForSelected] = useState<boolean | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      const allEvents = await getAllEvents();
      console.log('All events fetched:', allEvents);
      // Filter for events that are not cancelled
      const filteredEvents = allEvents.filter(event => event.status !== 'cancelled');
      console.log('Filtered events:', filteredEvents);
      setActiveEvents(filteredEvents);
    }
    fetchEvents();
  }, []);
  
  const form = useForm<WasteLogFormValues>({
    resolver: zodResolver(wasteLogFormSchema),
    defaultValues: {
      eventId: '',
      wasteType: '',
      otherWasteType: '',
      weightKg: 0.1,
      adminName: '',
      driveLink: '',
    },
    mode: 'onChange',
  });

  const selectedWasteType = form.watch('wasteType');
  const selectedEventId = form.watch('eventId');

  useEffect(() => {
    async function checkRegistration() {
      if (!userProfile || !selectedEventId) {
        setIsRegisteredForSelected(null);
        setVerificationStatus(null);
        return;
      }
      const authUid = getAuth().currentUser?.uid || userProfile.uid;
      if (!authUid) {
        setIsRegisteredForSelected(null);
        setVerificationStatus(null);
        return;
      }
      const registered = await checkUserRegistration(selectedEventId, authUid);
      setIsRegisteredForSelected(registered);
      
      // Check verification status for volunteers
      if (userProfile.role === 'volunteer' && registered) {
        setVerificationLoading(true);
        try {
          const verification = await getVolunteerVerification(authUid, selectedEventId);
          if (verification) {
            setVerificationStatus(verification.status);
          } else {
            setVerificationStatus('none');
          }
        } catch (error) {
          console.error('Error checking verification:', error);
          setVerificationStatus(null);
        } finally {
          setVerificationLoading(false);
        }
      } else {
        setVerificationStatus(null);
      }
    }
    checkRegistration();
  }, [selectedEventId, userProfile?.uid, userProfile?.role]);

  // Separate function to submit verification only
  async function handleSubmitVerification() {
    if (!userProfile || !selectedEventId) {
      toast({ title: "Error", description: "Please select an event first.", variant: "destructive" });
      return;
    }

    const authUid = getAuth().currentUser?.uid || userProfile.uid;
    if (!authUid) {
      toast({ title: "Authentication Required", description: "Please log in again.", variant: "destructive" });
      return;
    }

    const driveLink = form.getValues('driveLink');
    if (!driveLink || driveLink.trim() === '') {
      toast({ 
        title: "Google Drive Link Required", 
        description: "Please provide a Google Drive link to your waste collection photos/videos.", 
        variant: 'destructive' 
      });
      return;
    }

    // Validate Google Drive link format
    const driveLinkPattern = /^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/|open\?id=)/;
    if (!driveLinkPattern.test(driveLink.trim())) {
      toast({ 
        title: "Invalid Drive Link", 
        description: "Please provide a valid Google Drive link (folder or file).", 
        variant: 'destructive' 
      });
      return;
    }

    // Check if there's already a pending verification
    const existingVerification = await getVolunteerVerification(authUid, selectedEventId);
    if (existingVerification && existingVerification.status === 'pending') {
      toast({ 
        title: "Verification Already Submitted", 
        description: "Your Google Drive link is already pending approval. Please wait for admin approval.", 
        variant: 'default' 
      });
      return;
    }

    setIsSubmittingVerification(true);
    try {
      // Get location if available
      let location: { latitude: number; longitude: number; timestamp: string } | undefined;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.warn('Could not get location:', error);
      }

      // Create verification with Drive link
      await createVolunteerVerification(authUid, selectedEventId, driveLink.trim(), undefined, location);
      
      // Update verification status
      setVerificationStatus('pending');
      
      toast({
        title: "Verification Submitted Successfully!",
        description: "Your Google Drive link has been sent to the admin for approval. You'll receive an email notification once approved.",
      });
    } catch (error) {
      console.error('Failed to submit verification:', error);
      toast({ 
        title: "Submission Failed", 
        description: "Could not submit verification. Please try again.", 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmittingVerification(false);
    }
  }

  async function onSubmit(data: WasteLogFormValues) {
    if (!userProfile) {
      toast({ title: "Authentication Required", description: "You must be logged in to log waste.", variant: "destructive" });
      return;
    }
    const authUid = getAuth().currentUser?.uid || userProfile.uid;
    if (!authUid) {
      toast({ title: "Authentication Required", description: "Please log in again to log waste.", variant: "destructive" });
      return;
    }
    const registered = await checkUserRegistration(data.eventId, authUid);
    if (!registered) {
      toast({ title: "Registration Required", description: "Please register for this event before logging waste.", variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      // For volunteers, require Google Drive link and create verification
      if (userProfile.role === 'volunteer') {
        if (!data.driveLink || data.driveLink.trim() === '') {
          toast({ 
            title: "Google Drive Link Required", 
            description: "Please provide a Google Drive link to your waste collection photos/videos.", 
            variant: 'destructive' 
          });
          setIsLoading(false);
          return;
        }

        // Validate Google Drive link format
        const driveLinkPattern = /^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/|open\?id=)/;
        if (!driveLinkPattern.test(data.driveLink.trim())) {
          toast({ 
            title: "Invalid Drive Link", 
            description: "Please provide a valid Google Drive link (folder or file).", 
            variant: 'destructive' 
          });
          setIsLoading(false);
          return;
        }

        // Check if there's already a pending verification for this event
        const existingVerification = await getVolunteerVerification(authUid, data.eventId);
        if (existingVerification && existingVerification.status === 'pending') {
          toast({ 
            title: "Verification Pending", 
            description: "Your Google Drive link is pending approval. Please wait for admin approval before logging waste.", 
            variant: 'destructive' 
          });
          setIsLoading(false);
          return;
        }

        // Check if verification is approved - if so, proceed with waste logging
        if (existingVerification && existingVerification.status === 'approved') {
          // Verification approved, proceed with waste logging below
        } else {
          // No verification or rejected - create new verification with Drive link
          // Get location if available
          let location: { latitude: number; longitude: number; timestamp: string } | undefined;
          try {
            if (navigator.geolocation) {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
              });
              location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().toISOString(),
              };
            }
          } catch (error) {
            console.warn('Could not get location:', error);
          }

          // Create verification with Drive link (don't log waste yet)
          await createVolunteerVerification(authUid, data.eventId, data.driveLink.trim(), undefined, location);
          
          // Update verification status
          setVerificationStatus('pending');
          
          toast({
            title: "Verification Submitted",
            description: "Your Google Drive link has been submitted for admin approval. You'll receive an email when approved, then you can log waste.",
          });
          form.reset();
          setIsLoading(false);
          return;
        }
      }

      // For admins or if volunteer verification is approved, log waste directly
      const finalWasteType = data.wasteType === 'Other' ? data.otherWasteType! : data.wasteType;
      await logWasteForEvent(data.eventId, {
        type: finalWasteType,
        weightKg: data.weightKg,
        loggedBy: userProfile.uid,
        adminName: data.adminName || undefined,
      });

      const pointsToAward = Math.round(data.weightKg * 10);
      toast({
        title: "Waste Logged!",
        description: `You've successfully logged ${data.weightKg}kg of ${finalWasteType} and earned ${pointsToAward} points!`,
      });
      form.reset();
    } catch (error) {
      console.error('Failed to log waste:', error);
      toast({ title: "Submission Failed", description: "Could not log waste. Please try again.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="eventId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeEvents.map(event => (
                    <SelectItem key={event.id || `event-${event.name}-${event.date}`} value={event.id}>
                      {event.name} ({new Date(event.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the event for which you are logging waste.
                {isRegisteredForSelected === false && (
                  <span className="text-destructive ml-1">You must be registered for this event to log waste.</span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="wasteType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of Waste</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select waste type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {wasteTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Categorize the waste you collected.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedWasteType === 'Other' && (
          <FormField
            control={form.control}
            name="otherWasteType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Other Waste Type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Styrofoam pieces" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="weightKg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 2.5" {...field} step="0.1" />
              </FormControl>
              <FormDescription>Enter the approximate weight of the collected waste in kilograms.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {userProfile?.role === 'volunteer' && (
          <FormField
            control={form.control}
            name="driveLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Google Drive Link (Required for Volunteers)</FormLabel>
                <FormControl>
                  <Input 
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..." 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Share a Google Drive link to your waste collection photos/videos. This will be reviewed by the admin before your waste log is approved.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="adminName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormDescription>Name of the admin present during waste weighing (optional).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Verification Status Card for Volunteers */}
        {userProfile?.role === 'volunteer' && selectedEventId && isRegisteredForSelected && (
          <Card className={verificationStatus === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-orange-500 bg-orange-50 dark:bg-orange-950'}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                {verificationLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Checking Verification Status...</span>
                  </>
                ) : verificationStatus === 'approved' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Verification Approved</span>
                  </>
                ) : verificationStatus === 'pending' ? (
                  <>
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span>Verification Pending</span>
                  </>
                ) : verificationStatus === 'rejected' ? (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span>Verification Rejected</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span>Verification Required</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step-by-step flow visualization */}
              <div className="flex items-center space-x-4">
                <div className={`flex flex-col items-center ${verificationStatus === 'none' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${verificationStatus === 'none' ? 'border-blue-600 bg-blue-100' : 'border-gray-300 bg-gray-100'}`}>
                    {verificationStatus === 'none' ? <Upload className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                  </div>
                  <span className="text-xs mt-1 font-medium">Step 1</span>
                  <span className="text-xs text-center">Upload Drive Link</span>
                </div>
                <div className={`flex-1 h-0.5 ${verificationStatus === 'pending' || verificationStatus === 'approved' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className={`flex flex-col items-center ${verificationStatus === 'pending' ? 'text-orange-600' : verificationStatus === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${verificationStatus === 'pending' ? 'border-orange-600 bg-orange-100' : verificationStatus === 'approved' ? 'border-green-600 bg-green-100' : 'border-gray-300 bg-gray-100'}`}>
                    {verificationStatus === 'pending' ? <Clock className="h-5 w-5" /> : verificationStatus === 'approved' ? <CheckCircle className="h-5 w-5" /> : <FileCheck className="h-5 w-5" />}
                  </div>
                  <span className="text-xs mt-1 font-medium">Step 2</span>
                  <span className="text-xs text-center">Admin Approval</span>
                </div>
                <div className={`flex-1 h-0.5 ${verificationStatus === 'approved' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className={`flex flex-col items-center ${verificationStatus === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${verificationStatus === 'approved' ? 'border-green-600 bg-green-100' : 'border-gray-300 bg-gray-100'}`}>
                    {verificationStatus === 'approved' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  </div>
                  <span className="text-xs mt-1 font-medium">Step 3</span>
                  <span className="text-xs text-center">Log Waste</span>
                </div>
              </div>

              {/* Status messages */}
              {verificationStatus === 'none' && (
                <div className="space-y-3">
                  <Alert>
                    <Upload className="h-4 w-4" />
                    <AlertTitle>Upload Your Drive Link</AlertTitle>
                    <AlertDescription>
                      Please provide a Google Drive link to your waste collection photos/videos. Once submitted, it will be reviewed by the admin.
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    onClick={handleSubmitVerification}
                    disabled={isSubmittingVerification || !form.getValues('driveLink') || form.getValues('driveLink')?.trim() === ''}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmittingVerification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit for Verification
                      </>
                    )}
                  </Button>
                </div>
              )}
              {verificationStatus === 'pending' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Verification Pending</AlertTitle>
                  <AlertDescription>
                    Your Google Drive link has been submitted and is awaiting admin approval. You'll receive an email notification once it's approved. You cannot log waste until your verification is approved.
                  </AlertDescription>
                </Alert>
              )}
              {verificationStatus === 'approved' && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-200">Verification Approved!</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Your verification has been approved. You can now log waste for this event.
                  </AlertDescription>
                </Alert>
              )}
              {verificationStatus === 'rejected' && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Verification Rejected</AlertTitle>
                    <AlertDescription>
                      Your verification has been rejected. Please submit a new Google Drive link with your waste collection photos/videos.
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    onClick={handleSubmitVerification}
                    disabled={isSubmittingVerification || !form.getValues('driveLink') || form.getValues('driveLink')?.trim() === ''}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmittingVerification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Resubmit for Verification
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button 
          type="submit" 
          size="lg" 
          disabled={
            isLoading || 
            isRegisteredForSelected === false || 
            (userProfile?.role === 'volunteer' && verificationStatus !== 'approved')
          }
          className={userProfile?.role === 'volunteer' && verificationStatus !== 'approved' ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {userProfile?.role === 'volunteer' && verificationStatus !== 'approved' 
            ? 'Verification Required to Log Waste' 
            : 'Log Waste'}
        </Button>
      </form>
    </Form>
  );
}
