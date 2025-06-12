import { WasteLogForm } from '@/components/waste/WasteLogForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export default function WasteLoggingPage() {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <Scale className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl font-headline">Log Collected Waste</CardTitle>
          <CardDescription>
            Help us track our impact by logging the type and weight of waste you've collected during an event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WasteLogForm />
        </CardContent>
      </Card>
      {/* Optionally, display recent logs by this user or from the selected event */}
    </div>
  );
}
