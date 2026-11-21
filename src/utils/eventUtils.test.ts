import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRegistrationForm,
  filterEvents,
  calculateTimeRemaining,
  generateTicketCode,
  generateQRCodeData,
  generateQRCodeCheckinURL,
  isReminderScheduled,
  addReminder,
  removeReminder,
  calculateReminderDelay,
  REMINDER_LEAD_TIME_MINUTES,
  calculatePreEventReminderDelay,
  generateShareableTicketURL,
  generateCustomEventAnalytics,
  isEventAtFullCapacity,
  generateWaitlistCode,
  calculateWaitlistPosition,
  isAlreadyWaitlisted,
  deriveRegionFromCity,
  extractLocationOptions,
  validateCommentInput,
  createEventComment,
  getCommentsForEvent,
  deleteEventComment,
  formatCommentTimestamp,
  toDateKey,
  getMonthCalendarCells,
  groupEventsByDate,
  resolveEventCoordinates,
  calculateDistanceMiles,
  findNearbyUpcomingEvents,
  buildEventShareLink,
  buildShareEventMailtoHref,
  reconcileInitialEventCounts,
  updateRegistrationInList,
  parseImportedRegistrationsJson,
  getMockProviderAccounts,
  formatProviderLabel,
  computeAvatarInitials,
  createMockSocialSession,
  filterRegistrationsForAuthUser,
  escapeIcsText,
  formatIcsUtcDate,
  buildEventIcsFilename,
  buildEventIcsContent,
  buildEventIcsDataUrl,
  isCustomEvent,
  isCustomEventOwner,
  rescheduleEventDate,
  formatCoordinates,
  buildVenueMapVisualization,
} from './eventUtils';
import { EventItem, FilterState, RegistrationRecord, WaitlistEntry } from '../types/event';

test('validateRegistrationForm: succeeds when all inputs are valid', () => {
  const result = validateRegistrationForm({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 555 123 4567',
    eventId: 'evt-1',
    ticketCount: 2,
    agreedToTerms: true,
  });

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test('validateRegistrationForm: rejects empty name and malformed email', () => {
  const result = validateRegistrationForm({
    fullName: '',
    email: 'not-an-email',
    phone: '123',
    eventId: '',
    ticketCount: 0,
    agreedToTerms: false,
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.fullName);
  assert.ok(result.errors.email);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.eventId);
  assert.ok(result.errors.ticketCount);
  assert.ok(result.errors.agreedToTerms);
});

test('filterEvents: filters by category and search term correctly', () => {
  const sampleEvents: EventItem[] = [
    {
      id: '1',
      title: 'Global AI Summit',
      category: 'Technology',
      date: '2026-11-20T10:00:00',
      formattedDate: 'Nov 20, 2026',
      venue: 'Moscone Center',
      city: 'San Francisco',
      address: '747 Howard St',
      image: '/sample.jpg',
      shortDescription: 'The premier AI conference.',
      fullDescription: 'Detailed overview of AI innovations.',
      price: 199,
      capacity: 500,
      registeredCount: 300,
      tags: ['AI', 'Tech', 'Neural Networks'],
      speakers: [],
      schedule: [],
      organizer: { name: 'TechEvents', email: 'info@techevents.org' },
    },
    {
      id: '2',
      title: 'Acoustic Sunset Fest',
      category: 'Music & Concerts',
      date: '2026-11-25T18:00:00',
      formattedDate: 'Nov 25, 2026',
      venue: 'Pier 39 Amphitheater',
      city: 'San Francisco',
      address: 'Beach Street & The Embarcadero',
      image: '/music.jpg',
      shortDescription: 'Live acoustic performances.',
      fullDescription: 'Sunset music festival.',
      price: 0,
      capacity: 1000,
      registeredCount: 950,
      tags: ['Music', 'Acoustic', 'Live'],
      speakers: [],
      schedule: [],
      organizer: { name: 'Sunset Records', email: 'music@sunset.org' },
    },
  ];

  const techFilters: FilterState = {
    search: '',
    category: 'Technology',
    location: 'All',
    priceFilter: 'All',
    sortBy: 'upcoming',
  };

  const techResult = filterEvents(sampleEvents, techFilters);
  assert.equal(techResult.length, 1);
  assert.equal(techResult[0].id, '1');

  const freeFilters: FilterState = {
    search: 'Sunset',
    category: 'All',
    location: 'All',
    priceFilter: 'Free',
    sortBy: 'upcoming',
  };

  const freeResult = filterEvents(sampleEvents, freeFilters);
  assert.equal(freeResult.length, 1);
  assert.equal(freeResult[0].id, '2');
});

test('calculateTimeRemaining: produces accurate days, hours, and detects past events', () => {
  const now = new Date('2026-11-09T14:00:00Z').getTime();
  const futureDate = '2026-11-12T16:30:00Z'; // 3 days, 2 hours, 30 minutes later

  const result = calculateTimeRemaining(futureDate, now);
  assert.equal(result.isPast, false);
  assert.equal(result.days, 3);
  assert.equal(result.hours, 2);
  assert.equal(result.minutes, 30);
  assert.ok(result.formatted.includes('3d 2h left'));

  const pastDate = '2026-10-01T00:00:00Z';
  const pastResult = calculateTimeRemaining(pastDate, now);
  assert.equal(pastResult.isPast, true);
  assert.equal(pastResult.formatted, 'Event Concluded');
});

test('generateTicketCode: produces unique format starting with EP', () => {
  const code1 = generateTicketCode('summit-2026');
  const code2 = generateTicketCode('summit-2026');

  assert.ok(code1.startsWith('EP-SUM-'));
  assert.ok(code2.startsWith('EP-SUM-'));
  assert.notEqual(code1, code2);
});

test('generateQRCodeData and checkinURL: produce structured and verifiable payload for registrations', () => {
  const sampleTicket = {
    id: 'reg-101',
    eventId: 'evt-ai-2026',
    eventTitle: 'AI Summit',
    eventDate: 'Nov 20, 2026',
    eventVenue: 'Moscone',
    eventCity: 'SF',
    ticketCode: 'EP-AI-9999-XYZ',
    fullName: 'David Smith',
    email: 'david@example.com',
    phone: '+1 555 456 7890',
    ticketType: 'VIP Pass' as const,
    ticketCount: 1,
    registeredAt: '2026-11-09T14:00:00Z',
    status: 'Confirmed' as const,
  };

  const raw = generateQRCodeData(sampleTicket);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.schema, 'EVENTPULSE_CHECKIN_V1');
  assert.equal(parsed.code, 'EP-AI-9999-XYZ');
  assert.equal(parsed.attendee, 'David Smith');
  assert.equal(parsed.email, 'david@example.com');

  const checkinUrl = generateQRCodeCheckinURL(sampleTicket);
  assert.ok(checkinUrl.startsWith('https://eventpulse.app/checkin?code=EP-AI-9999-XYZ'));
  assert.ok(checkinUrl.includes('event=evt-ai-2026'));
});

test('reminder helpers: add, remove, and detect reminders properly', () => {
  const reminder1 = {
    eventId: 'evt-101',
    eventTitle: 'Design Expo',
    eventDate: '2026-12-10T09:00:00Z',
    eventVenue: 'Kraftwerk',
    eventCity: 'Berlin',
    scheduledAt: '2026-11-09T14:00:00Z',
  };

  const list1 = addReminder(reminder1, []);
  assert.equal(list1.length, 1);
  assert.equal(isReminderScheduled('evt-101', list1), true);
  assert.equal(isReminderScheduled('evt-999', list1), false);

  // Adding same reminder does not duplicate
  const list2 = addReminder(reminder1, list1);
  assert.equal(list2.length, 1);

  // Removing reminder
  const list3 = removeReminder('evt-101', list2);
  assert.equal(list3.length, 0);
  assert.equal(isReminderScheduled('evt-101', list3), false);
});

test('calculateReminderDelay: computes lead time and detects passed events', () => {
  const baseTime = new Date('2026-11-09T12:00:00Z').getTime();
  const futureEvent = '2026-11-10T15:00:00Z'; // 1 day, 3 hours later
  const res = calculateReminderDelay(futureEvent, baseTime);
  assert.equal(res.isPast, false);
  assert.ok(res.delayMs > 0);
  assert.ok(res.formattedLeadTime.includes('1d 3h'));

  const pastEvent = '2026-10-01T12:00:00Z';
  const pastRes = calculateReminderDelay(pastEvent, baseTime);
  assert.equal(pastRes.isPast, true);
  assert.equal(pastRes.delayMs, 0);
});

test('generateShareableTicketURL: generates valid query-encoded share URL for a ticket', () => {
  const sampleTicket: RegistrationRecord = {
    id: 'reg-501',
    ticketCode: 'EP-CUS-1234-ABC',
    eventId: 'custom-170000',
    eventTitle: 'TypeScript Conf',
    eventDate: 'Dec 20, 2026',
    eventVenue: 'Civic Hall',
    eventCity: 'Seattle',
    fullName: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1 555 222 3333',
    ticketType: 'VIP Pass',
    ticketCount: 2,
    registeredAt: '2026-11-20T03:00:00Z',
    status: 'Confirmed',
  };

  const url = generateShareableTicketURL(sampleTicket, 'https://eventpulse.app/');
  assert.ok(url.startsWith('https://eventpulse.app/?'));
  assert.ok(url.includes('ticket=EP-CUS-1234-ABC'));
  assert.ok(url.includes('event=custom-170000'));
  assert.ok(url.includes('attendee=Alice+Johnson'));
});

test('generateCustomEventAnalytics: returns empty summary when no custom events exist and computes metrics when populated', () => {
  const empty = generateCustomEventAnalytics([], []);
  assert.equal(empty.totalCustomEvents, 0);
  assert.equal(empty.growthSeries.length, 0);
  assert.equal(empty.salesByEvent.length, 0);

  const customEvents: EventItem[] = [
    {
      id: 'custom-101',
      title: 'WebGL Shaders Workshop',
      category: 'Technology',
      date: '2026-12-20T10:00:00',
      formattedDate: 'Dec 20, 2026',
      venue: 'Tech Loft',
      city: 'Seattle, WA',
      address: '100 Pike St',
      image: '/sample.jpg',
      shortDescription: 'Shaders workshop',
      fullDescription: 'Deep dive into shaders',
      price: 100,
      capacity: 50,
      registeredCount: 2,
      tags: [],
      speakers: [],
      schedule: [],
      organizer: { name: 'Host', email: 'host@example.com' },
    },
  ];

  const regs: RegistrationRecord[] = [
    {
      id: 'reg-1',
      ticketCode: 'EP-CUS-9991-Z',
      eventId: 'custom-101',
      eventTitle: 'WebGL Shaders Workshop',
      eventDate: 'Dec 20, 2026',
      eventVenue: 'Tech Loft',
      eventCity: 'Seattle, WA',
      fullName: 'Bob Lee',
      email: 'bob@example.com',
      phone: '+1 555 000 1111',
      ticketType: 'VIP Pass',
      ticketCount: 2,
      registeredAt: '2026-11-20T03:00:00Z',
      status: 'Confirmed',
    },
  ];

  const summary = generateCustomEventAnalytics(customEvents, regs);
  assert.equal(summary.totalCustomEvents, 1);
  assert.equal(summary.totalAttendees, 2);
  assert.equal(summary.totalTicketsSold, 2);
  assert.equal(summary.totalRevenue, 300); // 100 * 1.5 (VIP) * 2 tickets
  assert.equal(summary.averageFillRate, 4);
  assert.equal(summary.growthSeries.length, 6);
  assert.equal(summary.growthSeries[5].attendees, 2);
  assert.equal(summary.salesByEvent.length, 1);
  assert.equal(summary.salesByEvent[0].ticketsSold, 2);
});

test('waitlist helpers: detect full capacity, generate WL codes, compute queue positions, and prevent duplicates', () => {
  assert.equal(isEventAtFullCapacity({ capacity: 150, registeredCount: 150 }), true);
  assert.equal(isEventAtFullCapacity({ capacity: 150, registeredCount: 160 }), true);
  assert.equal(isEventAtFullCapacity({ capacity: 150, registeredCount: 149 }), false);

  const wl1 = generateWaitlistCode('evt-leadership-summit-2026');
  const wl2 = generateWaitlistCode('evt-leadership-summit-2026');
  assert.ok(wl1.startsWith('WL-EVT-'));
  assert.notEqual(wl1, wl2);

  const existing: WaitlistEntry[] = [
    {
      id: 'wl-1',
      waitlistCode: wl1,
      eventId: 'evt-leadership-summit-2026',
      eventTitle: 'Executive Forum',
      eventDate: 'Dec 4, 2026',
      eventVenue: 'Bishopsgate',
      eventCity: 'London',
      fullName: 'Maya Patel',
      email: 'Maya.Patel@Example.com',
      phone: '+1 555 888 2211',
      preferredTicketType: 'VIP Pass',
      requestedTickets: 2,
      joinedAt: '2026-11-20T03:00:00Z',
      position: 1,
      status: 'Waitlisted',
    },
  ];

  assert.equal(calculateWaitlistPosition('evt-leadership-summit-2026', existing), 2);
  assert.equal(calculateWaitlistPosition('evt-other', existing), 1);
  assert.equal(isAlreadyWaitlisted('evt-leadership-summit-2026', 'maya.patel@example.com', existing), true);
  assert.equal(isAlreadyWaitlisted('evt-other', 'maya.patel@example.com', existing), false);
});

test('location helpers & filterEvents: extract cities/regions and filter by city or region', () => {
  assert.equal(deriveRegionFromCity('San Francisco, CA'), 'North America');
  assert.equal(deriveRegionFromCity('London, UK'), 'Europe');
  assert.equal(deriveRegionFromCity('Berlin, Germany'), 'Europe');
  assert.equal(deriveRegionFromCity('Tokyo, Japan'), 'Asia-Pacific');

  const baseEvent = {
    category: 'Technology' as const,
    date: '2026-12-01T10:00:00',
    formattedDate: 'Dec 1, 2026',
    venue: 'Hall A',
    address: '1 Main St',
    image: '/sample.jpg',
    shortDescription: 'Summary',
    fullDescription: 'Details',
    price: 50,
    capacity: 100,
    registeredCount: 40,
    tags: [],
    speakers: [],
    schedule: [],
    organizer: { name: 'Org', email: 'org@example.com' },
  };

  const sampleEvents: EventItem[] = [
    { ...baseEvent, id: 'e-sf', title: 'SF Event', city: 'San Francisco, CA' },
    { ...baseEvent, id: 'e-ldn', title: 'London Event', city: 'London, UK' },
    { ...baseEvent, id: 'e-ber', title: 'Berlin Event', city: 'Berlin, Germany', price: 0 },
  ];

  const options = extractLocationOptions(sampleEvents);
  assert.deepEqual(options.cities, ['Berlin, Germany', 'London, UK', 'San Francisco, CA']);
  assert.deepEqual(options.regions, ['Europe', 'North America']);

  const londonOnly = filterEvents(sampleEvents, {
    search: '',
    category: 'All',
    location: 'London, UK',
    priceFilter: 'All',
    sortBy: 'upcoming',
  });
  assert.deepEqual(londonOnly.map((e) => e.id), ['e-ldn']);

  const europeOnly = filterEvents(sampleEvents, {
    search: '',
    category: 'All',
    location: 'region:Europe',
    priceFilter: 'All',
    sortBy: 'upcoming',
  });
  assert.deepEqual(europeOnly.map((e) => e.id), ['e-ldn', 'e-ber']);

  const europeFree = filterEvents(sampleEvents, {
    search: '',
    category: 'All',
    location: 'region:Europe',
    priceFilter: 'Free',
    sortBy: 'upcoming',
  });
  assert.deepEqual(europeFree.map((e) => e.id), ['e-ber']);
});

test('comment helpers: validate, create, filter per event, format timestamps, and delete', () => {
  const invalid = validateCommentInput({ authorName: 'A', content: 'Hi' });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.authorName);
  assert.ok(invalid.errors.content);

  const valid = validateCommentInput({
    authorName: 'Lucas Vance',
    content: 'Excited for the keynote session!',
  });
  assert.equal(valid.isValid, true);

  const c1 = createEventComment({
    eventId: 'evt-1',
    authorName: '  Lucas Vance ',
    content: ' First comment ',
  });
  c1.createdAt = '2026-11-20T03:00:00Z';

  const c2 = createEventComment({
    eventId: 'evt-1',
    authorName: 'Elena',
    content: 'Second newer comment',
  });
  c2.createdAt = '2026-11-20T03:15:00Z';

  const cOther = createEventComment({
    eventId: 'evt-2',
    authorName: 'Mark',
    content: 'Comment for event 2',
  });

  const all = [c1, cOther, c2];
  const evt1Comments = getCommentsForEvent('evt-1', all);
  assert.equal(evt1Comments.length, 2);
  assert.equal(evt1Comments[0].id, c2.id); // newest first
  assert.equal(evt1Comments[1].authorName, 'Lucas Vance');

  const afterDelete = deleteEventComment(c2.id, all);
  assert.equal(getCommentsForEvent('evt-1', afterDelete).length, 1);

  assert.equal(
    formatCommentTimestamp('2026-11-20T03:14:30Z', new Date('2026-11-20T03:15:00Z').getTime()),
    'Just now'
  );
  assert.equal(
    formatCommentTimestamp('2026-11-20T03:10:00Z', new Date('2026-11-20T03:15:00Z').getTime()),
    '5m ago'
  );
});

test('calendar helpers: compute date keys, month cells, and group upcoming/registered events', () => {
  assert.equal(toDateKey('2026-11-28T16:30:00'), '2026-11-28');
  assert.equal(toDateKey(new Date(2026, 10, 20)), '2026-11-20');

  const novCells = getMonthCalendarCells(2026, 10, new Date(2026, 10, 20)); // Nov 2026 (starts Sunday)
  assert.equal(novCells.length, 35);
  assert.equal(novCells[0].dateKey, '2026-11-01');
  assert.equal(novCells[0].isCurrentMonth, true);
  assert.equal(novCells[19].dateKey, '2026-11-20');
  assert.equal(novCells[19].isToday, true);
  assert.equal(novCells[30].isCurrentMonth, false); // Dec 1 filler

  const evt1: EventItem = {
    id: 'evt-1',
    title: 'Nov Summit',
    category: 'Technology',
    date: '2026-11-20T09:00:00',
    formattedDate: 'Nov 20, 2026',
    venue: 'Hall A',
    city: 'San Francisco, CA',
    address: '1 Main St',
    image: '/sample.jpg',
    shortDescription: 'Summary',
    fullDescription: 'Details',
    price: 100,
    capacity: 200,
    registeredCount: 100,
    tags: [],
    speakers: [],
    schedule: [],
    organizer: { name: 'Org', email: 'org@example.com' },
  };
  const evt2: EventItem = { ...evt1, id: 'evt-2', title: 'Nov Folk', date: '2026-11-28T16:30:00' };

  const reg: RegistrationRecord = {
    id: 'reg-1',
    ticketCode: 'EP-EVT-1234-ABC',
    eventId: 'evt-2',
    eventTitle: 'Nov Folk',
    eventDate: 'Nov 28, 2026',
    eventVenue: 'Hall A',
    eventCity: 'San Francisco, CA',
    fullName: 'Sam Lee',
    email: 'sam@example.com',
    phone: '+1 555 222 1111',
    ticketType: 'General Admission',
    ticketCount: 1,
    registeredAt: '2026-11-20T03:00:00Z',
    status: 'Confirmed',
  };

  const { eventsByDate, registeredEventIds } = groupEventsByDate([evt1, evt2], [reg]);
  assert.equal(eventsByDate['2026-11-20'].length, 1);
  assert.equal(eventsByDate['2026-11-28'].length, 1);
  assert.equal(registeredEventIds.has('evt-2'), true);
  assert.equal(registeredEventIds.has('evt-1'), false);
});

test('geolocation helpers: resolve coordinates, compute Haversine miles, and suggest upcoming events within 50 miles', () => {
  const sfCoords = { lat: 37.7749, lng: -122.4194 };
  const oaklandCoords = { lat: 37.8044, lng: -122.2712 };
  const nycCoords = { lat: 40.7128, lng: -74.006 };

  const sfToOakland = calculateDistanceMiles(sfCoords, oaklandCoords);
  assert.ok(sfToOakland > 5 && sfToOakland < 15);

  const sfToNyc = calculateDistanceMiles(sfCoords, nycCoords);
  assert.ok(sfToNyc > 2500 && sfToNyc < 2600);

  const base = {
    category: 'Technology' as const,
    formattedDate: 'Dec 1, 2026',
    venue: 'Hall',
    address: '1 Main St',
    image: '/sample.jpg',
    shortDescription: 'Summary',
    fullDescription: 'Details',
    price: 25,
    capacity: 100,
    registeredCount: 20,
    tags: [],
    speakers: [],
    schedule: [],
    organizer: { name: 'Org', email: 'org@example.com' },
  };

  const now = new Date('2026-11-20T05:00:00Z').getTime();
  const events: EventItem[] = [
    { ...base, id: 'evt-current', title: 'SF Current', city: 'San Francisco, CA', date: '2026-11-25T10:00:00Z' },
    { ...base, id: 'evt-oak', title: 'Oakland Meetup', city: 'Oakland, CA', date: '2026-11-26T10:00:00Z' },
    { ...base, id: 'evt-sj', title: 'San Jose Conf', city: 'San Jose, CA', date: '2026-11-27T10:00:00Z' },
    { ...base, id: 'evt-past', title: 'SF Past Event', city: 'San Francisco, CA', date: '2026-11-01T10:00:00Z' },
    { ...base, id: 'evt-nyc', title: 'NYC Gala', city: 'New York, NY', date: '2026-12-01T10:00:00Z' },
  ];

  assert.deepEqual(resolveEventCoordinates(events[1]), { lat: 37.8044, lng: -122.2712 });

  const res = findNearbyUpcomingEvents(events, sfCoords, {
    radiusMiles: 50,
    excludeEventId: 'evt-current',
    nowTimestamp: now,
  });

  // Oakland (~8 mi) and San Jose (~42 mi) should match in distance order; evt-current, evt-past, and evt-nyc excluded
  assert.deepEqual(
    res.nearby.map((item) => item.event.id),
    ['evt-oak', 'evt-sj']
  );
  assert.ok(res.nearby[0].distanceMiles < res.nearby[1].distanceMiles);
  assert.ok(res.nearby.every((item) => item.distanceMiles <= 50));
  assert.equal(res.closestOutsideRadius, null);

  // When searching from Tokyo with no events within 50 miles, closestOutsideRadius is returned
  const tokyoRes = findNearbyUpcomingEvents(events, { lat: 35.6762, lng: 139.6503 }, {
    radiusMiles: 50,
    nowTimestamp: now,
  });
  assert.equal(tokyoRes.nearby.length, 0);
  assert.ok(tokyoRes.closestOutsideRadius);
});

test('email share helpers: generate event link and mailto: URI with event title, details, and link', () => {
  const link = buildEventShareLink('evt-ai-summit-2026', 'https://eventpulse.app/');
  assert.equal(link, 'https://eventpulse.app/?event=evt-ai-summit-2026');

  const href = buildShareEventMailtoHref(
    {
      id: 'evt-ai-summit-2026',
      title: 'International Innovation & AI Summit 2026',
      category: 'Technology',
      formattedDate: 'Fri, Nov 20, 2026 · 9:00 AM PST',
      venue: 'San Francisco Symphony Hall',
      address: '201 Van Ness Ave, San Francisco, CA 94102',
      city: 'San Francisco, CA',
      price: 249,
      shortDescription: 'Explore next-generation neural architectures and robotics.',
    },
    link
  );

  assert.ok(href.startsWith('mailto:?subject='));
  assert.ok(!href.includes('+'), 'mailto URI should percent-encode spaces cleanly without literal +');

  const queryPart = href.replace(/^mailto:\?/, '');
  const params = new URLSearchParams(queryPart);
  const subject = params.get('subject') || '';
  const body = params.get('body') || '';

  assert.ok(subject.includes('International Innovation & AI Summit 2026'));
  assert.ok(body.includes('International Innovation & AI Summit 2026'));
  assert.ok(body.includes('Fri, Nov 20, 2026 · 9:00 AM PST'));
  assert.ok(body.includes('San Francisco Symphony Hall'));
  assert.ok(body.includes('201 Van Ness Ave, San Francisco, CA 94102'));
  assert.ok(body.includes('Explore next-generation neural architectures and robotics.'));
  assert.ok(body.includes('https://eventpulse.app/?event=evt-ai-summit-2026'));
});

test('localStorage registration management helpers: reconcile seat counts, update records, and validate JSON imports', () => {
  const baseEvent: EventItem = {
    id: 'evt-1',
    title: 'Sample Summit',
    category: 'Technology',
    date: '2026-12-01T10:00:00Z',
    formattedDate: 'Dec 1, 2026',
    venue: 'Hall A',
    city: 'San Francisco, CA',
    address: '1 Main St',
    image: '/sample.jpg',
    shortDescription: 'Summary',
    fullDescription: 'Details',
    price: 100,
    capacity: 100,
    registeredCount: 40,
    tags: [],
    speakers: [],
    schedule: [],
    organizer: { name: 'Org', email: 'org@example.com' },
  };

  const regs: RegistrationRecord[] = [
    {
      id: 'reg-1',
      ticketCode: 'EP-EVT-1111-AAA',
      eventId: 'evt-1',
      eventTitle: 'Sample Summit',
      eventDate: 'Dec 1, 2026',
      eventVenue: 'Hall A',
      eventCity: 'San Francisco, CA',
      fullName: 'Alice Carter',
      email: 'alice@example.com',
      phone: '+1 555 111 2222',
      ticketType: 'General Admission',
      ticketCount: 3,
      registeredAt: '2026-11-20T05:00:00Z',
      status: 'Confirmed',
    },
  ];

  const reconciled = reconcileInitialEventCounts([baseEvent], regs);
  assert.equal(reconciled[0].registeredCount, 43);

  const updated = updateRegistrationInList(
    'reg-1',
    { fullName: '  Alice M. Carter ', ticketType: 'VIP Pass', specialNotes: 'Front row' },
    regs
  );
  assert.equal(updated[0].fullName, 'Alice M. Carter');
  assert.equal(updated[0].ticketType, 'VIP Pass');
  assert.equal(updated[0].specialNotes, 'Front row');

  const validImport = parseImportedRegistrationsJson(JSON.stringify(updated));
  assert.equal(validImport.valid, true);
  assert.equal(validImport.records.length, 1);

  const invalidImport = parseImportedRegistrationsJson('{"not":"an array"}');
  assert.equal(invalidImport.valid, false);
  assert.ok(invalidImport.error);
});

test('mock social auth helpers: provide Google/GitHub presets, build session users, and filter registrations', () => {
  assert.equal(formatProviderLabel('google'), 'Google');
  assert.equal(formatProviderLabel('github'), 'GitHub');
  assert.equal(computeAvatarInitials('Maya Lin'), 'ML');
  assert.equal(computeAvatarInitials('Alex'), 'AL');

  const googlePresets = getMockProviderAccounts('google');
  const githubPresets = getMockProviderAccounts('github');
  assert.ok(googlePresets.length >= 2);
  assert.ok(githubPresets.length >= 2);

  const ghSession = createMockSocialSession(
    'github',
    {
      fullName: '  Alex Rivera ',
      email: 'alex.rivera@users.noreply.github.com',
      username: 'arivera-dev',
    },
    '2026-11-21T10:00:00Z'
  );

  assert.equal(ghSession.provider, 'github');
  assert.equal(ghSession.fullName, 'Alex Rivera');
  assert.equal(ghSession.avatarInitials, 'AR');
  assert.equal(ghSession.username, 'arivera-dev');
  assert.equal(ghSession.signedInAt, '2026-11-21T10:00:00Z');

  const regs: RegistrationRecord[] = [
    {
      id: 'reg-1',
      ticketCode: 'EP-EVT-1001-AAA',
      eventId: 'evt-1',
      eventTitle: 'Summit A',
      eventDate: 'Dec 1, 2026',
      eventVenue: 'Hall A',
      eventCity: 'San Francisco, CA',
      fullName: 'Alex Rivera',
      email: 'Alex.Rivera@users.noreply.github.com',
      phone: '+1 555 000 1111',
      ticketType: 'General Admission',
      ticketCount: 1,
      registeredAt: '2026-11-21T10:05:00Z',
      status: 'Confirmed',
    },
    {
      id: 'reg-2',
      ticketCode: 'EP-EVT-1002-BBB',
      eventId: 'evt-2',
      eventTitle: 'Summit B',
      eventDate: 'Dec 5, 2026',
      eventVenue: 'Hall B',
      eventCity: 'London, UK',
      fullName: 'Maya Lin',
      email: 'maya.lin@gmail.com',
      phone: '+1 555 222 3333',
      ticketType: 'VIP Pass',
      ticketCount: 1,
      registeredAt: '2026-11-21T10:06:00Z',
      status: 'Confirmed',
    },
  ];

  const alexRegs = filterRegistrationsForAuthUser(ghSession, regs);
  assert.equal(alexRegs.length, 1);
  assert.equal(alexRegs[0].id, 'reg-1');

  const guestRegs = filterRegistrationsForAuthUser(null, regs);
  assert.equal(guestRegs.length, 2);
});

test('iCalendar (.ics) export helpers: format UTC dates, escape RFC 5545 text, and build downloadable .ics content', () => {
  assert.equal(formatIcsUtcDate('2026-11-28T16:30:00-05:00'), '20261128T213000Z');
  assert.equal(formatIcsUtcDate('invalid-date'), '');

  assert.equal(
    escapeIcsText('Line 1, with; semi\\slash\nLine 2'),
    'Line 1\\, with\\; semi\\\\slash\\nLine 2'
  );

  assert.equal(
    buildEventIcsFilename('Timber & Strings Sunset Folk Festival', 'evt-acoustic-sunset-2026'),
    'timber-strings-sunset-folk-festival.ics'
  );
  assert.equal(buildEventIcsFilename('!!!', 'evt-fallback'), 'evt-fallback.ics');

  const ics = buildEventIcsContent(
    {
      id: 'evt-acoustic-sunset-2026',
      title: 'Timber & Strings, Sunset Folk',
      category: 'Music & Concerts',
      date: '2026-11-28T16:30:00-05:00',
      venue: 'Pinecrest Meadow Amphitheater',
      address: '840 Meadow Ridge Pkwy, Asheville, NC 28804',
      price: 45,
      shortDescription: 'Open-air evening of acoustic indie-folk.',
      fullDescription: 'Join six ensembles; food trucks & cider.',
      organizer: {
        name: 'Blue Ridge Sound Foundation',
        email: 'events@blueridgesound.org',
      },
    },
    {
      shareLink: 'https://eventpulse.app/?event=evt-acoustic-sunset-2026',
      durationMinutes: 120,
      dtStamp: '2026-11-21T17:00:00Z',
    }
  );

  assert.ok(ics.includes('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('UID:evt-acoustic-sunset-2026@eventpulse.app\r\n'));
  assert.ok(ics.includes('DTSTAMP:20261121T170000Z\r\n'));
  assert.ok(ics.includes('DTSTART:20261128T213000Z\r\n'));
  assert.ok(ics.includes('DTEND:20261128T233000Z\r\n'));
  assert.ok(ics.includes('SUMMARY:Timber & Strings\\, Sunset Folk\r\n'));
  assert.ok(
    ics.includes('LOCATION:Pinecrest Meadow Amphitheater\\, 840 Meadow Ridge Pkwy\\, Asheville\\, NC 28804\r\n')
  );
  assert.ok(ics.includes('DESCRIPTION:Join six ensembles\\; food trucks & cider.'));
  assert.ok(ics.includes('URL:https://eventpulse.app/?event=evt-acoustic-sunset-2026\r\n'));
  assert.ok(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));

  const dataUrl = buildEventIcsDataUrl(ics);
  assert.ok(dataUrl.startsWith('data:text/calendar;charset=utf-8,'));
  assert.ok(decodeURIComponent(dataUrl.split(',')[1]).includes('BEGIN:VCALENDAR'));
});

test('custom event ownership and date rescheduling helpers: enforce owner access and preserve time when updating date', () => {
  const mayaSession = createMockSocialSession(
    'google',
    { fullName: 'Maya Lin', email: 'Maya.Lin@gmail.com' },
    '2026-11-21T10:00:00Z'
  );
  const alexSession = createMockSocialSession(
    'github',
    { fullName: 'Alex Rivera', email: 'alex.rivera@users.noreply.github.com' },
    '2026-11-21T10:05:00Z'
  );

  const builtInEvent = {
    id: 'evt-acoustic-sunset-2026',
    organizer: { name: 'Maya Lin', email: 'maya.lin@gmail.com' },
  };
  const customOwnedEvent = {
    id: 'custom-1763740000000',
    organizer: { name: 'Maya Lin', email: 'maya.lin@gmail.com' },
    ownerId: mayaSession.id,
    ownerEmail: 'maya.lin@gmail.com',
  };
  const legacyCustomEvent = {
    id: 'custom-1763740000001',
    organizer: { name: 'Maya Lin', email: 'maya.lin@gmail.com' },
  };

  assert.equal(isCustomEvent(builtInEvent), false);
  assert.equal(isCustomEvent(customOwnedEvent), true);

  // Built-in events are never owned for custom rescheduling
  assert.equal(isCustomEventOwner(builtInEvent, mayaSession), false);
  // Signed-out user is never owner
  assert.equal(isCustomEventOwner(customOwnedEvent, null), false);
  // Different signed-in user is not owner
  assert.equal(isCustomEventOwner(customOwnedEvent, alexSession), false);
  // Matching owner (both with explicit owner fields and organizer.email fallback) is allowed
  assert.equal(isCustomEventOwner(customOwnedEvent, mayaSession), true);
  assert.equal(isCustomEventOwner(legacyCustomEvent, mayaSession), true);

  // Rescheduling preserves time & timezone offset while updating the calendar day
  const rescheduledLocal = rescheduleEventDate('2026-12-20T14:30', '2026-12-28');
  assert.equal(rescheduledLocal.date, '2026-12-28T14:30');
  assert.ok(rescheduledLocal.formattedDate.includes('Dec 28, 2026'));

  const rescheduledOffset = rescheduleEventDate('2026-11-28T16:30:00-05:00', '2026-11-30');
  assert.equal(rescheduledOffset.date, '2026-11-30T16:30:00-05:00');
  assert.equal(toDateKey(rescheduledOffset.date), '2026-11-30');

  assert.throws(() => rescheduleEventDate('2026-12-20T14:30', 'invalid-key'));
});

test('calculatePreEventReminderDelay: schedules notification 5 minutes before event start time', () => {
  assert.equal(REMINDER_LEAD_TIME_MINUTES, 5);
  const now = new Date('2026-11-21T10:00:00Z').getTime();

  // Event starts 20 minutes from now -> notify 15 minutes from now (5 minutes before start)
  const twentyMinsFuture = '2026-11-21T10:20:00Z';
  const resFuture = calculatePreEventReminderDelay(twentyMinsFuture, 5, now);
  assert.equal(resFuture.isPast, false);
  assert.equal(resFuture.withinLeadWindow, false);
  assert.equal(resFuture.delayMs, 15 * 60 * 1000);
  assert.equal(resFuture.notifyTimestamp, new Date('2026-11-21T10:15:00Z').getTime());
  assert.equal(resFuture.formattedNotifyLeadTime, 'in 15m');

  // Event starts 3 minutes from now -> already inside 5-minute window
  const threeMinsFuture = '2026-11-21T10:03:00Z';
  const resWindow = calculatePreEventReminderDelay(threeMinsFuture, 5, now);
  assert.equal(resWindow.isPast, false);
  assert.equal(resWindow.withinLeadWindow, true);
  assert.equal(resWindow.delayMs, 0);

  // Event already started / past -> isPast is true
  const pastEvent = '2026-11-21T09:45:00Z';
  const resPast = calculatePreEventReminderDelay(pastEvent, 5, now);
  assert.equal(resPast.isPast, true);
  assert.equal(resPast.delayMs, 0);
});

test('coordinate formatting and static map graticule helpers: format N/S/E/W, DMS, and latitude-calibrated scale', () => {
  const sfFormatted = formatCoordinates({ lat: 37.7777, lng: -122.4207 });
  assert.equal(sfFormatted.decimal, '37.7777° N, 122.4207° W');
  assert.equal(sfFormatted.rawPair, '37.7777, -122.4207');
  assert.equal(sfFormatted.dms, `37°46'40"N · 122°25'15"W`);

  const seFormatted = formatCoordinates({ lat: -33.8688, lng: 151.2093 });
  assert.equal(seFormatted.latLabel, '33.8688° S');
  assert.equal(seFormatted.lngLabel, '151.2093° E');

  const vizDefault = buildVenueMapVisualization({ lat: 37.7777, lng: -122.4207 }, 1, 'SF Hall');
  assert.equal(vizDefault.parallels.length, 3);
  assert.equal(vizDefault.meridians.length, 3);
  assert.equal(vizDefault.parallels[1].label, '37.778°N');
  assert.equal(vizDefault.meridians[1].label, '122.421°W');
  assert.ok(vizDefault.scaleMeters > 0);
  assert.ok(vizDefault.scaleLabel.endsWith('m'));

  const vizZoomedIn = buildVenueMapVisualization({ lat: 37.7777, lng: -122.4207 }, 1.6, 'SF Hall');
  assert.ok(vizZoomedIn.scaleMeters <= vizDefault.scaleMeters);
});












