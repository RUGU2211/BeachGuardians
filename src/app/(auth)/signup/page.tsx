'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, createUserProfile, checkIfUserExists, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, Eye, EyeOff, Shield, Building2, Phone, Globe, FileText } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserRole } from '@/lib/types';
import { getWelcomeEmailTemplate } from '@/lib/email-templates';
import { sendEmailFromClient } from '@/lib/client-email';
import { doc, setDoc } from 'firebase/firestore';

const signupFormSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['volunteer', 'admin'], { required_error: 'Please select a role.' }),
  // NGO-specific fields
  ngoName: z.string().optional(),
  ngoType: z.string().optional(),
  ngoRegistrationId: z.string().optional(),
  ngoWebsite: z.string().url().optional().or(z.literal('')),
  ngoPhone: z.string().optional(),
  ngoAddress: z.string().optional(),
  ngoDescription: z.string().optional(),
})
.refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
.refine(data => {
  if (data.role === 'admin') {
    if (!data.ngoName || data.ngoName.trim().length < 2) {
      return false;
    }
    if (!data.ngoRegistrationId || data.ngoRegistrationId.trim().length < 3) {
      return false;
    }
    if (!data.ngoType || data.ngoType.trim().length < 2) {
      return false;
    }
  }
  return true;
}, {
  message: 'NGO Name, Type, and Registration ID are required for admin role.',
  path: ['ngoName'],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'volunteer',
      ngoName: '',
      ngoType: '',
      ngoRegistrationId: '',
      ngoWebsite: '',
      ngoPhone: '',
      ngoAddress: '',
      ngoDescription: '',
    },
  });

  const selectedRole = form.watch('role');

  const handleEmailSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: data.name,
      });

      // Step 2: Create the user profile document in Firestore
      const userProfileData = {
        uid: user.uid,
        email: data.email,
        fullName: data.name,
        role: data.role,
        ...(data.role === 'admin' && {
          ngoName: data.ngoName,
          ngoType: data.ngoType,
          ngoRegistrationId: data.ngoRegistrationId,
        }),
      };
      await createUserProfile(userProfileData);

      // Step 3: Send welcome email
      const { subject, html } = getWelcomeEmailTemplate(data.name);
      await sendEmailFromClient({
        to: data.email,
        subject,
        html,
      });
      
      toast({
        title: 'Account Created!',
        description: `Welcome ${data.name}! Your account is ready.`,
      });

      router.push('/dashboard'); 

    } catch (error: any) {
      console.error('Error signing up:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already registered. Please try logging in.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Sign up Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <Card className="shadow-2xl w-full max-w-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Join BeachGuardians
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Create an account to start making a difference in our community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email/Password Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailSignup)} className="space-y-5">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Full Name</FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            {...field} 
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Email Address</FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            {...field} 
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="pl-10 pr-10 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            {...field} 
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Confirm Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <FormControl>
                          <Input 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="pl-10 pr-10 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            {...field} 
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Role Selection */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium text-gray-700">Select Your Role</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="relative">
                          <RadioGroupItem
                            value="volunteer"
                            id="volunteer"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="volunteer"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 [&:has([data-state=checked])]:border-blue-500 cursor-pointer transition-all duration-200"
                          >
                            <Shield className="mb-3 h-6 w-6 text-blue-600" />
                            <div className="space-y-1 text-center">
                              <p className="text-sm font-medium leading-none">Volunteer</p>
                              <p className="text-xs text-gray-500">Join cleanup events</p>
                            </div>
                          </Label>
                        </div>
                        <div className="relative">
                          <RadioGroupItem
                            value="admin"
                            id="admin"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="admin"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 [&:has([data-state=checked])]:border-green-500 cursor-pointer transition-all duration-200"
                          >
                            <Building2 className="mb-3 h-6 w-6 text-green-600" />
                            <div className="space-y-1 text-center">
                              <p className="text-sm font-medium leading-none">NGO Admin</p>
                              <p className="text-xs text-gray-500">Organize events</p>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* NGO Information (only for admin role) */}
              {selectedRole === 'admin' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    NGO Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ngoName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">NGO Name *</FormLabel>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <FormControl>
                              <Input 
                                placeholder="Enter your NGO name" 
                                className="pl-10 h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                                {...field} 
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ngoType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Organization Type *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200">
                                <SelectValue placeholder="Select organization type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Environmental NGO">Environmental NGO</SelectItem>
                                <SelectItem value="Community Organization">Community Organization</SelectItem>
                                <SelectItem value="Educational Institution">Educational Institution</SelectItem>
                                <SelectItem value="Government Agency">Government Agency</SelectItem>
                                <SelectItem value="Corporate Foundation">Corporate Foundation</SelectItem>
                                <SelectItem value="Youth Group">Youth Group</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ngoRegistrationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Registration ID/Number *</FormLabel>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <FormControl>
                            <Input 
                              placeholder="Enter your NGO registration ID" 
                              className="pl-10 h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                        </div>
                        <FormDescription className="text-xs text-gray-500">
                          Official registration number from government or regulatory body
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ngoWebsite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Website</FormLabel>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <FormControl>
                              <Input 
                                placeholder="https://your-ngo.org" 
                                className="pl-10 h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                                {...field} 
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ngoPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Contact Phone</FormLabel>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <FormControl>
                              <Input 
                                placeholder="+1 (555) 123-4567" 
                                className="pl-10 h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                                {...field} 
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ngoAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Organization Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your organization's address" 
                            className="border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ngoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Organization Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of your organization's mission and activities" 
                            className="border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <User className="mr-2 h-5 w-5" />
                )}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <div className="text-sm text-gray-600 text-center">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition-colors">
              Sign in here
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

