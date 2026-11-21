export type EventCategory = 
  | 'All'
  | 'Technology'
  | 'Music & Concerts'
  | 'Business & Leadership'
  | 'Design & Arts'
  | 'Sports & Wellness'
  | 'Culinary & Culture';

export interface Speaker {
  name: string;
  role: string;
  company: string;
  avatar?: string;
}

export interface ScheduleItem {
  time: string;
  session: string;
  speaker?: string;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface EventItem {
  id: string;
  title: string;
  category: Exclude<EventCategory, 'All'>;
  date: string; // ISO format: YYYY-MM-DDTHH:mm:ss
  formattedDate: string;
  venue: string;
  city: string;
  address: string;
  coordinates?: GeoCoordinates;
  image: string;
  shortDescription: string;
  fullDescription: string;
  price: number; // 0 indicates free
  capacity: number;
  registeredCount: number;
  featured?: boolean;
  tags: string[];
  speakers: Speaker[];
  schedule: ScheduleItem[];
  organizer: {
    name: string;
    email: string;
    phone?: string;
  };
  ownerId?: string;
  ownerEmail?: string;
}

export interface NearbyEventSuggestion {
  event: EventItem;
  distanceMiles: number;
}

export interface RegistrationRecord {
  id: string;
  ticketCode: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventCity: string;
  fullName: string;
  email: string;
  phone: string;
  ticketType: 'General Admission' | 'VIP Pass' | 'Student / Early Bird';
  ticketCount: number;
  specialNotes?: string;
  registeredAt: string;
  status: 'Confirmed' | 'Waitlisted' | 'Cancelled';
}

export interface FilterState {
  search: string;
  category: EventCategory;
  location: string;
  priceFilter: 'All' | 'Free' | 'Paid';
  sortBy: 'upcoming' | 'popular' | 'price-asc' | 'price-desc';
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ScheduledReminder {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventCity: string;
  scheduledAt: string;
  leadMinutes?: number;
}

export interface AttendeeGrowthPoint {
  period: string;
  attendees: number;
  capacityTarget: number;
}

export interface TicketSalesPoint {
  eventId: string;
  name: string;
  fullTitle: string;
  ticketsSold: number;
  capacity: number;
  revenue: number;
  fillRate: number;
}

export interface CustomEventAnalyticsSummary {
  totalCustomEvents: number;
  totalAttendees: number;
  totalCapacity: number;
  totalTicketsSold: number;
  totalRevenue: number;
  averageFillRate: number;
  growthSeries: AttendeeGrowthPoint[];
  salesByEvent: TicketSalesPoint[];
}

export interface WaitlistEntry {
  id: string;
  waitlistCode: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventCity: string;
  fullName: string;
  email: string;
  phone: string;
  preferredTicketType: RegistrationRecord['ticketType'];
  requestedTickets: number;
  specialNotes?: string;
  joinedAt: string;
  position: number;
  status: 'Waitlisted';
}

export interface EventComment {
  id: string;
  eventId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export type SocialAuthProvider = 'google' | 'github';

export interface AuthSessionUser {
  id: string;
  provider: SocialAuthProvider;
  fullName: string;
  email: string;
  username?: string;
  avatarInitials: string;
  avatarColor: string;
  signedInAt: string;
}

