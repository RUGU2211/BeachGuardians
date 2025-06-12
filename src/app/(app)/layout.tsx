'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { LogOut } from 'lucide-react';

// Placeholder Icon - replace with appropriate one from lucide-react if available or use SVG
function WavesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length -1];
      // Capitalize first letter and handle potential ID routes
      if (segments[0] === 'admin' && segments.length > 1) {
        setPageTitle('Admin: ' + segments[1].charAt(0).toUpperCase() + segments[1].slice(1).replace('-', ' '));
      } else if (lastSegment.match(/^[a-f0-9]{3,}$/i) && segments.length > 1) { // Basic check for ID-like segment
         setPageTitle(segments[segments.length - 2].charAt(0).toUpperCase() + segments[segments.length - 2].slice(1) + ' Details');
      }
      else {
        setPageTitle(lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace('-', ' '));
      }
    } else {
      setPageTitle('Dashboard');
    }
  }, [pathname]);

  if (!isClient) {
    // Render nothing or a loading indicator on the server to avoid hydration mismatch for sidebar state
    return null; 
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg font-headline">
            <WavesIcon className="h-7 w-7 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">Shoreline</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavItems />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" asChild>
            <Link href="/login">
              <LogOut className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Link>
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
