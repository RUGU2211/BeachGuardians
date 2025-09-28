"use client";
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="w-full">
      <div className="relative w-full h-[300px] md:h-[520px]">
        <Image
          src="/image1.png"
          alt="Beach cleanup in action"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-14 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900">
          Join Hands to Clean, Care & Celebrate
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-gray-700 md:text-xl">
          Be part of a movement restoring coastlines. Track impact, earn rewards, and empower communities.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
            <Link href="/events">Join an Event</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="backdrop-blur-md bg-white/80 text-gray-900 hover:bg-white">
            <Link href="/dashboard">Organize an Event</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}