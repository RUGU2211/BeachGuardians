'use client';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { getPendingAdminUsers, verifyAdminUser } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, CheckCircle, Clock, User, Mail, Building2, Globe, Phone, MapPin } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

export default function UserManagementPage() {
  const [pendingAdmins, setPendingAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingAdmins();
  }, []);

  const loadPendingAdmins = async () => {
    try {
      const admins = await getPendingAdminUsers();
      setPendingAdmins(admins);
    } catch (error) {
      console.error('Error loading pending admins:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending admin users.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAdmin = async (uid: string) => {
    setVerifying(uid);
    try {
      await verifyAdminUser(uid);
      toast({
        title: 'Success',
        description: 'Admin user has been verified.',
      });
      // Remove from pending list
      setPendingAdmins(prev => prev.filter(admin => admin.uid !== uid));
    } catch (error) {
      console.error('Error verifying admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify admin user.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute requireAdmin={true} requireVerification={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Pending Admin Verifications</span>
            </CardTitle>
            <CardDescription>
              Review and verify NGO admin account requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading...</span>
              </div>
            ) : pendingAdmins.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No pending admin verifications</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingAdmins.map((admin) => (
                  <div
                    key={admin.uid}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Admin Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={admin.avatarUrl} alt={admin.fullName} />
                          <AvatarFallback>
                            {getInitials(admin.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{admin.fullName}</h3>
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Verification
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{admin.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>Joined {formatDate(admin.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleVerifyAdmin(admin.uid)}
                        disabled={verifying === admin.uid}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {verifying === admin.uid ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verify Admin
                          </>
                        )}
                      </Button>
                    </div>

                    {/* NGO Information */}
                    {admin.role === 'admin' && (
                      <div className="p-4 space-y-4">
                        <div className="flex items-center space-x-2 text-green-700 font-medium">
                          <Building2 className="h-4 w-4" />
                          <span>NGO Information</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">Organization:</span>
                              <span>{admin.ngoName}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Shield className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">Type:</span>
                              <span>{admin.ngoType}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Shield className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">Registration ID:</span>
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {admin.ngoRegistrationId}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {admin.ngoWebsite && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Globe className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Website:</span>
                                <a 
                                  href={admin.ngoWebsite} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {admin.ngoWebsite}
                                </a>
                              </div>
                            )}
                            {admin.ngoPhone && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Phone:</span>
                                <span>{admin.ngoPhone}</span>
                              </div>
                            )}
                            {admin.ngoAddress && (
                              <div className="flex items-start space-x-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                <span className="font-medium">Address:</span>
                                <span className="text-xs">{admin.ngoAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {admin.ngoDescription && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-1">Organization Description:</div>
                            <div className="text-sm text-gray-600">{admin.ngoDescription}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
} 