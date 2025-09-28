import type { Event, EventFilters, EventSortOptions } from '@/lib/types';

export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  return events.filter(event => {
    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = event.name.toLowerCase().includes(query);
      const matchesDescription = event.description.toLowerCase().includes(query);
      const matchesLocation = event.location.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription && !matchesLocation) {
        return false;
      }
    }

    // Category filter
    if (filters.category && event.category !== filters.category) {
      return false;
    }

    // Status filter
    if (filters.status) {
      const now = new Date();
      const eventStartDate = event.startDate ? new Date(event.startDate) : new Date(event.date);
      const eventEndDate = event.endDate ? new Date(event.endDate) : new Date(event.date);
      
      switch (filters.status) {
        case 'upcoming':
          if (eventStartDate <= now) return false;
          break;
        case 'ongoing':
          if (eventStartDate > now || eventEndDate < now) return false;
          break;
        case 'completed':
          if (eventEndDate >= now) return false;
          break;
      }
    }

    // Date range filter
    if (filters.startDate) {
      const eventDate = event.startDate ? new Date(event.startDate) : new Date(event.date);
      if (eventDate < filters.startDate) {
        return false;
      }
    }

    if (filters.endDate) {
      const eventDate = event.endDate ? new Date(event.endDate) : new Date(event.date);
      if (eventDate > filters.endDate) {
        return false;
      }
    }

    // Location filter
    if (filters.location) {
      const locationQuery = filters.location.toLowerCase();
      if (!event.location.toLowerCase().includes(locationQuery)) {
        return false;
      }
    }

    // Organizer filter
    if (filters.organizer) {
      const organizerQuery = filters.organizer.toLowerCase();
      if (!event.organizer.toLowerCase().includes(organizerQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function sortEvents(events: Event[], sortBy: EventSortOptions): Event[] {
  const sortedEvents = [...events];

  switch (sortBy) {
    case 'date_asc':
      return sortedEvents.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date(a.date);
        const dateB = b.startDate ? new Date(b.startDate) : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

    case 'date_desc':
      return sortedEvents.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date(a.date);
        const dateB = b.startDate ? new Date(b.startDate) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    case 'name_asc':
      return sortedEvents.sort((a, b) => a.name.localeCompare(b.name));

    case 'name_desc':
      return sortedEvents.sort((a, b) => b.name.localeCompare(a.name));

    case 'created_desc':
      return sortedEvents.sort((a, b) => {
        const createdA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const createdB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return createdB.getTime() - createdA.getTime();
      });

    default:
      return sortedEvents;
  }
}

export function getEventStatus(event: Event): 'upcoming' | 'ongoing' | 'completed' {
  const now = new Date();
  const eventStartDate = event.startDate ? new Date(event.startDate) : new Date(event.date);
  const eventEndDate = event.endDate ? new Date(event.endDate) : new Date(event.date);

  if (eventStartDate > now) {
    return 'upcoming';
  } else if (eventStartDate <= now && eventEndDate >= now) {
    return 'ongoing';
  } else {
    return 'completed';
  }
}

export function getEventDuration(event: Event): string {
  if (!event.startDate || !event.endDate) {
    return 'Single day event';
  }

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return 'Single day event';
  } else if (diffDays <= 7) {
    return `${diffDays} days`;
  } else if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.ceil(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
}