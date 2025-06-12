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
import { Menu, Sun, Moon, LogOut, UserCircle, Settings } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar'; // Assuming useSidebar has toggle for mobile

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  // const { toggleSidebar } = useSidebar(); // Or manage mobile sidebar toggle here

  // Placeholder for theme toggle and user session
  const user = { name: 'Demo User', email: 'user@shoreline.app', avatar: 'https://placehold.co/40x40.png' };
  const initials = user.name.split(' ').map(n => n[0]).join('');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        {/* Mobile sidebar trigger - assuming SidebarProvider handles this */}
        {/* Or use a local state for Sheet open/close if not integrated with main sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            {/* Placeholder for mobile navigation items, could be a copy of SidebarNavItems */}
            <nav className="grid gap-2 text-lg font-medium p-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                <WavesIcon className="h-6 w-6 text-primary" />
                <span className="sr-only">Shoreline</span>
              </Link>
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <Link href="/events" className="text-muted-foreground hover:text-foreground">Events</Link>
              {/* Add other nav links here */}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <h1 className="text-xl font-semibold md:text-2xl flex-1 font-headline">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Theme Toggle - Placeholder */}
          <Button variant="ghost" size="icon" aria-label="Toggle theme">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><UserCircle className="mr-2 h-4 w-4" />Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/login"><LogOut className="mr-2 h-4 w-4" />Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

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
  )
}
