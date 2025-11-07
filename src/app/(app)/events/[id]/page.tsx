'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getEventById,
  updateEvent,
  addPointsToUser,
  joinEvent,
  leaveEvent,
  getEventRegistrations,
  getUsersByIds,
  db,
  createVolunteerVerification,
  getVolunteerVerification,
  updateVerificationStatus,
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Users, Award, ChevronLeft, CheckCircle, XCircle, Clock, Loader2, UserCheck, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EventLocation } from '@/components/events/EventLocation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Event, UserProfile, VolunteerVerification } from '@/lib/types';
import { getEventRegistrationConfirmationTemplate, getVerificationApprovalTemplate } from '@/lib/email-templates';
import { sendEmailFromClient } from '@/lib/client-email';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';

function VolunteerList({ volunteers }: { volunteers: UserProfile[] }) {
  if (volunteers.length === 0) {
    return <p className="pt-4 text-center text-muted-foreground">No volunteers to display.</p>;
  }
  return (
    <ul className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {volunteers.map(volunteer => (
        <li key={volunteer.uid} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
          <Avatar>
            <AvatarImage src={volunteer.photoURL || undefined} alt={volunteer.displayName} />
            <AvatarFallback>{volunteer.displayName?.charAt(0).toUpperCase() || 'V'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{volunteer.displayName}</p>
            <p className="text-xs text-muted-foreground">{volunteer.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VolunteerVerificationList({ 
  volunteers, 
  eventId, 
  currentUserId,
  showOnlyApproved = false
}: { 
  volunteers: UserProfile[]; 
  eventId: string;
  currentUserId: string;
  showOnlyApproved?: boolean;
}) {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<Map<string, VolunteerVerification>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (volunteers.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch verification status for each volunteer
    const fetchVerifications = async () => {
      try {
        const verificationMap = new Map<string, VolunteerVerification>();
        await Promise.all(
          volunteers.map(async (volunteer) => {
            try {
              const verification = await getVolunteerVerification(volunteer.uid, eventId);
              if (verification) {
                verificationMap.set(volunteer.uid, verification);
              }
            } catch (error) {
              console.error(`Error fetching verification for ${volunteer.uid}:`, error);
            }
          })
        );
        setVerifications(verificationMap);
      } catch (error) {
        console.error('Error fetching verifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVerifications();

    // Real-time listener for verification updates
    const verificationsRef = collection(db, 'volunteerVerifications');
    const q = query(
      verificationsRef,
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const verificationMap = new Map<string, VolunteerVerification>();
        snapshot.forEach((doc) => {
          const verification = { id: doc.id, ...doc.data() } as VolunteerVerification;
          verificationMap.set(verification.volunteerId, verification);
        });
        setVerifications(verificationMap);
      },
      (error) => {
        console.error('Error listening to verifications:', error);
      }
    );

    return () => unsubscribe();
  }, [volunteers, eventId]);

  const handleApprove = async (volunteerId: string, volunteerName: string, volunteerEmail?: string) => {
    const verification = verifications.get(volunteerId);
    if (!verification) return;

    setProcessing(verification.id);
    try {
      await updateVerificationStatus(verification.id, 'approved', currentUserId);
      
      // Send email notification
      if (volunteerEmail) {
        try {
          const { subject, html } = getVerificationApprovalTemplate(
            volunteerName,
            'Event' // You might want to pass event name here
          );
          await sendEmailFromClient({
            to: volunteerEmail,
            subject,
            html,
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }
      
      toast({
        title: 'Verification Approved',
        description: `${volunteerName} can now log waste for this event.`,
      });
    } catch (error) {
      console.error('Error approving verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (volunteerId: string, volunteerName: string) => {
    const verification = verifications.get(volunteerId);
    if (!verification) return;

    setProcessing(verification.id);
    try {
      await updateVerificationStatus(verification.id, 'rejected', currentUserId);
      toast({
        title: 'Verification Rejected',
        description: `${volunteerName}'s verification has been rejected.`,
      });
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <p className="pt-4 text-center text-muted-foreground">Loading...</p>;
  }

  if (volunteers.length === 0) {
    return <p className="pt-4 text-center text-muted-foreground">No volunteers registered yet.</p>;
  }

  // Filter volunteers based on showOnlyApproved flag
  const filteredVolunteers = showOnlyApproved
    ? volunteers.filter(volunteer => {
        const verification = verifications.get(volunteer.uid);
        return verification?.status === 'approved';
      })
    : volunteers;

  if (showOnlyApproved && filteredVolunteers.length === 0) {
    return <p className="pt-4 text-center text-muted-foreground">No approved volunteers checked in yet.</p>;
  }

  return (
    <div className="pt-4 space-y-3">
      {filteredVolunteers.map(volunteer => {
        const verification = verifications.get(volunteer.uid);
        const status = verification?.status || 'no-verification';
        
        return (
          <div 
            key={volunteer.uid} 
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1">
              <Avatar>
                <AvatarImage src={volunteer.photoURL || undefined} alt={volunteer.displayName} />
                <AvatarFallback>{volunteer.displayName?.charAt(0).toUpperCase() || 'V'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{volunteer.displayName}</p>
                <p className="text-sm text-muted-foreground">{volunteer.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                {status === 'no-verification' && (
                  <Badge variant="outline">No Verification</Badge>
                )}
                {status === 'pending' && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Pending</span>
                  </Badge>
                )}
                {status === 'approved' && (
                  <Badge variant="default" className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Approved</span>
                  </Badge>
                )}
                {status === 'rejected' && (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>Rejected</span>
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {verification?.driveLink && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(verification.driveLink, '_blank')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Drive
                </Button>
              )}
              {!showOnlyApproved && (
                <>
                  {status === 'pending' && verification ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(volunteer.uid, volunteer.displayName || 'Volunteer', volunteer.email)}
                        disabled={processing === verification.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing === verification.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(volunteer.uid, volunteer.displayName || 'Volunteer')}
                        disabled={processing === verification.id}
                      >
                        {processing === verification.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </>
                        )}
                      </Button>
                    </>
                  ) : status === 'no-verification' ? (
                    <span className="text-sm text-muted-foreground">No verification submitted</span>
                  ) : null}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params.id === 'string' ? params.id : '';
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [registeredVolunteers, setRegisteredVolunteers] = useState<UserProfile[]>([]);
  const [checkedInVolunteers, setCheckedInVolunteers] = useState<UserProfile[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const isEventCreator = userProfile?.uid === currentEvent?.organizerId;
  const isAdmin = userProfile?.role === 'admin';
  const canManageEvent = isAdmin || isEventCreator;

  const fetchEventData = useCallback(async () => {
    setIsLoadingEvent(true);
    try {
      const eventData = await getEventById(eventId);
      setCurrentEvent(eventData);

      if (eventData) {
        // Set initial volunteer count from event data
        // The real-time listener will update this automatically
        setVolunteerCount(eventData.volunteers?.length || 0);

        const canViewVolunteers = (userProfile?.role === 'admin') || (userProfile?.uid === eventData.organizerId);
        // For admins/organizers, fetch registrations from subcollection and resolve profiles
        if (canViewVolunteers) {
          try {
            const regUids = await getEventRegistrations(eventId);
            const regProfiles = await getUsersByIds(regUids);
            setRegisteredVolunteers(regProfiles);
            // Update volunteer count with actual registrations count
            setVolunteerCount(regUids.length);
          } catch (e) {
            console.error('Failed to fetch registrations:', e);
            setRegisteredVolunteers([]);
          }
        } else {
          setRegisteredVolunteers([]);
        }

        // Real-time listener for checked-in volunteers will update this
        if (eventData.checkedInVolunteers && Object.keys(eventData.checkedInVolunteers).length > 0) {
          const checkedInIds = Object.keys(eventData.checkedInVolunteers);
          setCheckedInCount(checkedInIds.length);
          
          if (canViewVolunteers) {
            const checkedInProfiles = await getUsersByIds(checkedInIds);
            setCheckedInVolunteers(checkedInProfiles);
          } else {
            setCheckedInVolunteers([]);
          }
        } else {
          setCheckedInCount(0);
          setCheckedInVolunteers([]);
        }

        if (userProfile) {
          const authUid = getAuth().currentUser?.uid || userProfile.uid;
          const registeredByEventList = Array.isArray(eventData.volunteers)
            ? eventData.volunteers.includes(authUid)
            : false;
          const registeredByProfile = Array.isArray(userProfile.eventsAttended)
            ? userProfile.eventsAttended.includes(eventId)
            : false;
          setIsRegistered(!!(registeredByEventList || registeredByProfile));
          setHasCheckedIn(!!eventData.checkedInVolunteers?.[authUid]);
          
          // Check verification status for volunteers (for waste logging)
          // Note: Verification is now for waste logs, not registration
          // We'll check this when they try to log waste
        }
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
      toast({ title: "Error", description: "Could not load event details.", variant: "destructive" });
    } finally {
      setIsLoadingEvent(false);
    }
  }, [eventId, userProfile, toast]);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId, fetchEventData]);

  // Real-time listener for event registrations (volunteer count)
  useEffect(() => {
    if (!eventId) return;

    // Listen to registrations subcollection to get accurate volunteer count in real-time
    const registrationsRef = collection(db, 'events', eventId, 'registrations');
    const unsubscribe = onSnapshot(
      registrationsRef,
      async (snapshot) => {
        // Count actual registrations (this includes all volunteers, not just admins)
        const count = snapshot.size;
        setVolunteerCount(count);

        // Update registered volunteers list in real-time
        const canViewVolunteers = (userProfile?.role === 'admin') || (userProfile?.uid === currentEvent?.organizerId);
        if (canViewVolunteers) {
          try {
            const regUids = snapshot.docs.map(doc => doc.id);
            const regProfiles = await getUsersByIds(regUids);
            setRegisteredVolunteers(regProfiles);
          } catch (e) {
            console.error('Failed to fetch registered volunteers:', e);
          }
        }
      },
      (error) => {
        // If we can't read registrations (permission denied), fall back to event.volunteers
        console.warn(`Cannot read registrations for event ${eventId}, using event.volunteers:`, error);
        setVolunteerCount(currentEvent?.volunteers?.length || 0);
      }
    );

    return () => unsubscribe();
  }, [eventId, currentEvent?.volunteers, currentEvent?.organizerId, userProfile?.role, userProfile?.uid]);

  // Note: Verification status is now checked during waste logging, not registration

  // Real-time listener for checked-in volunteers (works for all users to show count)
  useEffect(() => {
    if (!eventId || !currentEvent) return;

    // Listen to event document for checkedInVolunteers changes
    const eventRef = doc(db, 'events', eventId);
    const unsubscribe = onSnapshot(
      eventRef,
      async (snapshot) => {
        const eventData = snapshot.data() as Event;
        const canViewVolunteers = (userProfile?.role === 'admin') || (userProfile?.uid === currentEvent.organizerId);
        
        if (eventData?.checkedInVolunteers && Object.keys(eventData.checkedInVolunteers).length > 0) {
          const checkedInIds = Object.keys(eventData.checkedInVolunteers);
          setCheckedInCount(checkedInIds.length);
          
          // Only fetch full profiles if user can view volunteers (admin/organizer)
          if (canViewVolunteers) {
            const checkedInProfiles = await getUsersByIds(checkedInIds);
            setCheckedInVolunteers(checkedInProfiles);
          } else {
            // For volunteers, just update the count (they can't see the list)
            setCheckedInVolunteers([]);
          }
        } else {
          setCheckedInCount(0);
          setCheckedInVolunteers([]);
        }
      },
      (error) => {
        console.warn('Error listening to checked-in volunteers:', error);
      }
    );

    return () => unsubscribe();
  }, [eventId, currentEvent?.organizerId, userProfile?.role, userProfile?.uid]);

  const handleLeave = async () => {
    if (!userProfile || !currentEvent) return;
    if (isLeaving) return;

    try {
      setIsLeaving(true);
      const authUid = getAuth().currentUser?.uid || userProfile.uid;
      if (!authUid) {
        toast({ title: 'Authentication Required', description: 'Please log in again to leave the event.', variant: 'destructive' });
        return;
      }
      await leaveEvent(eventId, authUid);
      setIsRegistered(false);
      await fetchEventData(); // Refresh data to update volunteer list
      toast({
        title: "You've left the event",
        description: `You are no longer registered for ${currentEvent.name}.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to leave event:", error);
      toast({ title: 'Error', description: 'Could not leave the event. Please try again.', variant: 'destructive' });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleCheckIn = async () => {
    if (!userProfile || !currentEvent) return;
    if (!isAdmin) {
      toast({ title: 'Check-in Restricted', description: 'Only admins can record check-ins.', variant: 'destructive' });
      return;
    }
    if (hasCheckedIn) {
      toast({ title: 'Already Checked In', description: 'You have already checked in for this event.' });
      return;
    }

    const checkInTime = new Date().toISOString();
    const updatedCheckedInVolunteers = {
      ...currentEvent.checkedInVolunteers,
      [userProfile.uid]: { checkInTime },
    };

    try {
      await updateEvent(eventId, { checkedInVolunteers: updatedCheckedInVolunteers });
      await addPointsToUser(userProfile.uid, 50); // Admin-only: award points
      
      setHasCheckedIn(true);
      // Refresh data
      await fetchEventData();
      
      toast({
        title: 'Check-in Successful!',
        description: 'You have earned 50 points for participating. Thank you for making a difference!',
      });
    } catch (error) {
      console.error("Check-in failed:", error);
      toast({ title: 'Check-in Failed', description: 'Could not process your check-in. Please try again.', variant: 'destructive' });
    }
  };


  const handleRegister = async () => {
    if (authLoading || !userProfile || !userProfile.email || !currentEvent) {
      toast({ title: "Cannot Register", description: "Please ensure you are logged in and event details are loaded.", variant: "destructive" });
      if (!userProfile) router.push('/login');
      return;
    }
    
    if (isRegistering) return;
    
    try {
      setIsRegistering(true);
      const authUid = getAuth().currentUser?.uid || userProfile.uid;
      if (!authUid) {
        toast({ title: 'Authentication Required', description: 'Please log in again to register for the event.', variant: 'destructive' });
        return;
      }
      await joinEvent(eventId, authUid);
      
      setIsRegistered(true);
      // Refresh data
      await fetchEventData();

      toast({
        title: "Registration Successful!",
        description: `You have been registered for ${currentEvent.name}.`,
      });

      // Send confirmation email
      try {
          const { subject, html } = getEventRegistrationConfirmationTemplate(
              userProfile.displayName || 'Volunteer',
              currentEvent.name,
              new Date(currentEvent.date).toLocaleDateString()
          );
          await sendEmailFromClient({
              to: userProfile.email,
              subject,
              html,
          });
      } catch (error) {
          console.error("Failed to send registration email:", error);
          toast({
              title: "Email Confirmation Failed",
              description: "We couldn't send a confirmation email, but you are registered.",
              variant: "default"
          });
      }
    } catch (error) {
      console.error("Registration failed:", error);
      toast({ title: 'Registration Failed', description: 'Could not register you for the event. Please try again.', variant: 'destructive' });
    } finally {
      setIsRegistering(false);
    }
  };


  
  const getStatusBadge = (status?: Event['status']) => {
    if (!status) return null;
    switch(status) {
      case 'upcoming': return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600"><Clock className="mr-1 h-3 w-3" />Upcoming</Badge>;
      case 'ongoing': return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600"><Clock className="mr-1 h-3 w-3" />Ongoing</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoadingEvent || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading event details...</p>
      </div>
    );
  }

  if (!currentEvent) {
    return <div className="text-center py-10">Event not found. It might have been removed or the ID is incorrect.</div>;
  }

  const eventDate = new Date(currentEvent.date);
  const isPastEvent = eventDate < new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
        </Button>
        {canManageEvent && (
          <Button asChild>
            <Link href={`/events/${eventId}/edit`}>
              Edit Event
            </Link>
          </Button>
        )}
      </div>

      <Card className="overflow-hidden shadow-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-3xl md:text-4xl font-headline text-primary">{currentEvent.name}</CardTitle>
            {getStatusBadge(currentEvent.status)}
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-md">
            <div className="flex items-center">
              <CalendarDays className="mr-3 h-5 w-5 text-primary" />
              <span>{eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {currentEvent.time}</span>
            </div>
            <EventLocation 
              location={currentEvent.location} 
              locationDetails={currentEvent.locationDetails}
              showDistance={true}
              showDirections={true}
            />
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5 text-primary" />
              <span>{volunteerCount > 0 ? volunteerCount : (canManageEvent ? registeredVolunteers.length : currentEvent.volunteers.length)} volunteers registered</span>
            </div>
            {currentEvent.status === 'completed' && currentEvent.wasteCollectedKg && (
              <div className="flex items-center">
                <Award className="mr-3 h-5 w-5 text-primary" />
                <span>{currentEvent.wasteCollectedKg} kg of waste collected</span>
              </div>
            )}
          </div>

          <CardDescription className="text-base leading-relaxed whitespace-pre-line">
            {currentEvent.description}
          </CardDescription>

          {/* Supporting Document Section - Visible to all users before registration */}
          {(currentEvent.googleDriveLink || currentEvent.supportingDocumentUrl) && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Supporting Document</p>
                  <p className="text-sm text-muted-foreground">Government permission document - View before registering</p>
                </div>
              </div>
              
              {/* Google Drive Document Link */}
              {currentEvent.googleDriveLink && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">Supporting Document</p>
                        <p className="text-sm text-muted-foreground">Government permission document - View before registering</p>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => {
                        window.open(currentEvent.googleDriveLink!, '_blank');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Open Document
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Fallback for old supportingDocumentUrl (PDF) */}
              {!currentEvent.googleDriveLink && currentEvent.supportingDocumentUrl && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">Supporting Document</p>
                        <p className="text-sm text-muted-foreground">PDF Document</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.open(currentEvent.supportingDocumentUrl!, '_blank');
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = currentEvent.supportingDocumentUrl!;
                          link.download = `event-${currentEvent.id}-document.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          <div className="space-x-2 mt-4">
            {(currentEvent.status === 'upcoming' || currentEvent.status === 'ongoing') && !isRegistered && (
              <Button size="lg" onClick={handleRegister} disabled={authLoading || isRegistering}>
                {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Register for this Event
              </Button>
            )}
            {isRegistered && currentEvent?.status === 'ongoing' && !hasCheckedIn &&(
              <Button size="lg" onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                <UserCheck className="mr-2 h-5 w-5" />
                Check In Now
              </Button>
            )}
            {hasCheckedIn && (
              <Button size="lg" disabled variant="outline">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> You are Checked In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            Volunteers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canManageEvent ? (
            // Admin view: Show counts and verification list
            <Tabs defaultValue="registered">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="registered">
                  Registered ({registeredVolunteers.length})
                </TabsTrigger>
                <TabsTrigger value="checked-in">
                  Checked-in ({checkedInVolunteers.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="registered">
                <VolunteerVerificationList 
                  volunteers={registeredVolunteers} 
                  eventId={eventId}
                  currentUserId={userProfile?.uid || ''}
                  showOnlyApproved={false}
                />
              </TabsContent>
              <TabsContent value="checked-in">
                <VolunteerVerificationList 
                  volunteers={checkedInVolunteers} 
                  eventId={eventId}
                  currentUserId={userProfile?.uid || ''}
                  showOnlyApproved={true}
                />
              </TabsContent>
            </Tabs>
          ) : (
            // Volunteer view: Show only registered count
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="px-4 py-2 bg-primary/10 rounded-lg">
                    <span className="text-sm text-muted-foreground">Registered</span>
                    <p className="text-2xl font-bold">{volunteerCount}</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-muted-foreground">
                {volunteerCount > 0 
                  ? `${volunteerCount} volunteer${volunteerCount !== 1 ? 's' : ''} registered for this event.`
                  : 'No volunteers registered yet.'}
              </p>
            </div>
          )}
        </CardContent>
         {currentEvent.status === 'completed' && (
          <CardFooter>
            <Button asChild variant="secondary">
              <Link href={`/admin/event-summary/${currentEvent.id}`}>Generate Event Summary (AI)</Link>
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Participation Actions (show for upcoming events to all; and for admins also on past events) */}
      {(!isPastEvent || canManageEvent) && (
        <Card>
          <CardHeader>
            <CardTitle>Your Participation</CardTitle>
          </CardHeader>
          <CardContent>
            {isRegistered ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center text-green-600 font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  You are registered for this event!
                </div>
                <Button onClick={handleLeave} variant="destructive" disabled={isLeaving}>
                  Leave Event
                </Button>
              </div>
            ) : (
              <Button onClick={handleRegister} disabled={isRegistering}>
                Join Event
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin/Organizer Check-in Panel */}
      {canManageEvent && !isPastEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Check-in Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-x-2 mt-4">
              {currentEvent.status === 'upcoming' && !isRegistered && (
                <Button size="lg" onClick={handleRegister} disabled={authLoading || isRegistering}>
                  {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Register for this Event
                </Button>
              )}
              {isRegistered && currentEvent?.status === 'ongoing' && !hasCheckedIn &&(
                <Button size="lg" onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                  <UserCheck className="mr-2 h-5 w-5" />
                  Check In Now
                </Button>
              )}
              {hasCheckedIn && (
                <Button size="lg" disabled variant="outline">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> You are Checked In
                </Button>
              )}
              {isRegistered && (
                <Button size="lg" variant="destructive" onClick={handleLeave} disabled={isLeaving}>
                  Leave Event
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
