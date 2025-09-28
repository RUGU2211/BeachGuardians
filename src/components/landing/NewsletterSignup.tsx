"use client";
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { Event } from '@/lib/types';

export default function NewsletterSignup() {
  const enableRealtime = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<Event[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), { email, createdAt: serverTimestamp() });
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error('Newsletter signup failed', err);
      setStatus('error');
    }
  };

  // Live subscriber count (realtime if enabled; otherwise one-off fetch)
  useEffect(() => {
    if (enableRealtime) {
      const unsub = onSnapshot(
        collection(db, 'newsletter_subscribers'),
        (snap) => {
          setSubscriberCount(snap.size);
        },
        (error) => {
          console.error('Newsletter subscribers listener error:', error);
          setSubscriberCount(0);
        }
      );
      return () => unsub();
    } else {
      import('firebase/firestore').then(async ({ getDocs }) => {
        try {
          const snap = await getDocs(collection(db, 'newsletter_subscribers'));
          setSubscriberCount(snap.size);
        } catch (err) {
          console.error('Fetch subscribers failed:', err);
          setSubscriberCount(0);
        }
      });
    }
  }, [enableRealtime]);

  // Upcoming events preview (realtime if enabled; otherwise one-off fetch)
  useEffect(() => {
    const fetchAndSet = async (items: Event[]) => {
      const now = new Date();
      const filtered = items
        .filter((e) => {
          try {
            return e.startDate ? new Date(e.startDate) >= now : false;
          } catch {
            return false;
          }
        })
        .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
        .slice(0, 3);
      setUpcoming(filtered);
    };

    if (enableRealtime) {
      const unsub = onSnapshot(
        collection(db, 'events'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[];
          fetchAndSet(items);
        },
        (error) => {
          console.error('Events listener error (newsletter preview):', error);
          setUpcoming([]);
        }
      );
      return () => unsub();
    } else {
      import('firebase/firestore').then(async ({ getDocs }) => {
        try {
          const snap = await getDocs(collection(db, 'events'));
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[];
          fetchAndSet(items);
        } catch (err) {
          console.error('Fetch events failed (newsletter preview):', err);
          setUpcoming([]);
        }
      });
    }
  }, [enableRealtime]);

  return (
    <section id="newsletter" className="w-full py-16 md:py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="rounded-xl border bg-card text-card-foreground p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Newsletter & Notifications</h2>
          <p className="text-muted-foreground mt-2">Get updates on new events and impact stories.</p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90"
            >
              {status === 'loading' ? 'Submitting…' : 'Sign Up'}
            </button>
          </form>
          {status === 'success' && <p className="mt-2 text-green-600">You’re subscribed! Check your inbox for updates.</p>}
          {status === 'error' && <p className="mt-2 text-red-600">Something went wrong. Please try again.</p>}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {subscriberCount === null ? 'Loading subscribers…' : `${subscriberCount} subscribers receiving updates`}
            </div>
            <Link href="/events" className="text-sm text-primary hover:underline" prefetch={false}>
              Explore events
            </Link>
          </div>

          {/* Live Updates preview */}
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Upcoming events (live)</h3>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No upcoming events yet. Check back soon.</p>
            ) : (
              <ul className="mt-2 divide-y">
                {upcoming.map((e) => (
                  <li key={e.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm">{e.name || 'Untitled Event'}</span>
                    <span className="text-xs text-muted-foreground">{e.startDate ? new Date(e.startDate).toLocaleDateString() : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}