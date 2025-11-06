'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { updateVerificationStatus, getUsersByIds, getAllEvents } from '@/lib/firebase';
import { sendEmailFromClient } from '@/lib/client-email';
import { getVerificationApprovalTemplate } from '@/lib/email-templates';
import type { VolunteerVerification, UserProfile, Event } from '@/lib/types';
import { CheckCircle, XCircle, Clock, Loader2, Eye, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function VolunteerVerificationsPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<(VolunteerVerification & { volunteer?: UserProfile; event?: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<VolunteerVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin' || !userProfile.isAdminVerified) {
      setLoading(false);
      return;
    }

    // Real-time listener for volunteer verifications
    const verificationsRef = collection(db, 'volunteerVerifications');
    const q = query(verificationsRef, orderBy('uploadedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const verificationsData: VolunteerVerification[] = [];
        snapshot.forEach((doc) => {
          verificationsData.push({ id: doc.id, ...doc.data() } as VolunteerVerification);
        });

        // Fetch volunteer and event details
        const volunteerIds = [...new Set(verificationsData.map(v => v.volunteerId))];
        const eventIds = [...new Set(verificationsData.map(v => v.eventId))];

        const [volunteers, events] = await Promise.all([
          getUsersByIds(volunteerIds),
          getAllEvents(),
        ]);

        const volunteersMap = new Map(volunteers.map(v => [v.uid, v]));
        const eventsMap = new Map(events.map(e => [e.id, e]));

        const enrichedVerifications = verificationsData.map(v => ({
          ...v,
          volunteer: volunteersMap.get(v.volunteerId),
          event: eventsMap.get(v.eventId),
        }));

        setVerifications(enrichedVerifications);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to verifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile]);

  const handleApprove = async (verification: VolunteerVerification & { volunteer?: UserProfile; event?: Event }) => {
    if (!userProfile) return;

    setIsProcessing(true);
    try {
      await updateVerificationStatus(verification.id, 'approved', userProfile.uid);
      
      // Send email notification to volunteer
      if (verification.volunteer?.email) {
        try {
          const { subject, html } = getVerificationApprovalTemplate(
            verification.volunteer.displayName || 'Volunteer',
            verification.event?.name || 'Event'
          );
          await sendEmailFromClient({
            to: verification.volunteer.email,
            subject,
            html,
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
          // Don't fail the approval if email fails
        }
      }
      
      toast({
        title: 'Verification Approved',
        description: 'The volunteer can now log waste for this event. An email notification has been sent.',
      });
      setSelectedVerification(null);
    } catch (error) {
      console.error('Error approving verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!userProfile || !selectedVerification) return;

    setIsProcessing(true);
    try {
      await updateVerificationStatus(
        selectedVerification.id,
        'rejected',
        userProfile.uid,
        rejectionReason || undefined
      );
      toast({
        title: 'Verification Rejected',
        description: 'The volunteer has been notified.',
      });
      setSelectedVerification(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredVerifications = verifications.filter(v => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  if (!userProfile || userProfile.role !== 'admin' || !userProfile.isAdminVerified) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">You must be an admin to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Volunteer Verifications</h1>
        <p className="text-muted-foreground">Review and approve volunteer Google Drive links for waste collection</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({verifications.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Pending ({verifications.filter(v => v.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
        >
          Approved ({verifications.filter(v => v.status === 'approved').length})
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({verifications.filter(v => v.status === 'rejected').length})
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredVerifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No verifications found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVerifications.map((verification) => (
            <Card key={verification.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {verification.volunteer?.displayName || verification.volunteer?.email || 'Unknown Volunteer'}
                  </CardTitle>
                  <Badge
                    variant={
                      verification.status === 'approved'
                        ? 'default'
                        : verification.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {verification.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                    {verification.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                    {verification.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                    {verification.status}
                  </Badge>
                </div>
                <CardDescription>
                  Event: {verification.event?.name || 'Unknown Event'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Google Drive Link:</p>
                  <div className="p-3 bg-muted rounded-lg break-all">
                    <a
                      href={verification.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {verification.driveLink}
                    </a>
                  </div>
                </div>

                {verification.location && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>
                      {verification.location.latitude.toFixed(4)}, {verification.location.longitude.toFixed(4)}
                    </span>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>Uploaded: {new Date(verification.uploadedAt).toLocaleString()}</p>
                  {verification.approvedAt && (
                    <p>Approved: {new Date(verification.approvedAt).toLocaleString()}</p>
                  )}
                  {verification.rejectedAt && (
                    <p>Rejected: {new Date(verification.rejectedAt).toLocaleString()}</p>
                  )}
                  {verification.rejectionReason && (
                    <p className="text-red-600">Reason: {verification.rejectionReason}</p>
                  )}
                </div>

                {verification.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(verification)}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedVerification(verification)}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(verification.driveLink, '_blank')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Open Drive Link
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={!!selectedVerification} onOpenChange={(open) => !open && setSelectedVerification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification photo (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedVerification(null);
                setRejectionReason('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

