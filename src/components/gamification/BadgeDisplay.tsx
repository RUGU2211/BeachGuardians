import type { Achievement } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Sparkles, Recycle, Waves, Shield, Star } from 'lucide-react'; // Add more icons as needed

// Helper to get icon component based on string name
const getIconComponent = (iconName: string): React.ElementType => {
  switch (iconName.toLowerCase()) {
    case 'award': return Award;
    case 'sparkles': return Sparkles;
    case 'recycle': return Recycle;
    case 'waves': return Waves;
    case 'shield': return Shield;
    case 'star': return Star;
    default: return Award; // Default icon
  }
};

interface BadgeDisplayProps {
  achievements: Achievement[];
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeDisplay({ achievements, size = 'md' }: BadgeDisplayProps) {
  if (!achievements || achievements.length === 0) {
    return <p className="text-sm text-muted-foreground">No badges earned yet.</p>;
  }

  const iconSizeClass = size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-10 w-10';
  const cardPadding = size === 'sm' ? 'p-2' : size === 'md' ? 'p-3' : 'p-4';

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3">
        {achievements.map(ach => {
          const IconComponent = getIconComponent(ach.icon);
          return (
            <Tooltip key={ach.id}>
              <TooltipTrigger asChild>
                <Card className={`flex flex-col items-center justify-center ${cardPadding} bg-accent/10 hover:bg-accent/20 transition-colors`}>
                  <IconComponent className={`${iconSizeClass} text-accent mb-1`} />
                  {size !== 'sm' && <p className="text-xs font-medium text-center text-accent-foreground truncate max-w-[60px]">{ach.name}</p>}
                </Card>
              </TooltipTrigger>
              <TooltipContent className="bg-background border-border shadow-lg">
                <p className="font-semibold text-foreground">{ach.name}</p>
                <p className="text-sm text-muted-foreground">{ach.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Earned: {new Date(ach.dateEarned).toLocaleDateString()}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
