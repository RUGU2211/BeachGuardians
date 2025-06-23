'use client';

import { WasteLogForm } from '@/components/waste/WasteLogForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Award } from 'lucide-react';

export default function WasteLoggingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Trash2 className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Log Your Waste</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Every piece of trash you collect makes a difference. Log your findings here to track our collective impact and earn points!
        </p>
      </div>
      
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>New Waste Log</CardTitle>
          <CardDescription>
            Fill in the details below to log the waste you've collected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WasteLogForm />
        </CardContent>
      </Card>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-yellow-500" />
            Points System
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>You'll earn <strong>10 points</strong> for every <strong>1 kilogram</strong> of waste you log. Every gram counts towards a cleaner planet and a higher spot on the leaderboard!</p>
        </CardContent>
      </Card>
    </div>
  );
}
