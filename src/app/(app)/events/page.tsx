'use client';

import { EventCard } from '@/components/events/EventCard';
import { EventFilters as EventFiltersComponent } from '@/components/events/EventFilters';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Loader2, Filter, Grid, List } from 'lucide-react';
import { subscribeToEvents, db } from '@/lib/firebase';
import type { Event, EventFilters, EventSortOptions } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { filterEvents, sortEvents, getEventStatus } from '@/lib/event-filters';

export default function EventsPage() {
  const { userProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<EventFilters>({
    searchQuery: '',
    category: '',
    status: '',
    startDate: undefined,
    endDate: undefined,
    location: '',
    organizer: '',
  });
  const [sortBy, setSortBy] = useState<EventSortOptions>('date_asc');

  useEffect(() => {
    const unsubscribe = subscribeToEvents(
      (evts) => {
        setEvents(evts);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to events:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filtered = filterEvents(events, filters);
    const sorted = sortEvents(filtered, sortBy);
    setFilteredEvents(sorted);
  }, [events, filters, sortBy]);

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: EventSortOptions) => {
    setSortBy(newSort);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const upcomingEvents = filteredEvents.filter(event => getEventStatus(event) === 'upcoming');
  const ongoingEvents = filteredEvents.filter(event => getEventStatus(event) === 'ongoing');
  const pastEvents = filteredEvents.filter(event => getEventStatus(event) === 'completed');
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Beach Cleanup Events</h1>
          <p className="text-muted-foreground mt-2">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>

          {/* Create Event Button */}
          {isAdmin && (
            <Button asChild>
              <Link href="/events/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-6 bg-muted/50 rounded-lg border">
          <EventFiltersComponent
            filters={filters}
            sortBy={sortBy}
            onFiltersChange={handleFiltersChange}
            onSortChange={handleSortChange}
          />
        </div>
      )}

      {/* Events Content */}
      <div className="space-y-12">
        {/* Ongoing Events */}
        {ongoingEvents.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 font-headline flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              Ongoing Events ({ongoingEvents.length})
            </h2>
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {ongoingEvents.map(event => (
                <EventCard key={event.id} event={event} viewMode={viewMode} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section>
          <h2 className="text-2xl font-bold mb-6 font-headline">
            Upcoming Events ({upcomingEvents.length})
          </h2>
          {upcomingEvents.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-lg">No upcoming events match your filters.</p>
              <p className="text-muted-foreground/70 mt-2">Try adjusting your search criteria.</p>
            </div>
          )}
        </section>

        {/* Past Events */}
        <section>
          <h2 className="text-2xl font-bold mb-6 font-headline">
            Past Events ({pastEvents.length})
          </h2>
          {pastEvents.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {pastEvents.map(event => (
                <EventCard key={event.id} event={event} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-lg">No past events match your filters.</p>
            </div>
          )}
        </section>
      </div>

      {/* No Events Message */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4">No events found</h3>
            <p className="text-muted-foreground mb-6">
              No events match your current search criteria. Try adjusting your filters or search terms.
            </p>
            <Button
              onClick={() => setFilters({
                searchQuery: '',
                category: '',
                status: '',
                startDate: undefined,
                endDate: undefined,
                location: '',
                organizer: '',
              })}
              variant="outline"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
