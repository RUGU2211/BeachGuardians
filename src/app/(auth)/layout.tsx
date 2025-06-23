'use client';
import Link from 'next/link';
import { AuthProvider } from "@/context/AuthContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl font-bold font-headline text-primary">BeachGuardians</span>
          </Link>
        </div>
        <div className="w-full max-w-2xl">
          {children}
        </div>
         <p className="mt-8 text-center text-sm text-muted-foreground">
          Making a difference, one cleanup at a time.
        </p>
      </div>
    </AuthProvider>
  );
}
