import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Leaf, Award, Users, BarChart, Waves, Sun, ShieldCheck } from 'lucide-react';
import Hero from '@/components/landing/Hero';
import UpcomingEvents from '@/components/landing/UpcomingEvents';
import UpcomingEventsAdvanced from '@/components/landing/UpcomingEventsAdvanced';
import EventMapPreview from '@/components/landing/EventMapPreview';
import LeaderboardHighlights from '@/components/landing/LeaderboardHighlights';
import ImpactStats from '@/components/landing/ImpactStats';
import Testimonials from '@/components/landing/Testimonials';
import HowItWorks from '@/components/landing/HowItWorks';
import Partners from '@/components/landing/Partners';
import NewsletterSignup from '@/components/landing/NewsletterSignup';
import SustainabilityBlog from '@/components/landing/SustainabilityBlog';
import LandingHeader from '@/components/layout/LandingHeader';
// Removed: import { generateHeroImage } from '@/ai/flows/generate-hero-image-flow';

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

export default function HomePage() {
  // Use a static placeholder representing the user's image.
  const heroImageUrl = "https://placehold.co/600x400.png"; 
  const heroImageHint = "volunteers cleaning beach"; // Updated hint

  // Removed AI image generation call for this specific hero image
  // try {
  //   const imageResult = await generateHeroImage({ prompt: "volunteers cleaning beach" }); // Or a more specific prompt from the image
  //   if (imageResult.imageDataUri) {
  //     heroImageUrl = imageResult.imageDataUri;
  //   }
  // } catch (error) {
  //   console.error("Failed to generate hero image for landing page:", error);
  // }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">
      <LandingHeader />

      <main className="flex-1 pt-16">
        <div className="w-full flex flex-col items-center">
          {/* Advanced Hero Section */}
          <Hero />

          {/* Features Section */}
          <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-white flex flex-col items-center">
            <div className="w-full max-w-4xl px-4 md:px-6 flex flex-col items-center text-center space-y-4 mb-12">
              <div className="inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary font-semibold tracking-wide">
                  WHY JOIN US?
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline text-gray-800">An Ocean of Opportunities Awaits</h2>
              <p className="max-w-2xl text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mx-auto">
                Our platform isn't just about cleaning beaches. It's about building a community, recognizing your efforts, and creating a lasting impact together.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 w-full">
              <FeatureCard
                icon={<BarChart className="h-10 w-10 text-primary" />}
                title="Track Your Impact"
                description="Log the waste you collect and see your contribution in real-time on our global impact dashboard."
              />
              <FeatureCard
                icon={<Award className="h-10 w-10 text-primary" />}
                title="Earn Recognition"
                description="Gain points, unlock badges, and climb the leaderboard. Your hard work deserves to be celebrated."
              />
              <FeatureCard
                icon={<Users className="h-10 w-10 text-primary" />}
                title="Connect & Collaborate"
                description="Find or create local cleanup events. Team up with fellow guardians to make a bigger splash."
              />
            </div>
          </section>

          {/* How It Works Section (updated per request) */}
          <div id="how-it-works" className="w-full">
            <HowItWorks />
          </div>

          {/* Upcoming Events */}
          <div id="events" className="w-full">
            <UpcomingEventsAdvanced />
          </div>

          {/* Event Map Preview */}
          <div id="map" className="w-full">
            <EventMapPreview />
          </div>

          {/* Leaderboard & Rewards Highlights */}
          <div id="leaderboard" className="w-full">
            <LeaderboardHighlights />
          </div>

          {/* Impact Statistics (Live Counters) */}
          <div id="impact" className="w-full">
            <ImpactStats />
          </div>

          {/* Testimonials / Stories */}
          <div id="stories" className="w-full">
            <Testimonials />
          </div>

          {/* Partner NGOs & Sponsors */}
          <div id="partners" className="w-full">
            <Partners />
          </div>

          {/* Newsletter & Notifications Signup */}
          <NewsletterSignup />

          {/* Sustainability Blog / Resources */}
          <div id="blog" className="w-full">
            <SustainabilityBlog />
          </div>

          {/* Final CTA Section */}
          <section className="w-full py-16 md:py-24 lg:py-32 bg-primary text-primary-foreground flex flex-col items-center">
            <div className="w-full max-w-2xl px-4 md:px-6 text-center flex flex-col items-center">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-white">
                Ready to Make a Wave of Change?
              </h2>
              <p className="mx-auto max-w-2xl text-primary-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4 mb-6">
                Every piece of trash removed is a victory for our oceans. Join BeachGuardians today and be a part of the solution.
              </p>
              <Button asChild size="lg" variant="secondary" className="w-full max-w-xs transition-transform transform hover:scale-105">
                <Link href="/signup">Become a Beach Guardian</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-muted/40 p-6 md:py-8 w-full">
         <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BeachGuardiansLogo />
                <span className="text-lg font-bold">BeachGuardians</span>
              </div>
              <p className="text-sm text-muted-foreground">Join hands to clean, care & celebrate.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Quick Links</h4>
              <div className="flex flex-col gap-1 text-sm">
                <Link href="/about" className="hover:underline">About Us</Link>
                <Link href="/contact" className="hover:underline">Contact</Link>
                <Link href="/faq" className="hover:underline">FAQ</Link>
                <Link href="/events" className="hover:underline">Events</Link>
                <Link href="/leaderboard" className="hover:underline">Leaderboard</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Legal</h4>
              <div className="flex flex-col gap-1 text-sm">
                <Link href="/terms" className="hover:underline">Terms of Service</Link>
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Follow</h4>
              <div className="flex gap-3 text-sm">
                <Link href="#" className="hover:underline">Twitter</Link>
                <Link href="#" className="hover:underline">Instagram</Link>
                <Link href="#" className="hover:underline">Facebook</Link>
              </div>
            </div>
         </div>
         <div className="container mx-auto mt-6 text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BeachGuardians. All rights reserved.</div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-shadow duration-300">
      <div className="bg-primary/10 p-4 rounded-full">
        {icon}
      </div>
      <h3 className="text-xl font-bold font-headline text-gray-800">{title}</h3>
      <p className="text-gray-600">
        {description}
      </p>
    </div>
  );
}

// StepCard removed; replaced by dedicated HowItWorks component
