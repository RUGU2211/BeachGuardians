"use client";
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TreePine, Waves, Recycle, Zap, Trash2, Leaf } from 'lucide-react';

interface EnvironmentalImpact {
  co2Saved: number;
  treesSaved: number;
  oceanLifeSaved: number;
  plasticBottlesRecycled: number;
  landfillSpaceSaved: number;
  energySaved: number;
}

export default function ImpactStats() {
  const [wasteKg, setWasteKg] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [volunteersCount, setVolunteersCount] = useState(0);
  const [environmentalImpact, setEnvironmentalImpact] = useState<EnvironmentalImpact>({
    co2Saved: 0,
    treesSaved: 0,
    oceanLifeSaved: 0,
    plasticBottlesRecycled: 0,
    landfillSpaceSaved: 0,
    energySaved: 0,
  });

  useEffect(() => {
    // Real-time listener for waste logs (more accurate than events)
    const qWasteLogs = query(collection(db, 'wasteLogs'));
    const unsubscribeWasteLogs = onSnapshot(
      qWasteLogs,
      (snapshot) => {
        const wasteLogs = snapshot.docs.map((d) => d.data() as any);
        const totalWaste = wasteLogs.reduce((sum, log) => sum + Number(log.weightKg || 0), 0);
        setWasteKg(totalWaste);

        // Calculate environmental impact based on EPA and environmental research data:
        // - 1 kg plastic waste = ~1.7 kg CO2 equivalent saved when recycled/removed
        // - 1 tree absorbs ~22 kg CO2 per year
        // - 1 kg plastic = ~33 plastic bottles (average 30g per bottle)
        // - 1 kg plastic = ~0.001 cubic meters landfill space
        // - 1 kg plastic recycled = ~2.5 kWh energy saved
        // - 1 kg plastic removed from ocean = saves ~10 marine animals (estimated)
        const impact: EnvironmentalImpact = {
          co2Saved: Math.round(totalWaste * 1.7),
          treesSaved: Math.round((totalWaste * 1.7) / 22),
          oceanLifeSaved: Math.round(totalWaste * 10),
          plasticBottlesRecycled: Math.round(totalWaste * 33),
          landfillSpaceSaved: Math.round(totalWaste * 0.001 * 100) / 100,
          energySaved: Math.round(totalWaste * 2.5),
        };
        setEnvironmentalImpact(impact);
      },
      (error) => {
        console.error('ImpactStats waste logs snapshot error:', error);
      }
    );

    // Real-time listener for events
    const qEvents = query(collection(db, 'events'));
    const unsubscribeEvents = onSnapshot(
      qEvents,
      (snapshot) => {
        const eventDocs = snapshot.docs.map((d) => d.data() as any);
        setEventsCount(snapshot.size);
        
        // Count unique volunteers from events
        const volunteerIds = new Set<string>();
        eventDocs.forEach((e: any) => {
          (e.volunteers || []).forEach((uid: string) => volunteerIds.add(uid));
        });
        setVolunteersCount(volunteerIds.size);
      },
      (error) => {
        console.error('ImpactStats events snapshot error:', error);
      }
    );

    return () => {
      unsubscribeWasteLogs();
      unsubscribeEvents();
    };
  }, []);

  const Stat = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
    <div className="rounded-xl border bg-card text-card-foreground p-6 text-center hover:shadow-lg transition-shadow">
      {icon && <div className="flex justify-center mb-3">{icon}</div>}
      <div className="text-3xl md:text-4xl font-extrabold">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );

  const ImpactCard = ({ 
    icon, 
    label, 
    value, 
    description, 
    color 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string; 
    description: string;
    color: string;
  }) => (
    <div className={`p-6 rounded-xl border-2 ${color} bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <section className="w-full py-16 md:py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6">
        {/* Basic Impact Statistics */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Impact Statistics</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time tracking of our collective efforts to protect our coastlines
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <Stat 
            label="Waste Collected" 
            value={`${wasteKg.toLocaleString()} kg`} 
            icon={<Trash2 className="h-8 w-8 text-orange-600" />}
          />
          <Stat 
            label="Events Conducted" 
            value={`${eventsCount}`} 
            icon={<Leaf className="h-8 w-8 text-green-600" />}
          />
          <Stat 
            label="Volunteers Joined" 
            value={`${volunteersCount}`} 
            icon={<Waves className="h-8 w-8 text-blue-600" />}
          />
          <Stat 
            label="Carbon Reduced" 
            value={`${environmentalImpact.co2Saved.toLocaleString()} kg`} 
            icon={<TreePine className="h-8 w-8 text-emerald-600" />}
          />
        </div>

        {/* Environmental Impact Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Environmental Impact</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Environmental benefits from waste collection and recycling efforts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ImpactCard
            icon={<TreePine className="h-6 w-6 text-green-600" />}
            label="CO₂ Saved"
            value={`${environmentalImpact.co2Saved.toLocaleString()} kg CO₂e`}
            description="Carbon dioxide equivalent prevented"
            color="border-green-200 dark:border-green-800"
          />
          
          <ImpactCard
            icon={<TreePine className="h-6 w-6 text-blue-600" />}
            label="Trees Saved"
            value={`${environmentalImpact.treesSaved.toLocaleString()}`}
            description="Equivalent trees absorbing CO₂"
            color="border-blue-200 dark:border-blue-800"
          />
          
          <ImpactCard
            icon={<Waves className="h-6 w-6 text-cyan-600" />}
            label="Ocean Life Saved"
            value={`${environmentalImpact.oceanLifeSaved.toLocaleString()}`}
            description="Marine animals protected"
            color="border-cyan-200 dark:border-cyan-800"
          />
          
          <ImpactCard
            icon={<Recycle className="h-6 w-6 text-purple-600" />}
            label="Bottles Recycled"
            value={`${environmentalImpact.plasticBottlesRecycled.toLocaleString()}`}
            description="Equivalent plastic bottles"
            color="border-purple-200 dark:border-purple-800"
          />
          
          <ImpactCard
            icon={<Trash2 className="h-6 w-6 text-orange-600" />}
            label="Landfill Space"
            value={`${environmentalImpact.landfillSpaceSaved.toFixed(2)} m³`}
            description="Space saved in landfills"
            color="border-orange-200 dark:border-orange-800"
          />
          
          <ImpactCard
            icon={<Zap className="h-6 w-6 text-yellow-600" />}
            label="Energy Saved"
            value={`${environmentalImpact.energySaved.toLocaleString()} kWh`}
            description="Energy from recycling"
            color="border-yellow-200 dark:border-yellow-800"
          />
        </div>
      </div>
    </section>
  );
}