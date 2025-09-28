"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

function BeachGuardiansLogo() {
  return (
    <Image 
      src="/logo.jpg" 
      alt="BeachGuardians Logo" 
      width={32} 
      height={32} 
      className="h-8 w-8 rounded-full"
    />
  );
}

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#events', label: 'Events' },
    { href: '/#map', label: 'Map' },
    { href: '/#leaderboard', label: 'Leaderboard' },
    { href: '/#impact', label: 'Impact' },
    { href: '/#partners', label: 'Partners' },
    { href: '/#newsletter', label: 'Newsletter' },
    { href: '/#blog', label: 'Blog' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <BeachGuardiansLogo />
          <span className="text-xl font-bold text-primary">BeachGuardians</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors" prefetch={false}>{l.label}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Button asChild variant="ghost" className="text-primary hover:bg-primary/10">
            <Link href="/events" prefetch={false}>Start a Cleanup</Link>
          </Button>
          <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
            <Link href="/login" prefetch={false}>Login</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
            <Link href="/signup" prefetch={false}>Sign Up</Link>
          </Button>
        </div>

        {/* Mobile */}
        <button aria-label="Toggle Menu" className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-muted" onClick={() => setOpen((o) => !o)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-primary" onClick={() => setOpen(false)} prefetch={false}>{l.label}</Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Button asChild variant="ghost" className="w-full">
                <Link href="/events" prefetch={false}>Start a Cleanup</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login" prefetch={false}>Login</Link>
              </Button>
              <Button asChild className="w-full">
                <Link href="/signup" prefetch={false}>Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}