'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Trash2,
  Trophy,
  Sparkles,
  Shield,
  MessageSquare,
  BarChart2,
  ClipboardList,
  Award,
  Map,
  Camera,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export function SidebarNavItems() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);

  const isAdmin = userProfile?.role === 'admin' && userProfile?.isAdminVerified === true;

  // Real-time listener for pending verifications count
  useEffect(() => {
    if (!isAdmin) {
      setPendingVerificationsCount(0);
      return;
    }

    const verificationsRef = collection(db, 'volunteerVerifications');
    const q = query(verificationsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingVerificationsCount(snapshot.size);
      },
      (error) => {
        console.error('Error listening to pending verifications:', error);
        setPendingVerificationsCount(0);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const navItems: NavItem[] = [
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

  const adminNavItems: NavItem[] = [
    {
      title: 'Volunteer Verifications',
      href: '/admin/volunteer-verifications',
      icon: Camera,
      adminOnly: true,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined,
    },
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
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
            {item.adminOnly && !item.badge && (
              <Shield className="ml-auto h-3 w-3 text-muted-foreground" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
