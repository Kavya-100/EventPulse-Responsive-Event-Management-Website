import {
  AttendeeGrowthPoint,
  CustomEventAnalyticsSummary,
  EventItem,
  FilterState,
  FormValidationResult,
  GeoCoordinates,
  NearbyEventSuggestion,
  RegistrationRecord,
  ScheduledReminder,
  TicketSalesPoint,
  WaitlistEntry,
  EventComment,
  AuthSessionUser,
  SocialAuthProvider,
} from '../types/event';

const REGISTRATIONS_STORAGE_KEY = 'eventpulse_user_registrations_v1';
const WAITLIST_STORAGE_KEY = 'eventpulse_waitlist_v1';
const CUSTOM_EVENTS_STORAGE_KEY = 'eventpulse_custom_events_v1';
const REMINDERS_STORAGE_KEY = 'eventpulse_scheduled_reminders_v1';
const COMMENTS_STORAGE_KEY = 'eventpulse_event_comments_v1';
export const AUTH_SESSION_STORAGE_KEY = 'eventpulse_auth_session_v1';

/**
 * Validates the registration form inputs using strict client-side criteria.
 */
export function validateRegistrationForm(input: {
  fullName: string;
  email: string;
  phone: string;
  eventId: string;
  ticketCount: number;
  agreedToTerms: boolean;
}): FormValidationResult {
  const errors: Record<string, string> = {};

  // Full Name validation
  const trimmedName = input.fullName.trim();
  if (!trimmedName) {
    errors.fullName = 'Full name is required';
  } else if (trimmedName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
    errors.fullName = 'Full name should only contain letters and standard punctuation';
  }

  // Email validation
  const trimmedEmail = input.email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!trimmedEmail) {
    errors.email = 'Email address is required';
  } else if (!emailRegex.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address (e.g., name@domain.com)';
  }

  // Phone validation
  const trimmedPhone = input.phone.trim();
  const cleanPhone = trimmedPhone.replace(/[\s()-]/g, '');
  if (!trimmedPhone) {
    errors.phone = 'Contact phone number is required';
  } else if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
    errors.phone = 'Please provide a valid phone number (7 to 15 digits)';
  }

  // Event selection validation
  if (!input.eventId || input.eventId.trim() === '') {
    errors.eventId = 'Please select a valid event for registration';
  }

  // Ticket count validation
  if (!input.ticketCount || input.ticketCount < 1 || input.ticketCount > 5) {
    errors.ticketCount = 'You can register between 1 and 5 tickets per submission';
  }

  // Terms and conditions validation
  if (!input.agreedToTerms) {
    errors.agreedToTerms = 'You must accept the terms of service and attendee code of conduct';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Derives a broad geographic region from an event's city string (e.g. "San Francisco, CA" -> "North America").
 */
export function deriveRegionFromCity(city: string): string {
  const normalized = city.trim().toLowerCase();
  if (!normalized) return 'Other Regions';

  // Check country/region keywords first
  if (
    /\b(uk|united kingdom|england|scotland|wales|germany|france|spain|italy|netherlands|switzerland|sweden|norway|denmark|ireland|austria|belgium|portugal|poland|europe)\b/i.test(
      normalized
    )
  ) {
    return 'Europe';
  }

  if (
    /\b(japan|singapore|india|australia|new zealand|korea|china|taiwan|thailand|indonesia|vietnam|asia|pacific)\b/i.test(
      normalized
    )
  ) {
    return 'Asia-Pacific';
  }

  if (
    /\b(usa|united states|canada|mexico|north america)\b/i.test(normalized) ||
    /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$/i.test(
      city.trim()
    )
  ) {
    return 'North America';
  }

  return 'Other Regions';
}

/**
 * Extracts unique sorted cities and geographic regions from the active event list.
 */
export function extractLocationOptions(events: Pick<EventItem, 'city'>[]): {
  cities: string[];
  regions: string[];
} {
  const citySet = new Set<string>();
  const regionSet = new Set<string>();

  for (const event of events) {
    const trimmedCity = event.city.trim();
    if (trimmedCity) {
      citySet.add(trimmedCity);
      regionSet.add(deriveRegionFromCity(trimmedCity));
    }
  }

  return {
    cities: Array.from(citySet).sort((a, b) => a.localeCompare(b)),
    regions: Array.from(regionSet).sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Formats a location filter value for human-readable display.
 */
export function formatLocationFilterLabel(location: string): string {
  if (!location || location === 'All') return 'All Locations';
  if (location.startsWith('region:')) {
    return location.slice('region:'.length);
  }
  return location;
}

/**
 * Filters and sorts an array of events based on user search, category, location, pricing, and sort preferences.
 */
export function filterEvents(events: EventItem[], filters: FilterState): EventItem[] {
  const query = filters.search.trim().toLowerCase();
  const locationFilter = (filters.location || 'All').trim();

  return events
    .filter((event) => {
      // Category filter
      if (filters.category !== 'All' && event.category !== filters.category) {
        return false;
      }

      // Location filter (by derived region or exact city)
      if (locationFilter && locationFilter !== 'All') {
        if (locationFilter.startsWith('region:')) {
          const targetRegion = locationFilter.slice('region:'.length);
          if (deriveRegionFromCity(event.city) !== targetRegion) {
            return false;
          }
        } else if (event.city.trim().toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }

      // Price filter
      if (filters.priceFilter === 'Free' && event.price > 0) {
        return false;
      }
      if (filters.priceFilter === 'Paid' && event.price === 0) {
        return false;
      }

      // Search query filter (matches title, venue, city, description, or tags)
      if (query) {
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesVenue = event.venue.toLowerCase().includes(query);
        const matchesCity = event.city.toLowerCase().includes(query);
        const matchesDesc = event.shortDescription.toLowerCase().includes(query);
        const matchesTags = event.tags.some((tag) => tag.toLowerCase().includes(query));

        if (!matchesTitle && !matchesVenue && !matchesCity && !matchesDesc && !matchesTags) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'upcoming') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (filters.sortBy === 'popular') {
        const ratioA = a.capacity > 0 ? a.registeredCount / a.capacity : 0;
        const ratioB = b.capacity > 0 ? b.registeredCount / b.capacity : 0;
        return ratioB - ratioA;
      }
      if (filters.sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (filters.sortBy === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });
}

/**
 * Calculates countdown units remaining until a target ISO date string.
 */
export function calculateTimeRemaining(
  targetDateStr: string,
  currentTimestamp: number = Date.now()
): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  formatted: string;
} {
  const targetTime = new Date(targetDateStr).getTime();
  const diff = targetTime - currentTimestamp;

  if (isNaN(targetTime) || diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      formatted: 'Event Concluded',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m left`;
  } else {
    formatted = `${minutes}m ${seconds}s left`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isPast: false,
    formatted,
  };
}

/**
 * Generates an authentic ticket reference code (e.g. EP-8492-7A).
 */
export function generateTicketCode(eventId: string): string {
  const cleanId = eventId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'EVT';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EP-${cleanId}-${randomNum}-${randomSuffix}`;
}

/**
 * Generates an encrypted/structured payload string for the event ticket QR code.
 * Encodes essential check-in verification parameters.
 */
export function generateQRCodeData(ticket: RegistrationRecord): string {
  return JSON.stringify({
    schema: 'EVENTPULSE_CHECKIN_V1',
    code: ticket.ticketCode,
    eventId: ticket.eventId,
    event: ticket.eventTitle,
    attendee: ticket.fullName,
    email: ticket.email,
    tier: ticket.ticketType,
    qty: ticket.ticketCount,
    status: ticket.status,
    registered: ticket.registeredAt,
  });
}

/**
 * Generates a verification web URL for QR scanning devices.
 */
export function generateQRCodeCheckinURL(ticket: RegistrationRecord): string {
  return `https://eventpulse.app/checkin?code=${encodeURIComponent(ticket.ticketCode)}&event=${encodeURIComponent(ticket.eventId)}&t=${encodeURIComponent(ticket.id)}`;
}

/**
 * Generates a shareable application link for a ticket pass.
 */
export function generateShareableTicketURL(
  ticket: RegistrationRecord,
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'https://eventpulse.app'
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const params = new URLSearchParams({
    ticket: ticket.ticketCode,
    event: ticket.eventId,
    attendee: ticket.fullName,
    tier: ticket.ticketType,
  });
  return `${cleanOrigin}/?${params.toString()}`;
}

/**
 * LocalStorage Helpers for Registrations
 */
export function loadRegistrationsFromStorage(): RegistrationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RegistrationRecord[];
  } catch {
    return [];
  }
}

export function saveRegistrationsToStorage(records: RegistrationRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save registrations to localStorage:', err);
  }
}

/**
 * LocalStorage Helpers for Custom User-Created Events
 */
export function loadCustomEventsFromStorage(): EventItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EventItem[];
  } catch {
    return [];
  }
}

export function saveCustomEventsToStorage(events: EventItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save custom events to localStorage:', err);
  }
}

/**
  * Reminder & Browser Notification Helpers
  */
export function isReminderScheduled(eventId: string, reminders: ScheduledReminder[]): boolean {
  return reminders.some((r) => r.eventId === eventId);
}

export function addReminder(reminder: ScheduledReminder, existing: ScheduledReminder[]): ScheduledReminder[] {
  if (existing.some((r) => r.eventId === reminder.eventId)) {
    return existing;
  }
  return [...existing, reminder];
}

export function removeReminder(eventId: string, existing: ScheduledReminder[]): ScheduledReminder[] {
  return existing.filter((r) => r.eventId !== eventId);
}

export function calculateReminderDelay(
  eventDateStr: string,
  nowTimestamp: number = Date.now()
): { delayMs: number; isPast: boolean; formattedLeadTime: string } {
  const target = new Date(eventDateStr).getTime();
  const diff = target - nowTimestamp;
  if (isNaN(target) || diff <= 0) {
    return { delayMs: 0, isPast: true, formattedLeadTime: 'Event has concluded or started' };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  let formatted = '';
  if (days > 0) {
    formatted = `in ${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    formatted = `in ${hours}h ${mins}m`;
  } else {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    formatted = `in ${mins}m`;
  }
  return { delayMs: diff, isPast: false, formattedLeadTime: formatted };
}

export const REMINDER_LEAD_TIME_MINUTES = 5;

export function calculatePreEventReminderDelay(
  eventDateStr: string,
  leadMinutes: number = REMINDER_LEAD_TIME_MINUTES,
  nowTimestamp: number = Date.now()
): {
  delayMs: number;
  isPast: boolean;
  withinLeadWindow: boolean;
  notifyTimestamp: number;
  formattedNotifyLeadTime: string;
} {
  const target = new Date(eventDateStr).getTime();
  if (isNaN(target) || target <= nowTimestamp) {
    return {
      delayMs: 0,
      isPast: true,
      withinLeadWindow: false,
      notifyTimestamp: 0,
      formattedNotifyLeadTime: 'Event has concluded or started',
    };
  }

  const leadMs = Math.max(0, leadMinutes) * 60 * 1000;
  const notifyTimestamp = target - leadMs;
  const rawDelay = notifyTimestamp - nowTimestamp;

  if (rawDelay <= 0) {
    return {
      delayMs: 0,
      isPast: false,
      withinLeadWindow: true,
      notifyTimestamp,
      formattedNotifyLeadTime: 'now (within 5 minutes of start)',
    };
  }

  const hours = Math.floor(rawDelay / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  let formattedNotifyLeadTime = '';
  if (days > 0) {
    formattedNotifyLeadTime = `in ${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const mins = Math.floor((rawDelay % (1000 * 60 * 60)) / (1000 * 60));
    formattedNotifyLeadTime = `in ${hours}h ${mins}m`;
  } else {
    const mins = Math.max(1, Math.ceil(rawDelay / (1000 * 60)));
    formattedNotifyLeadTime = `in ${mins}m`;
  }

  return {
    delayMs: rawDelay,
    isPast: false,
    withinLeadWindow: false,
    notifyTimestamp,
    formattedNotifyLeadTime,
  };
}

export function loadRemindersFromStorage(): ScheduledReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScheduledReminder[];
  } catch {
    return [];
  }
}

export function saveRemindersToStorage(reminders: ScheduledReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (err) {
    console.error('Failed to save reminders to localStorage:', err);
  }
}

/**
 * Computes attendee growth and ticket sales trend datasets for user-created custom events.
 */
export function generateCustomEventAnalytics(
  customEvents: EventItem[],
  registrations: RegistrationRecord[],
  selectedEventId: string = 'all'
): CustomEventAnalyticsSummary {
  const targetEvents =
    selectedEventId && selectedEventId !== 'all'
      ? customEvents.filter((evt) => evt.id === selectedEventId)
      : customEvents;

  if (targetEvents.length === 0) {
    return {
      totalCustomEvents: 0,
      totalAttendees: 0,
      totalCapacity: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
      averageFillRate: 0,
      growthSeries: [],
      salesByEvent: [],
    };
  }

  const targetEventIds = new Set(targetEvents.map((e) => e.id));
  const matchingRegs = registrations.filter(
    (r) => targetEventIds.has(r.eventId) && r.status !== 'Cancelled'
  );

  const salesByEvent: TicketSalesPoint[] = targetEvents.map((evt) => {
    const evtRegs = matchingRegs.filter((r) => r.eventId === evt.id);
    const regTicketCount = evtRegs.reduce((sum, r) => sum + (r.ticketCount || 1), 0);
    const ticketsSold = Math.max(evt.registeredCount, regTicketCount);

    // Compute revenue using tier multipliers when registration records exist, else base price
    let revenue = 0;
    if (evtRegs.length > 0) {
      const tierRevenue = evtRegs.reduce((sum, r) => {
        const multiplier =
          r.ticketType === 'VIP Pass' ? 1.5 : r.ticketType === 'Student / Early Bird' ? 0.75 : 1;
        return sum + Math.round(evt.price * multiplier * (r.ticketCount || 1));
      }, 0);
      const unrecordedCount = Math.max(0, ticketsSold - regTicketCount);
      revenue = tierRevenue + unrecordedCount * evt.price;
    } else {
      revenue = ticketsSold * evt.price;
    }

    const fillRate = evt.capacity > 0 ? Math.min(100, Math.round((ticketsSold / evt.capacity) * 100)) : 0;
    const shortName = evt.title.length > 20 ? `${evt.title.slice(0, 18)}…` : evt.title;

    return {
      eventId: evt.id,
      name: shortName,
      fullTitle: evt.title,
      ticketsSold,
      capacity: evt.capacity,
      revenue,
      fillRate,
    };
  });

  const totalCustomEvents = targetEvents.length;
  const totalTicketsSold = salesByEvent.reduce((sum, item) => sum + item.ticketsSold, 0);
  const totalAttendees = totalTicketsSold;
  const totalCapacity = targetEvents.reduce((sum, evt) => sum + evt.capacity, 0);
  const totalRevenue = salesByEvent.reduce((sum, item) => sum + item.revenue, 0);
  const averageFillRate =
    totalCapacity > 0 ? Math.min(100, Math.round((totalAttendees / totalCapacity) * 100)) : 0;

  // Build deterministic 6-point attendee growth trend up to current totals
  const checkpoints = ['Launch', 'Day 3', 'Week 1', 'Week 2', 'Week 3', 'Current'];
  const curveWeights = [0, 0.14, 0.32, 0.56, 0.81, 1];
  const growthSeries: AttendeeGrowthPoint[] = checkpoints.map((period, idx) => {
    const weight = curveWeights[idx];
    const attendees =
      idx === checkpoints.length - 1
        ? totalAttendees
        : Math.round(totalAttendees * weight);
    const capacityTarget = Math.round(totalCapacity * ((idx + 1) / checkpoints.length));
    return {
      period,
      attendees,
      capacityTarget,
    };
  });

  return {
    totalCustomEvents,
    totalAttendees,
    totalCapacity,
    totalTicketsSold,
    totalRevenue,
    averageFillRate,
    growthSeries,
    salesByEvent,
  };
}

/**
 * Waitlist & Capacity Helpers
 */
export function isEventAtFullCapacity(
  event: Pick<EventItem, 'capacity' | 'registeredCount'>
): boolean {
  return event.capacity - event.registeredCount <= 0;
}

export function generateWaitlistCode(eventId: string): string {
  const cleanId = eventId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'EVT';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `WL-${cleanId}-${randomNum}-${randomSuffix}`;
}

export function calculateWaitlistPosition(
  eventId: string,
  existingWaitlist: WaitlistEntry[]
): number {
  return existingWaitlist.filter((entry) => entry.eventId === eventId).length + 1;
}

export function isAlreadyWaitlisted(
  eventId: string,
  email: string,
  existingWaitlist: WaitlistEntry[]
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return existingWaitlist.some(
    (entry) =>
      entry.eventId === eventId && entry.email.trim().toLowerCase() === normalizedEmail
  );
}

export function loadWaitlistFromStorage(): WaitlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaitlistEntry[];
  } catch {
    return [];
  }
}

export function saveWaitlistToStorage(entries: WaitlistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save waitlist entries to localStorage:', err);
  }
}

/**
 * Public Event Comments Helpers & LocalStorage Persistence
 */
export function validateCommentInput(input: {
  authorName: string;
  content: string;
}): FormValidationResult {
  const errors: Record<string, string> = {};
  const trimmedAuthor = input.authorName.trim();
  const trimmedContent = input.content.trim();

  if (!trimmedAuthor) {
    errors.authorName = 'Your name is required to post a comment';
  } else if (trimmedAuthor.length < 2) {
    errors.authorName = 'Name must be at least 2 characters';
  } else if (trimmedAuthor.length > 60) {
    errors.authorName = 'Name must be 60 characters or fewer';
  }

  if (!trimmedContent) {
    errors.content = 'Please write a comment before submitting';
  } else if (trimmedContent.length < 3) {
    errors.content = 'Comment must be at least 3 characters';
  } else if (trimmedContent.length > 500) {
    errors.content = 'Comment cannot exceed 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function createEventComment(input: {
  eventId: string;
  authorName: string;
  content: string;
}): EventComment {
  return {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventId: input.eventId,
    authorName: input.authorName.trim(),
    content: input.content.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function getCommentsForEvent(
  eventId: string,
  allComments: EventComment[]
): EventComment[] {
  return allComments
    .filter((comment) => comment.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteEventComment(
  commentId: string,
  allComments: EventComment[]
): EventComment[] {
  return allComments.filter((comment) => comment.id !== commentId);
}

export function formatCommentTimestamp(
  isoString: string,
  nowTimestamp: number = Date.now()
): string {
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return '';
  const diffSec = Math.max(0, Math.floor((nowTimestamp - time) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function loadCommentsFromStorage(): EventComment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EventComment[]) : [];
  } catch {
    return [];
  }
}

export function saveCommentsToStorage(comments: EventComment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  } catch (err) {
    console.error('Failed to save comments to localStorage:', err);
  }
}

/**
 * Monthly Calendar View Helpers
 */
export interface CalendarDayCell {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function toDateKey(dateInput: Date | string): string {
  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  const y = dateInput.getFullYear();
  const m = String(dateInput.getMonth() + 1).padStart(2, '0');
  const d = String(dateInput.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthCalendarCells(
  year: number,
  monthIndex: number,
  today: Date = new Date()
): CalendarDayCell[] {
  const todayKey = toDateKey(today);
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = startWeekday + daysInMonth > 35 ? 42 : 35;

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(year, monthIndex, 1 - startWeekday + i);
    const dateKey = toDateKey(cellDate);
    cells.push({
      dateKey,
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthIndex && cellDate.getFullYear() === year,
      isToday: dateKey === todayKey,
    });
  }
  return cells;
}

export function groupEventsByDate(
  events: EventItem[],
  registrations: RegistrationRecord[]
): {
  eventsByDate: Record<string, EventItem[]>;
  registeredEventIds: Set<string>;
} {
  const registeredEventIds = new Set(
    registrations
      .filter((r) => r.status !== 'Cancelled')
      .map((r) => r.eventId)
  );

  const eventsByDate: Record<string, EventItem[]> = {};
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const evt of sorted) {
    const key = toDateKey(evt.date);
    if (!key) continue;
    if (!eventsByDate[key]) {
      eventsByDate[key] = [];
    }
    eventsByDate[key].push(evt);
  }

  return { eventsByDate, registeredEventIds };
}

export function formatMonthYearLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Geolocation & Radius Discovery Helpers
 */
const KNOWN_CITY_COORDINATES: Record<string, GeoCoordinates> = {
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'oakland': { lat: 37.8044, lng: -122.2712 },
  'berkeley': { lat: 37.8715, lng: -122.273 },
  'san jose': { lat: 37.3382, lng: -121.8863 },
  'palo alto': { lat: 37.4419, lng: -122.143 },
  'asheville': { lat: 35.5951, lng: -82.5515 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'berlin': { lat: 52.52, lng: 13.405 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'brooklyn': { lat: 40.6782, lng: -73.9442 },
  'jersey city': { lat: 40.7178, lng: -74.0431 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'denver': { lat: 39.7392, lng: -104.9903 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
};

/**
 * Resolves coordinates for an event using explicit coordinates or falling back to city lookup.
 */
export function resolveEventCoordinates(
  event: Pick<EventItem, 'coordinates' | 'city'>
): GeoCoordinates | null {
  if (
    event.coordinates &&
    Number.isFinite(event.coordinates.lat) &&
    Number.isFinite(event.coordinates.lng)
  ) {
    return event.coordinates;
  }

  const normalizedCity = event.city.trim().toLowerCase();
  if (!normalizedCity) return null;

  const cityPrefix = normalizedCity.split(',')[0].trim();
  if (KNOWN_CITY_COORDINATES[cityPrefix]) {
    return KNOWN_CITY_COORDINATES[cityPrefix];
  }

  for (const [key, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (normalizedCity.includes(key)) {
      return coords;
    }
  }

  return null;
}

/**
 * Computes the great-circle distance in miles between two geographic coordinates using the Haversine formula.
 */
export function calculateDistanceMiles(
  origin: GeoCoordinates,
  destination: GeoCoordinates
): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_MILES * c * 10) / 10;
}

/**
 * Finds upcoming events within the specified radius (default 50 miles) of the user's current location,
 * sorted from closest to farthest.
 */
export function findNearbyUpcomingEvents(
  events: EventItem[],
  userLocation: GeoCoordinates,
  options: {
    radiusMiles?: number;
    excludeEventId?: string;
    nowTimestamp?: number;
  } = {}
): {
  nearby: NearbyEventSuggestion[];
  closestOutsideRadius: NearbyEventSuggestion | null;
} {
  const radiusMiles = options.radiusMiles ?? 50;
  const excludeEventId = options.excludeEventId;
  const nowTimestamp = options.nowTimestamp ?? Date.now();

  const candidates: NearbyEventSuggestion[] = [];

  for (const evt of events) {
    if (excludeEventId && evt.id === excludeEventId) continue;

    const eventTime = new Date(evt.date).getTime();
    if (isNaN(eventTime) || eventTime < nowTimestamp) continue;

    const coords = resolveEventCoordinates(evt);
    if (!coords) continue;

    const distanceMiles = calculateDistanceMiles(userLocation, coords);
    candidates.push({ event: evt, distanceMiles });
  }

  candidates.sort((a, b) => {
    if (a.distanceMiles !== b.distanceMiles) {
      return a.distanceMiles - b.distanceMiles;
    }
    return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
  });

  const nearby = candidates.filter((item) => item.distanceMiles <= radiusMiles);
  const closestOutsideRadius =
    nearby.length === 0 && candidates.length > 0 ? candidates[0] : null;

  return { nearby, closestOutsideRadius };
}

/**
 * Email Sharing Helpers (mailto: protocol)
 */
export function buildEventShareLink(
  eventId: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'https://eventpulse.app'
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/?event=${encodeURIComponent(eventId)}`;
}

export function buildShareEventMailtoHref(
  event: Pick<
    EventItem,
    'id' | 'title' | 'category' | 'formattedDate' | 'venue' | 'address' | 'city' | 'price' | 'shortDescription'
  >,
  shareLink?: string
): string {
  const link = shareLink || buildEventShareLink(event.id);
  const admissionText = event.price === 0 ? 'Free Entry' : `$${event.price} USD`;

  const subject = `Check out this event: ${event.title}`;
  const bodyLines = [
    `Hi,`,
    ``,
    `I thought you might be interested in attending "${event.title}" on EventPulse:`,
    ``,
    `Category: ${event.category} (${admissionText})`,
    `Date & Time: ${event.formattedDate}`,
    `Venue: ${event.venue}`,
    `Location: ${event.address}`,
    ``,
    `${event.shortDescription}`,
    ``,
    `View full event details & register: ${link}`,
  ];

  const body = bodyLines.join('\n');
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Local Storage Registration Data Management Helpers
 */
export function reconcileInitialEventCounts(
  baseEvents: EventItem[],
  registrations: RegistrationRecord[]
): EventItem[] {
  const countsByEvent: Record<string, number> = {};
  for (const reg of registrations) {
    if (reg.status === 'Cancelled') continue;
    countsByEvent[reg.eventId] = (countsByEvent[reg.eventId] || 0) + (reg.ticketCount || 1);
  }

  return baseEvents.map((evt) => {
    const added = countsByEvent[evt.id] || 0;
    if (added === 0) return evt;
    return {
      ...evt,
      registeredCount: Math.min(evt.capacity, evt.registeredCount + added),
    };
  });
}

export function updateRegistrationInList(
  ticketId: string,
  updates: Partial<
    Pick<RegistrationRecord, 'fullName' | 'email' | 'phone' | 'ticketType' | 'specialNotes'>
  >,
  existing: RegistrationRecord[]
): RegistrationRecord[] {
  return existing.map((record) => {
    if (record.id !== ticketId) return record;
    return {
      ...record,
      ...updates,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : record.fullName,
      email: updates.email !== undefined ? updates.email.trim() : record.email,
      phone: updates.phone !== undefined ? updates.phone.trim() : record.phone,
      specialNotes:
        updates.specialNotes !== undefined ? updates.specialNotes.trim() : record.specialNotes,
    };
  });
}

export function parseImportedRegistrationsJson(jsonText: string): {
  valid: boolean;
  records: RegistrationRecord[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      return { valid: false, records: [], error: 'Backup file must contain a JSON array of registrations.' };
    }

    const validRecords: RegistrationRecord[] = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.id !== 'string' ||
        typeof item.ticketCode !== 'string' ||
        typeof item.eventId !== 'string' ||
        typeof item.eventTitle !== 'string' ||
        typeof item.fullName !== 'string' ||
        typeof item.email !== 'string'
      ) {
        return {
          valid: false,
          records: [],
          error: 'One or more registration records are missing required fields.',
        };
      }
      validRecords.push(item as RegistrationRecord);
    }

    return { valid: true, records: validRecords };
  } catch {
    return { valid: false, records: [], error: 'Invalid JSON syntax in backup file.' };
  }
}

/**
 * Mock Social Media Authentication Helpers (Google & GitHub)
 */
export interface MockSocialAccountPreset {
  id: string;
  provider: SocialAuthProvider;
  fullName: string;
  email: string;
  username?: string;
  avatarColor: string;
  subtitle: string;
}

const MOCK_PROVIDER_ACCOUNTS: Record<SocialAuthProvider, MockSocialAccountPreset[]> = {
  google: [
    {
      id: 'google-usr-1',
      provider: 'google',
      fullName: 'Maya Lin',
      email: 'maya.lin@gmail.com',
      avatarColor: 'bg-indigo-600',
      subtitle: 'Verified Google Workspace Account',
    },
    {
      id: 'google-usr-2',
      provider: 'google',
      fullName: 'Jordan Taylor',
      email: 'jordan.taylor@gmail.com',
      avatarColor: 'bg-emerald-600',
      subtitle: 'Personal Google Account',
    },
  ],
  github: [
    {
      id: 'github-usr-1',
      provider: 'github',
      fullName: 'Alex Rivera',
      email: 'alex.rivera@users.noreply.github.com',
      username: 'arivera-dev',
      avatarColor: 'bg-stone-900',
      subtitle: 'GitHub Developer Profile (@arivera-dev)',
    },
    {
      id: 'github-usr-2',
      provider: 'github',
      fullName: 'Samira Patel',
      email: 'samira.patel@github.example.com',
      username: 'spatel-eng',
      avatarColor: 'bg-violet-700',
      subtitle: 'GitHub Open Source Maintainer (@spatel-eng)',
    },
  ],
};

export function getMockProviderAccounts(provider: SocialAuthProvider): MockSocialAccountPreset[] {
  return MOCK_PROVIDER_ACCOUNTS[provider] || [];
}

export function formatProviderLabel(provider: SocialAuthProvider): string {
  return provider === 'google' ? 'Google' : 'GitHub';
}

export function computeAvatarInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function createMockSocialSession(
  provider: SocialAuthProvider,
  profile: {
    fullName: string;
    email: string;
    username?: string;
    avatarColor?: string;
  },
  signedInAt: string = new Date().toISOString()
): AuthSessionUser {
  const fallback = MOCK_PROVIDER_ACCOUNTS[provider][0];
  const cleanName = profile.fullName.trim() || fallback.fullName;
  const cleanEmail = profile.email.trim() || fallback.email;
  const cleanUsername = profile.username?.trim() || (provider === 'github' ? cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);

  return {
    id: `auth-${provider}-${Date.now()}`,
    provider,
    fullName: cleanName,
    email: cleanEmail,
    username: cleanUsername,
    avatarInitials: computeAvatarInitials(cleanName),
    avatarColor: profile.avatarColor || fallback.avatarColor,
    signedInAt,
  };
}

export function loadAuthSessionFromStorage(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSessionUser;
    if (!parsed || typeof parsed !== 'object' || !parsed.email || !parsed.provider) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSessionToStorage(user: AuthSessionUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Failed to persist auth session to localStorage:', err);
  }
}

export function filterRegistrationsForAuthUser(
  user: AuthSessionUser | null,
  registrations: RegistrationRecord[]
): RegistrationRecord[] {
  if (!user) return registrations;
  const targetEmail = user.email.trim().toLowerCase();
  return registrations.filter((reg) => reg.email.trim().toLowerCase() === targetEmail);
}

/**
 * iCalendar (.ics) Export Helpers for Google Calendar & Apple Calendar
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function formatIcsUtcDate(dateInput: Date | string): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

export function buildEventIcsFilename(title: string, eventId: string = 'event'): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return `${slug || eventId || 'event'}.ics`;
}

export function buildEventIcsContent(
  event: Pick<
    EventItem,
    | 'id'
    | 'title'
    | 'category'
    | 'date'
    | 'venue'
    | 'address'
    | 'price'
    | 'shortDescription'
    | 'fullDescription'
    | 'organizer'
  >,
  options: {
    shareLink?: string;
    durationMinutes?: number;
    dtStamp?: Date | string;
  } = {}
): string {
  const parsedStart = new Date(event.date);
  const startDate = isNaN(parsedStart.getTime()) ? new Date() : parsedStart;
  const durationMs = Math.max(15, options.durationMinutes ?? 120) * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);
  const stampDate = options.dtStamp ? new Date(options.dtStamp) : new Date();
  const validStamp = isNaN(stampDate.getTime()) ? new Date() : stampDate;

  const link = options.shareLink || buildEventShareLink(event.id);
  const admissionText = event.price === 0 ? 'Free Entry' : `$${event.price} USD`;
  const summaryText = event.fullDescription || event.shortDescription;
  const descriptionBody = [
    summaryText,
    '',
    `Category: ${event.category} (${admissionText})`,
    `Organizer: ${event.organizer.name} (${event.organizer.email})`,
    `Event Link: ${link}`,
  ].join('\n');

  const uidSafe = event.id.replace(/[^a-zA-Z0-9._-]/g, '-') || 'event';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventPulse//Event Discovery Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uidSafe}@eventpulse.app`,
    `DTSTAMP:${formatIcsUtcDate(validStamp)}`,
    `DTSTART:${formatIcsUtcDate(startDate)}`,
    `DTEND:${formatIcsUtcDate(endDate)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionBody)}`,
    `LOCATION:${escapeIcsText(`${event.venue}, ${event.address}`)}`,
    `URL:${link}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

export function buildEventIcsDataUrl(icsContent: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}

/**
 * Custom Event Ownership & Drag-and-Drop Rescheduling Helpers
 */
export function isCustomEvent(event: Pick<EventItem, 'id'>): boolean {
  return event.id.startsWith('custom-');
}

export function isCustomEventOwner(
  event: Pick<EventItem, 'id' | 'ownerId' | 'ownerEmail' | 'organizer'>,
  currentUser: AuthSessionUser | null | undefined
): boolean {
  if (!isCustomEvent(event) || !currentUser) return false;
  if (event.ownerId && event.ownerId === currentUser.id) return true;
  const userEmail = currentUser.email.trim().toLowerCase();
  if (!userEmail) return false;
  if (event.ownerEmail && event.ownerEmail.trim().toLowerCase() === userEmail) return true;
  return event.organizer.email.trim().toLowerCase() === userEmail;
}

export function rescheduleEventDate(
  existingDate: string,
  targetDateKey: string
): { date: string; formattedDate: string } {
  const cleanTarget = targetDateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanTarget)) {
    throw new Error(`Invalid target date key: ${targetDateKey}`);
  }

  let newDateStr = '';
  const isoMatch = existingDate.trim().match(/^(\d{4}-\d{2}-\d{2})(T.*)$/);
  if (isoMatch) {
    newDateStr = `${cleanTarget}${isoMatch[2]}`;
  } else {
    const parsed = new Date(existingDate);
    if (!isNaN(parsed.getTime())) {
      const hh = String(parsed.getHours()).padStart(2, '0');
      const mm = String(parsed.getMinutes()).padStart(2, '0');
      newDateStr = `${cleanTarget}T${hh}:${mm}`;
    } else {
      newDateStr = `${cleanTarget}T10:00`;
    }
  }

  const parsedNew = new Date(newDateStr);
  const formattedDate = !isNaN(parsedNew.getTime())
    ? parsedNew.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : cleanTarget;

  return { date: newDateStr, formattedDate };
}

/**
 * Venue Coordinates & Static Map Graticule Helpers
 */
export interface FormattedCoordinates {
  decimal: string;
  dms: string;
  rawPair: string;
  latLabel: string;
  lngLabel: string;
}

function toDmsString(value: number, posHemisphere: string, negHemisphere: string): string {
  const hemisphere = value >= 0 ? posHemisphere : negHemisphere;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minFloat);
  const seconds = Math.round((minFloat - minutes) * 60);
  const finalSec = seconds === 60 ? 0 : seconds;
  const finalMin = seconds === 60 ? minutes + 1 : minutes;
  return `${degrees}°${String(finalMin).padStart(2, '0')}'${String(finalSec).padStart(2, '0')}"${hemisphere}`;
}

export function formatCoordinates(coords: GeoCoordinates): FormattedCoordinates {
  const latHem = coords.lat >= 0 ? 'N' : 'S';
  const lngHem = coords.lng >= 0 ? 'E' : 'W';
  const latLabel = `${Math.abs(coords.lat).toFixed(4)}° ${latHem}`;
  const lngLabel = `${Math.abs(coords.lng).toFixed(4)}° ${lngHem}`;

  return {
    decimal: `${latLabel}, ${lngLabel}`,
    dms: `${toDmsString(coords.lat, 'N', 'S')} · ${toDmsString(coords.lng, 'E', 'W')}`,
    rawPair: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    latLabel,
    lngLabel,
  };
}

export interface VenueGraticuleTick {
  posPct: number;
  label: string;
}

export interface VenueMapVisualizationData {
  parallels: VenueGraticuleTick[];
  meridians: VenueGraticuleTick[];
  scaleMeters: number;
  scaleLabel: string;
  blockOffsetX: number;
  blockOffsetY: number;
  arterialCurveOffset: number;
}

export function buildVenueMapVisualization(
  coords: GeoCoordinates,
  zoomLevel: number = 1,
  venueSeed: string = ''
): VenueMapVisualizationData {
  const clampedZoom = Math.max(0.8, Math.min(1.6, zoomLevel));
  // Base half-span in degrees (~0.008° ≈ 890m at zoom=1)
  const spanDeg = 0.008 / clampedZoom;

  const parallels: VenueGraticuleTick[] = [0.2, 0.5, 0.8].map((fraction) => {
    const offset = (0.5 - fraction) * 2 * spanDeg;
    const latVal = coords.lat + offset;
    const hem = latVal >= 0 ? 'N' : 'S';
    return {
      posPct: Math.round(fraction * 100),
      label: `${Math.abs(latVal).toFixed(3)}°${hem}`,
    };
  });

  const meridians: VenueGraticuleTick[] = [0.2, 0.5, 0.8].map((fraction) => {
    const offset = (fraction - 0.5) * 2 * spanDeg;
    const lngVal = coords.lng + offset;
    const hem = lngVal >= 0 ? 'E' : 'W';
    return {
      posPct: Math.round(fraction * 100),
      label: `${Math.abs(lngVal).toFixed(3)}°${hem}`,
    };
  });

  // Real ground width across ~18% of viewport calibrated by cos(latitude)
  const cosLat = Math.max(0.2, Math.cos((coords.lat * Math.PI) / 180));
  const rawMeters = spanDeg * 0.36 * 111320 * cosLat;
  const niceSteps = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
  const scaleMeters = niceSteps.reduce((best, candidate) =>
    Math.abs(candidate - rawMeters) < Math.abs(best - rawMeters) ? candidate : best
  );
  const scaleLabel = scaleMeters >= 1000 ? `${(scaleMeters / 1000).toFixed(1)} km` : `${scaleMeters} m`;

  // Deterministic visual geometry offsets seeded by coordinates + venue name
  let hash = Math.abs(Math.round((coords.lat * 1000 + coords.lng * 1000) * 13));
  for (let i = 0; i < venueSeed.length; i++) {
    hash = (hash * 31 + venueSeed.charCodeAt(i)) % 100000;
  }

  return {
    parallels,
    meridians,
    scaleMeters,
    scaleLabel,
    blockOffsetX: (hash % 24) - 12,
    blockOffsetY: ((hash >> 3) % 20) - 10,
    arterialCurveOffset: ((hash >> 5) % 40) - 20,
  };
}









