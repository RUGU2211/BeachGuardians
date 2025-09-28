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
import { Menu, Sun, Moon, LogOut, User, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { SidebarNavItems } from './SidebarNavItems';
import { Badge } from '@/components/ui/badge';
import { LivePointsDisplay } from '@/components/gamification/LivePointsDisplay';
import Image from 'next/image';

function BeachGuardiansLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold font-headline">
      <Image 
        src="/logo.jpg" 
        alt="BeachGuardians Logo" 
        width={32} 
        height={32} 
        className="h-8 w-8"
      />
      <span>BeachGuardians</span>
    </Link>
  );
}

export function Header({ title }: { title: string }) {
  const { user, userProfile, logout } = useAuth();
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
    if (!isClient) return;
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

  const handleSignOut = async () => {
    try {
      await logout();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
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

  const getDisplayName = () => {
    if (userProfile?.fullName) return userProfile.fullName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getAvatarUrl = () => {
    if (userProfile?.avatarUrl) return userProfile.avatarUrl;
    if (user?.photoURL) return user.photoURL;
    return undefined;
  };

  if (!isClient) {
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
              <BeachGuardiansLogo />
            </div>
            <div className="flex-grow overflow-y-auto">
                <SidebarNavItems />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="hidden md:flex">
          <BeachGuardiansLogo />
        </div>
        <h1 className="text-xl font-semibold md:text-2xl flex-1 font-headline">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {user && (
            <div className="flex items-center space-x-4">
              {userProfile && (
                <div className="flex items-center space-x-2">
                  {userProfile.role === 'admin' ? (
                    <Badge variant={userProfile.isAdminVerified ? "default" : "secondary"}>
                  <Shield className="w-3 h-3 mr-1" />
                  {userProfile.isAdminVerified ? 'Verified Admin' : 'Pending Admin'}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <User className="w-3 h-3 mr-1" />
                      Volunteer
                    </Badge>
                  )}
                  <LivePointsDisplay showIcon={true} showTrend={false} />
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
                      <AvatarFallback>
                        {getInitials(getDisplayName())}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {userProfile && (
                        <div className="flex items-center space-x-1 mt-1">
                          {userProfile.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3" />
                              <span className="text-xs">
                                {userProfile.isAdminVerified ? 'Verified Admin' : 'Pending Verification'}
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              <span className="text-xs">Volunteer</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
