import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Recycle, Loader2 } from 'lucide-react';
import type { Event, WasteLog } from '@/lib/types';
import { getEventsByIds, getWasteLogsForUserByEvent } from '@/lib/firebase';

interface ContributionHistoryProps {
  eventIds: string[];
  userId: string;
}

export function ContributionHistory({ eventIds, userId }: ContributionHistoryProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [wasteLogs, setWasteLogs] = useState<Record<string, WasteLog[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventIds || eventIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      const fetchedEvents = await getEventsByIds(eventIds);
      setEvents(fetchedEvents);

      const wasteLogPromises = fetchedEvents.map(async (event) => {
        const logs = await getWasteLogsForUserByEvent(userId, event.id);
        return { eventId: event.id, logs };
      });

      const results = await Promise.all(wasteLogPromises);
      const logsByEvent: Record<string, WasteLog[]> = {};
      results.forEach(result => {
        logsByEvent[result.eventId] = result.logs;
      });
      setWasteLogs(logsByEvent);
      setLoading(false);
    };

    fetchHistory();
  }, [eventIds, userId]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading contribution history...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events attended yet. Join your first cleanup event!</p>;
  }

  const calculateTotalWasteForEvent = (eventId: string) => {
    return wasteLogs[eventId]?.reduce((acc, log) => acc + log.weightKg, 0) || 0;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {events.map((event) => (
        <AccordionItem value={event.id} key={event.id}>
          <AccordionTrigger>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full pr-4">
                <div className="text-left">
                    <p className="font-semibold text-md">{event.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-2" /> {new Date(event.date).toLocaleDateString()}
                    </p>
                </div>
                 <Badge variant="outline" className="mt-2 md:mt-0">
                    {calculateTotalWasteForEvent(event.id).toFixed(2)} kg collected
                </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="h-4 w-4 mr-2" /> {event.location}
                </p>
                <div>
                    <h4 className="font-semibold text-sm mb-2">Your logged waste:</h4>
                    {wasteLogs[event.id] && wasteLogs[event.id].length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 pl-2">
                        {wasteLogs[event.id].map(log => (
                            <li key={log.id} className="text-sm">
                            <span className="font-medium">{log.type}:</span> {log.weightKg} kg
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No specific waste logged for this event.</p>
                    )}
                </div>
                <Button variant="link" size="sm" className="p-0 h-auto">View Event Details</Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
} 