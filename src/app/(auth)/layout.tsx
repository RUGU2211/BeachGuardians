import Link from 'next/link';
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
  );
}
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <WavesIcon className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold font-headline text-primary">Shoreline</span>
        </Link>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Making a difference, one cleanup at a time.
      </p>
    </div>
  );
}
