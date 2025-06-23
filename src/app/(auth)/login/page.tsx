'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { getLoginNotificationTemplate } from '@/lib/email-templates';
import { sendEmailFromClient } from '@/lib/client-email';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleEmailLogin = async (data: z.infer<typeof loginFormSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // Send login notification email
      const { subject, html } = getLoginNotificationTemplate(user.displayName || 'User', 'unknown', 'unknown');
      await sendEmailFromClient({
        to: user.email!,
        subject,
        html,
      });

      toast({
        title: 'Login Successful',
        description: `Welcome back!`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <Card className="shadow-2xl w-full max-w-md border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <Link href="/" className="flex justify-center">
            <Image
              src="/logo.jpg"
              alt="BeachGuardians Logo"
              width={80}
              height={80}
              className="rounded-full"
            />
          </Link>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Welcome Back!
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Enter your credentials to access your BeachGuardians account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email/Password Form */}
          <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter your email" 
                  className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Mail className="mr-2 h-5 w-5" />
              )}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <div className="text-sm text-gray-600 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition-colors">
              Create one now
            </Link>
          </div>
          <Link href="#" className="text-sm text-gray-500 hover:text-blue-600 text-center transition-colors">
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
