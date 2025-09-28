'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Trash2,
  Trophy,
  Sparkles,
  Shield,
  MessageSquare,
  BarChart2,
  ClipboardList,
  Award,
  Map,
} from 'lucide-react';

export function SidebarNavItems() {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();

  const isAdmin = userProfile?.role === 'admin' && userProfile?.isAdminVerified === true;

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Events',
      href: '/events',
      icon: Calendar,
    },
    {
      title: 'Waste Logging',
      href: '/waste-logging',
      icon: Trash2,
    },
    {
      title: 'Leaderboard',
      href: '/leaderboard',
      icon: Trophy,
    },
    {
      title: 'Event Map',
      href: '/map',
      icon: Map,
    },
    {
      title: 'Profile',
      href: '/profile',
      icon: Users,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const adminNavItems = [
    {
      title: 'AI Content',
      href: '/admin/ai-content',
      icon: Sparkles,
      adminOnly: true,
    },
    {
      title: 'Impact Analytics',
      href: '/admin/impact-analytics',
      icon: BarChart2,
      adminOnly: true,
    },
    {
      title: 'Certificate Issuance',
      href: '/admin/certificate-issuance',
      icon: Award,
      adminOnly: true,
    },
  ];

  const finalNavItems = isAdmin ? [...navItems.slice(0, 4), ...adminNavItems, ...navItems.slice(4)] : navItems;

  return (
    <nav className="grid items-start gap-2">
      {finalNavItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
              pathname === item.href ? 'bg-accent' : 'transparent'
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
            {item.adminOnly && (
              <Shield className="ml-auto h-3 w-3 text-muted-foreground" />
            )}
          </Link>
        );
      })}
      
      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </Button>
      </div>
    </nav>
  );
}
