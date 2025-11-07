'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Mail, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

export default function CertificateIssuancePage() {
  const [topContributors, setTopContributors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingCertificate, setSendingCertificate] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchTopContributors();
  }, []);

  const fetchTopContributors = async () => {
    try {
      const usersRef = collection(db, 'users');
      // Fetch users with the most points, you can adjust the limit
      const q = query(usersRef, orderBy('points', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
      })) as UserProfile[];
      
      setTopContributors(users.filter(u => u.points > 0)); // Only show users with points
    } catch (error) {
      console.error('Error fetching top contributors:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load the list of top contributors.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCertificate = async (user: UserProfile) => {
    setSendingCertificate(prev => ({ ...prev, [user.uid]: true }));
    
    try {
      // Calculate waste collected from user's waste logs if needed
      // For now, we'll pass available data and let the API handle defaults
      const response = await fetch('/api/certificate/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: {
          fullName: user.fullName,
          email: user.email,
          points: user.points || 0,
          eventsAttended: user.eventsAttended || [],
          wasteCollected: (user as any).wasteCollected || 0, // May need to calculate from waste logs
          badges: (user as any).badges || [],
          badgesCount: (user as any).badgesCount || 0,
        } }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send the certificate.');
      }

      toast({
        title: 'Certificate Sent!',
        description: `An email with the certificate has been sent to ${user.fullName}.`,
      });
      
    } catch (error) {
      console.error('Error sending certificate:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSendingCertificate(prev => ({ ...prev, [user.uid]: false }));
    }
  };
  
  if (loading) {
    return (
      <ProtectedRoute requireAdmin={true} requireVerification={true}>
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true} requireVerification={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Award className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Certificate Issuance</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Contributor Recognition</CardTitle>
            <CardDescription>
              Generate and email PDF certificates to recognize the outstanding efforts of your top volunteers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topContributors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Volunteer</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topContributors.map((user, index) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{user.fullName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{user.points.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSendCertificate(user)}
                          disabled={sendingCertificate[user.uid]}
                        >
                          {sendingCertificate[user.uid] ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="mr-2 h-4 w-4" />
                          )}
                          Send Certificate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="font-semibold">No contributors with points yet.</p>
                <p className="text-sm">Volunteers will appear here once they start earning points.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
} 