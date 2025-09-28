import { Sun, Leaf, ShieldCheck } from 'lucide-react';

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

export default function HowItWorks() {
  return (
    <section className="w-full py-16 md:py-24 bg-muted/40">
      <div className="w-full max-w-3xl px-4 md:px-6 flex flex-col items-center text-center space-y-4 mx-auto">
        <div className="inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary font-semibold tracking-wide">
          GETTING STARTED
        </div>
        <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-gray-800">
          Register → Find Event → Participate → Earn Rewards
        </h2>
        <p className="mx-auto max-w-2xl text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          It’s simple to get started. Join an event, log your impact, and grow your achievements.
        </p>
      </div>
      <div className="mx-auto w-full max-w-4xl pt-12">
        <div className="grid gap-8 md:grid-cols-4 px-4 md:px-0">
          <StepCard icon={<Sun className="h-8 w-8 text-primary"/>} title="1. Register" description="Create your account to start contributing." />
          <StepCard icon={<Leaf className="h-8 w-8 text-primary"/>} title="2. Find Event" description="Discover cleanups near you or organize one." />
          <StepCard icon={<ShieldCheck className="h-8 w-8 text-primary"/>} title="3. Participate" description="Join the cleanup and log your collected waste." />
          <StepCard icon={<ShieldCheck className="h-8 w-8 text-primary"/>} title="4. Earn Rewards" description="Climb leaderboards and unlock badges." />
        </div>
      </div>
    </section>
  );
}