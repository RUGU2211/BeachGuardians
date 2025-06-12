'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  User,
  Trash2,
  BarChart3,
  ShieldCheck,
  Sparkles,
  MessageSquareHeart,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/profile', label: 'My Profile', icon: User },
  { href: '/waste-logging', label: 'Waste Logging', icon: Trash2 },
  { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
];

const adminNavItems = [
  { href: '/admin/ai-content', label: 'AI Content Generator', icon: Sparkles },
  { href: '/admin/event-summary', label: 'AI Event Summaries', icon: Send }, // Using Send as placeholder
  { href: '/admin/engagement-tool', label: 'AI Engagement Messages', icon: MessageSquareHeart },
];

export function SidebarNavItems() {
  const pathname = usePathname();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, className: 'bg-primary text-primary-foreground' }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}

      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => setIsAdminOpen(!isAdminOpen)} tooltip={{children: "Admin Tools", className: 'bg-primary text-primary-foreground' }}>
          <ShieldCheck />
          <span>Admin Tools</span>
          {isAdminOpen ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
        </SidebarMenuButton>
        {isAdminOpen && (
          <SidebarMenuSub>
            {adminNavItems.map((item) => (
              <SidebarMenuSubItem key={item.label}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === item.href}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
