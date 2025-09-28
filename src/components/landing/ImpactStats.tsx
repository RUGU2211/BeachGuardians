"use client";
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ImpactStats() {
  const enableRealtime = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';
  const [wasteKg, setWasteKg] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [volunteersCount, setVolunteersCount] = useState(0);
  const [carbonReducedKg, setCarbonReducedKg] = useState(0);

  useEffect(() => {
    const qEvents = query(collection(db, 'events'));
    if (enableRealtime) {
      const unsubscribe = onSnapshot(qEvents, (snapshot) => {
        const eventDocs = snapshot.docs.map((d) => d.data() as any);
        setEventsCount(snapshot.size);
        const totalWaste = eventDocs.reduce((sum, e) => sum + Number(e.wasteCollectedKg || 0), 0);
        setWasteKg(totalWaste);
        // Count unique volunteers from events (no users read needed)
        const volunteerIds = new Set<string>();
        eventDocs.forEach((e: any) => {
          (e.volunteers || []).forEach((uid: string) => volunteerIds.add(uid));
        });
        setVolunteersCount(volunteerIds.size);
        // Approximate: 1kg plastic -> 1.7kg CO2e avoided when recycled/removed
        setCarbonReducedKg(Math.round(totalWaste * 1.7));
      }, (error) => {
        console.error('ImpactStats events snapshot error:', error);
      });
      return () => unsubscribe();
    } else {
      import('firebase/firestore').then(async ({ getDocs }) => {
        try {
          const snapshot = await getDocs(qEvents);
          const eventDocs = snapshot.docs.map((d) => d.data() as any);
          setEventsCount(snapshot.size);
          const totalWaste = eventDocs.reduce((sum, e) => sum + Number(e.wasteCollectedKg || 0), 0);
          setWasteKg(totalWaste);
          const volunteerIds = new Set<string>();
          eventDocs.forEach((e: any) => {
            (e.volunteers || []).forEach((uid: string) => volunteerIds.add(uid));
          });
          setVolunteersCount(volunteerIds.size);
          setCarbonReducedKg(Math.round(totalWaste * 1.7));
        } catch (err) {
          console.error('ImpactStats one-off fetch error:', err);
        }
      });
      return () => {};
    }
  }, []);

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border bg-card text-card-foreground p-6 text-center">
      <div className="text-3xl md:text-4xl font-extrabold">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <section className="w-full py-16 md:py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Impact Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat label="Waste Collected" value={`${wasteKg.toLocaleString()} kg`} />
          <Stat label="Events Conducted" value={`${eventsCount}`} />
          <Stat label="Volunteers Joined" value={`${volunteersCount}`} />
          <Stat label="Carbon Reduced" value={`${carbonReducedKg.toLocaleString()} kg CO₂e`} />
        </div>
      </div>
    </section>
  );
}