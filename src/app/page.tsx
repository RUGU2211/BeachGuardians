
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
// Removed: import { generateHeroImage } from '@/ai/flows/generate-hero-image-flow';

function BeachGuardiansIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path 
        d="M12 2C11.14 2 7.58 2.84 5.03 4.12C2.48 5.4 2 7.81 2 10.25C2 15.31 6.91 20.25 12 22C17.09 20.25 22 15.31 22 10.25C22 7.81 21.52 5.4 18.97 4.12C16.42 2.84 12.86 2 12 2Z"
        fill="hsl(var(--primary)/0.1)"
      />
      <path d="M11 10V14" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M9.5 14C10.5 13.5 11.5 13.5 12.5 14" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M11 10L9 8" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 10L13 8" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 10L10 7" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 10L12 7" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" />
      <path d="M7 18C9 16.5 11 16.5 13 18" stroke="hsl(var(--accent))" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M10 20C12 18.5 14 18.5 16 20" stroke="hsl(var(--accent))" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7"/>
      <path 
        d="M12 2C11.14 2 7.58 2.84 5.03 4.12C2.48 5.4 2 7.81 2 10.25C2 15.31 6.91 20.25 12 22C17.09 20.25 22 15.31 22 10.25C22 7.81 21.52 5.4 18.97 4.12C16.42 2.84 12.86 2 12 2Z" 
        stroke="hsl(var(--primary))" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none" 
      />
    </svg>
  );
}


export default async function HomePage() {
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
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <BeachGuardiansIcon className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-semibold font-headline">BeachGuardians</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Sign Up
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline text-primary">
                    Clean Coasts, Clear Future.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Join BeachGuardians, a community dedicated to preserving our planet's beautiful coastlines. Log your cleanup efforts, track our collective impact, and earn rewards.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/signup" prefetch={false}>
                      Join Now
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/events" prefetch={false}>
                      Find an Event
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src={heroImageUrl}
                width="600"
                height="400"
                alt="Hero image depicting volunteers cleaning a beach"
                data-ai-hint={heroImageHint}
                className="mx-auto aspect-[3/2] overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                priority
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Make a Difference with BeachGuardians</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform empowers volunteers with tools to organize, participate, and see the tangible results of their conservation efforts.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 pt-12">
              <div className="flex flex-col gap-2 p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow text-left">
                <h3 className="text-lg font-bold font-headline">Event Management</h3>
                <p className="text-sm text-muted-foreground">
                  Discover and join local cleanup events. Organizers can easily create and manage events.
                </p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow text-left">
                <h3 className="text-lg font-bold font-headline">Impact Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Log the type and amount of waste collected. See real-time statistics and our collective impact.
                </p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow text-left">
                <h3 className="text-lg font-bold font-headline">Gamification</h3>
                <p className="text-sm text-muted-foreground">
                  Earn points and badges for your contributions. Compete on leaderboards and get recognized.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BeachGuardians. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
