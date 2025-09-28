'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EventFilters, EventSortOptions, EventCategory } from '@/lib/types';

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  sortBy: EventSortOptions;
  onSortChange: (sort: EventSortOptions) => void;
  onClearFilters: () => void;
}

const categoryLabels: Record<EventCategory, string> = {
  beach_cleanup: 'Beach Cleanup',
  river_cleanup: 'River Cleanup',
  park_cleanup: 'Park Cleanup',
  street_cleanup: 'Street Cleanup',
  awareness_campaign: 'Awareness Campaign',
  tree_planting: 'Tree Planting',
  recycling_drive: 'Recycling Drive',
  educational_workshop: 'Educational Workshop',
};

export function EventFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  onClearFilters,
}: EventFiltersProps) {
  const hasActiveFilters = 
    filters.category ||
    filters.status ||
    filters.startDate ||
    filters.endDate ||
    filters.location ||
    filters.organizer ||
    filters.searchQuery;

  const updateFilter = (key: keyof EventFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="bg-card border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Filter Events</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Query */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Events</Label>
          <Input
            id="search"
            placeholder="Search by name or description..."
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => updateFilter('category', value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as EventSortOptions)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_asc">Date (Earliest First)</SelectItem>
              <SelectItem value="date_desc">Date (Latest First)</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="created_desc">Recently Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Start Date Filter */}
        <div className="space-y-2">
          <Label>Start Date (From)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate ? format(filters.startDate, 'PPP') : 'Select start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => updateFilter('startDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Filter */}
        <div className="space-y-2">
          <Label>End Date (To)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.endDate ? format(filters.endDate, 'PPP') : 'Select end date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => updateFilter('endDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Filter by location..."
            value={filters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value)}
          />
        </div>
      </div>

      {/* Organizer Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="organizer">Organizer</Label>
          <Input
            id="organizer"
            placeholder="Filter by organizer..."
            value={filters.organizer || ''}
            onChange={(e) => updateFilter('organizer', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}