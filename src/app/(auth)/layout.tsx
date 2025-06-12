import Link from 'next/link';

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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <BeachGuardiansIcon className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold font-headline text-primary">BeachGuardians</span>
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
