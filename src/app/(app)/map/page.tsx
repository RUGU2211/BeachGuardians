'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';

const LiveLocationMap = dynamic(
  () => import('@/components/layout/LiveLocationMap').then((mod) => mod.LiveLocationMap),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

export default function MapPage() {
  const { userProfile } = useAuth();

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Live Location Map</h1>
      <div style={{ height: '70vh', width: '100%' }}>
        <LiveLocationMap isAdmin={userProfile?.role === 'admin' && userProfile.isVerified === true} />
      </div>
    </div>
  );
}