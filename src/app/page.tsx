import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Leaf, Award, Users, BarChart, Waves, Sun, ShieldCheck } from 'lucide-react';
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2" prefetch={false}>
            <BeachGuardiansLogo />
            <span className="text-xl font-bold text-primary">BeachGuardians</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
              <Link href="/login" prefetch={false}>
                Login
              </Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              <Link href="/signup" prefetch={false}>
                Sign Up
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <div className="w-full flex flex-col items-center">
          {/* Hero Section */}
          <section className="w-full flex flex-col items-center justify-center text-center pt-16 pb-8 bg-background">
            <div className="container px-4 md:px-6 space-y-6 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl xl:text-7xl/none font-headline text-primary">
                Protect Our Shores, Preserve Our Future.
              </h1>
              <p className="max-w-[700px] mx-auto md:text-xl text-lg font-light text-foreground">
                Join a global community of volunteers dedicated to keeping our beaches clean. Track your impact, earn rewards, and become a guardian of our coastlines.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-transform transform hover:scale-105">
                  <Link href="/signup" prefetch={false}>
                    Start Your Journey
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="border-accent text-accent hover:bg-accent/10 transition-transform transform hover:scale-105">
                  <Link href="/events" prefetch={false}>
                    Find a Cleanup Event
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative w-full flex justify-center mt-12">
              <div className="w-full max-w-5xl h-[340px] md:h-[480px] relative">
                <Image
                  src="/image1.png"
                  alt="A pristine beach with clear blue water"
                  fill
                  className="object-cover rounded-xl shadow-xl"
                  priority
                />
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="w-full py-16 md:py-24 lg:py-32 bg-white flex flex-col items-center">
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

          {/* How It Works Section */}
          <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/40 flex flex-col items-center">
            <div className="w-full max-w-3xl px-4 md:px-6 flex flex-col items-center text-center space-y-4">
              <div className="inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary font-semibold tracking-wide">
                  GETTING STARTED
              </div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-gray-800">
                  Three Steps to a Cleaner Coastline
              </h2>
              <p className="mx-auto max-w-2xl text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  It's simple to get started. Find an event, join in, and see the difference you make.
              </p>
            </div>
            <div className="mx-auto w-full max-w-4xl pt-12">
              <div className="grid gap-8 md:grid-cols-3">
                <StepCard icon={<Sun className="h-8 w-8 text-primary"/>} title="1. Discover" description="Find local events or start your own beach cleanup initiative." />
                <StepCard icon={<Leaf className="h-8 w-8 text-primary"/>} title="2. Contribute" description="Participate, log your collected waste, and help our environment." />
                <StepCard icon={<ShieldCheck className="h-8 w-8 text-primary"/>} title="3. Inspire" description="Share your achievements and motivate others to join the cause." />
              </div>
            </div>
          </section>

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
         <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} BeachGuardians. All rights reserved.</p>
            <nav className="flex gap-4 sm:gap-6 mt-4 md:mt-0">
                <Link href="#" className="text-sm hover:text-primary hover:underline underline-offset-4" prefetch={false}>
                    Terms of Service
                </Link>
                <Link href="#" className="text-sm hover:text-primary hover:underline underline-offset-4" prefetch={false}>
                    Privacy
                </Link>
            </nav>
        </div>
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

function StepCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="p-3 border-2 border-dashed border-primary/50 rounded-full">
                {icon}
            </div>
            <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
