
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

function BeachGuardiansIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path 
        d="M12 2C11.14 2 7.58 2.84 5.03 4.12C2.48 5.4 2 7.81 2 10.25C2 15.31 6.91 20.25 12 22C17.09 20.25 22 15.31 22 10.25C22 7.81 21.52 5.4 18.97 4.12C16.42 2.84 12.86 2 12 2Z"
        fill="hsl(var(--primary)/0.1)"
      />
      <path d="M11 10V14" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M9.5 14C10.5 13.5 11.5 13.5 12.5 14" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M11 10L9 8" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 10L13 8" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 10L10 7" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 10L12 7" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M7 18C9 16.5 11 16.5 13 18" stroke="hsl(var(--accent))" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M10 20C12 18.5 14 18.5 16 20" stroke="hsl(var(--accent))" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7"/>
      <path 
        d="M12 2C11.14 2 7.58 2.84 5.03 4.12C2.48 5.4 2 7.81 2 10.25C2 15.31 6.91 20.25 12 22C17.09 20.25 22 15.31 22 10.25C22 7.81 21.52 5.4 18.97 4.12C16.42 2.84 12.86 2 12 2Z" 
        stroke="hsl(var(--primary))" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none" 
      />
    </svg>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  const [pageTitle, setPageTitle] = useState('Dashboard');

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

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

  if (!currentUser) {
    // This will be briefly shown before redirect, or if redirect fails for some reason
    return null; 
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg font-headline">
            <BeachGuardiansIcon className="h-7 w-7 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">BeachGuardians</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavItems />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
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
