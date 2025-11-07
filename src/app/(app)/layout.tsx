'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarNavItems } from '@/components/layout/SidebarNavItems';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase'; // Import auth for signOut
import { useToast } from '@/hooks/use-toast';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [pageTitle, setPageTitle] = useState('Dashboard');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length -1];
      if (segments[0] === 'admin' && segments.length > 1) {
        setPageTitle('Admin: ' + segments[1].charAt(0).toUpperCase() + segments[1].slice(1).replace('-', ' '));
      } else if (lastSegment.match(/^[a-f0-9]{3,}$/i) && segments.length > 1) { 
         setPageTitle(segments[segments.length - 2].charAt(0).toUpperCase() + segments[segments.length - 2].slice(1) + ' Details');
      }
      else {
        setPageTitle(lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace('-', ' '));
      }
    } else {
      setPageTitle('Dashboard');
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This will be briefly shown before redirect, or if redirect fails for some reason
    return null; 
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center font-semibold text-lg font-headline">
            <span className="group-data-[collapsible=icon]:hidden">BeachGuardians</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavItems />
        </SidebarContent>
        <SidebarFooter>
          <Button 
            variant="ghost" 
            size="icon"
            className="w-full justify-start group-data-[collapsible=icon]:justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2 group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <Header title={pageTitle} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
