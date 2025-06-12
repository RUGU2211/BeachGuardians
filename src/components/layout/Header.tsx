
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Sun, Moon, LogOut, UserCircle, SettingsIcon, Loader2 } from 'lucide-react'; // Renamed Settings to SettingsIcon to avoid conflict
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { SidebarNavItems } from './SidebarNavItems'; // For mobile sheet

interface HeaderProps {
  title: string;
}

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

export function Header({ title }: HeaderProps) {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [theme, setTheme] = useState('light');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (!isClient) return; // Ensure this only runs client-side
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme, isClient]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login'); // router should be available from useRouter
    } catch (error) {
      console.error('Logout failed:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  const userInitials = currentUser?.displayName?.split(' ').map(n => n[0]).join('') || currentUser?.email?.charAt(0).toUpperCase() || 'U';
  const userDisplayName = currentUser?.displayName || currentUser?.email || 'User';

  if (!isClient) { // Or use authLoading to determine placeholder rendering
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <h1 className="text-xl font-semibold md:text-2xl flex-1 font-headline">{title}</h1>
         <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col">
            <div className="p-4 border-b">
              <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold font-headline">
                <BeachGuardiansIcon className="h-7 w-7 text-primary" />
                <span>BeachGuardians</span>
              </Link>
            </div>
            <div className="flex-grow overflow-y-auto">
                <SidebarNavItems />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <h1 className="text-xl font-semibold md:text-2xl flex-1 font-headline">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {authLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.photoURL || `https://placehold.co/40x40.png?text=${userInitials}`} alt={userDisplayName} data-ai-hint="person avatar"/>
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userDisplayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><UserCircle className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings"><SettingsIcon className="mr-2 h-4 w-4" />Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button asChild variant="outline">
                <Link href="/login">Login</Link>
             </Button>
          )}
        </div>
      </div>
    </header>
  );
}
