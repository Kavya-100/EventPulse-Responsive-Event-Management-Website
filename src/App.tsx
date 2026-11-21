/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthSessionUser, EventItem, FilterState, RegistrationRecord, ScheduledReminder, WaitlistEntry } from './types/event';
import { INITIAL_EVENTS } from './data/mockEvents';
import { resolveBundledEventImage } from './data/eventImages';
import { 
  filterEvents, 
  loadRegistrationsFromStorage, 
  saveRegistrationsToStorage,
  loadWaitlistFromStorage,
  saveWaitlistToStorage,
  loadCustomEventsFromStorage,
  saveCustomEventsToStorage,
  loadRemindersFromStorage,
  saveRemindersToStorage,
  addReminder,
  removeReminder,
  isReminderScheduled,
  REMINDER_LEAD_TIME_MINUTES,
  calculatePreEventReminderDelay,
  reconcileInitialEventCounts,
  updateRegistrationInList,
  loadAuthSessionFromStorage,
  saveAuthSessionToStorage,
  formatProviderLabel,
  filterRegistrationsForAuthUser,
  isCustomEventOwner,
  rescheduleEventDate,
} from './utils/eventUtils';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventFilters } from './components/EventFilters';
import { EventCard } from './components/EventCard';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { EventDetailModal } from './components/EventDetailModal';
import { RegistrationModal } from './components/RegistrationModal';
import { MyTicketsModal } from './components/MyTicketsModal';
import { CreateEventModal } from './components/CreateEventModal';
import { MyAnalyticsModal } from './components/MyAnalyticsModal';
import { ProjectDocsModal } from './components/ProjectDocsModal';
import { SocialAuthModal } from './components/SocialAuthModal';
import { Footer } from './components/Footer';
import { Sparkles, Calendar, Ticket, ArrowRight, PlusCircle, CheckCircle2, LayoutGrid, CalendarDays } from 'lucide-react';

export default function App() {
  // Theme state with local storage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('eventpulse_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('eventpulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('eventpulse_theme', 'light');
    }
  }, [darkMode]);

  // User's social auth session persisted in localStorage alongside registrations
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(() => {
    return loadAuthSessionFromStorage();
  });

  // User's tickets / registrations persisted in localStorage
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>(() => {
    return loadRegistrationsFromStorage();
  });

  // Events state: custom events combined with initial events reconciled against stored registrations
  const [events, setEvents] = useState<EventItem[]>(() => {
    const custom = loadCustomEventsFromStorage().map((evt) => ({
      ...evt,
      image: resolveBundledEventImage(evt.image, evt.category),
    }));
    const storedRegs = loadRegistrationsFromStorage();
    const reconciledInitial = reconcileInitialEventCounts(INITIAL_EVENTS, storedRegs);
    return [...custom, ...reconciledInitial];
  });

  // User's waitlist entries (stored separately in localStorage)
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>(() => {
    return loadWaitlistFromStorage();
  });

  // User's event reminders persisted in localStorage and managed at the App level
  const [reminders, setReminders] = useState<ScheduledReminder[]>(() => {
    return loadRemindersFromStorage();
  });
  const [notificationPermissionTick, setNotificationPermissionTick] = useState(0);

  // Filter & Search State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    location: 'All',
    priceFilter: 'All',
    sortBy: 'upcoming',
  });
  const [catalogView, setCatalogView] = useState<'grid' | 'calendar'>('grid');

  // Modals state
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);
  const [selectedEventForReg, setSelectedEventForReg] = useState<EventItem | null>(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Toast / notification feedback
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Schedule browser notifications 5 minutes before each reminded event's start time
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const timers: number[] = [];

    reminders.forEach((r) => {
      const { delayMs, isPast, withinLeadWindow } = calculatePreEventReminderDelay(
        r.eventDate,
        r.leadMinutes ?? REMINDER_LEAD_TIME_MINUTES
      );
      if (!isPast && !withinLeadWindow && delayMs > 0 && delayMs < 2147483647) {
        const timerId = window.setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`🔔 Starting in 5 Minutes: ${r.eventTitle}`, {
                body: `Event begins soon at ${r.eventVenue}, ${r.eventCity}. Have your digital ticket ready!`,
                tag: `eventpulse-reminder-5m-${r.eventId}`,
              });
            } catch (e) {
              console.error('Error firing 5-minute pre-event reminder:', e);
            }
          }
        }, delayMs);
        timers.push(timerId);
      }
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [reminders, notificationPermissionTick]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, filters);
  }, [events, filters]);

  // Custom events created by the user
  const customEvents = useMemo(() => {
    return events.filter((e) => e.id.startsWith('custom-'));
  }, [events]);

  // Featured marquee events
  const featuredEvents = useMemo(() => {
    return events.filter((e) => e.featured);
  }, [events]);

  const userTicketsCount = useMemo(() => {
    if (!currentUser) return registrations.length;
    return filterRegistrationsForAuthUser(currentUser, registrations).length;
  }, [currentUser, registrations]);

  // Check for incoming shared ticket or shared event link parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('ticket');
    const sharedEventId = params.get('event');
    if (sharedCode) {
      const attendee = params.get('attendee');
      showNotification(
        attendee
          ? `Shared ticket verified: ${sharedCode} (${attendee})`
          : `Shared ticket verified: ${sharedCode}`
      );
    } else if (sharedEventId) {
      const matchedEvent = events.find((e) => e.id === sharedEventId);
      if (matchedEvent) {
        setSelectedEventForDetail(matchedEvent);
      }
    }
  }, []);

  // Handle new registration
  const handleRegistrationSuccess = (newTicket: RegistrationRecord) => {
    const updated = [newTicket, ...registrations];
    setRegistrations(updated);
    saveRegistrationsToStorage(updated);

    // Increment registered count for the event and sync custom events storage
    setEvents((prev) => {
      const nextEvents = prev.map((e) => {
        if (e.id === newTicket.eventId) {
          return {
            ...e,
            registeredCount: Math.min(e.capacity, e.registeredCount + newTicket.ticketCount),
          };
        }
        return e;
      });
      saveCustomEventsToStorage(nextEvents.filter((e) => e.id.startsWith('custom-')));
      return nextEvents;
    });

    showNotification(`Ticket confirmed for ${newTicket.eventTitle}! Pass saved to My Tickets.`);
  };

  // Handle cancellation of registration
  const handleCancelRegistration = (ticketId: string) => {
    const ticketToCancel = registrations.find((t) => t.id === ticketId);
    if (!ticketToCancel) return;

    const updated = registrations.filter((t) => t.id !== ticketId);
    setRegistrations(updated);
    saveRegistrationsToStorage(updated);

    // Decrement event registered count and sync custom events storage
    setEvents((prev) => {
      const nextEvents = prev.map((e) => {
        if (e.id === ticketToCancel.eventId) {
          return {
            ...e,
            registeredCount: Math.max(0, e.registeredCount - ticketToCancel.ticketCount),
          };
        }
        return e;
      });
      saveCustomEventsToStorage(nextEvents.filter((e) => e.id.startsWith('custom-')));
      return nextEvents;
    });

    showNotification(`Registration cancelled for ${ticketToCancel.eventTitle}.`);
  };

  // Handle updating attendee details/tier on an existing stored registration
  const handleUpdateRegistration = (
    ticketId: string,
    updates: Partial<Pick<RegistrationRecord, 'fullName' | 'email' | 'phone' | 'ticketType' | 'specialNotes'>>
  ) => {
    const updated = updateRegistrationInList(ticketId, updates, registrations);
    setRegistrations(updated);
    saveRegistrationsToStorage(updated);
    showNotification('Stored registration details updated in local storage.');
  };

  // Handle importing a JSON backup of registrations
  const handleImportRegistrations = (importedRecords: RegistrationRecord[]) => {
    const existingIds = new Set(registrations.map((r) => r.id));
    const newUnique = importedRecords.filter((r) => !existingIds.has(r.id));
    const merged = [...newUnique, ...registrations];
    setRegistrations(merged);
    saveRegistrationsToStorage(merged);

    const custom = loadCustomEventsFromStorage().map((evt) => ({
      ...evt,
      image: resolveBundledEventImage(evt.image, evt.category),
    }));
    const reconciledInitial = reconcileInitialEventCounts(INITIAL_EVENTS, merged);
    setEvents([...custom, ...reconciledInitial]);
    showNotification(`Imported ${newUnique.length} registration record${newUnique.length === 1 ? '' : 's'} into local storage.`);
  };

  // Handle clearing all locally stored registrations
  const handleClearAllRegistrations = () => {
    setRegistrations([]);
    saveRegistrationsToStorage([]);
    const custom = loadCustomEventsFromStorage().map((evt) => ({
      ...evt,
      image: resolveBundledEventImage(evt.image, evt.category),
    }));
    setEvents([...custom, ...INITIAL_EVENTS]);
    showNotification('All locally stored registrations cleared.');
  };

  // Handle mock social login & logout
  const handleAuthSuccess = (user: AuthSessionUser) => {
    setCurrentUser(user);
    saveAuthSessionToStorage(user);
    showNotification(`Signed in with ${formatProviderLabel(user.provider)} as ${user.fullName}.`);
  };

  const handleSignOut = () => {
    const previousName = currentUser?.fullName;
    setCurrentUser(null);
    saveAuthSessionToStorage(null);
    showNotification(previousName ? `Signed out of ${previousName}'s session.` : 'Signed out.');
  };

  // Handle adding a waitlist entry for a full-capacity event
  const handleWaitlistSuccess = (entry: WaitlistEntry) => {
    const updated = [entry, ...waitlistEntries];
    setWaitlistEntries(updated);
    saveWaitlistToStorage(updated);
    showNotification(`Added to waitlist for ${entry.eventTitle} (Position #${entry.position}).`);
  };

  // Handle removing a waitlist entry
  const handleLeaveWaitlist = (waitlistId: string) => {
    const target = waitlistEntries.find((w) => w.id === waitlistId);
    if (!target) return;

    const remaining = waitlistEntries.filter((w) => w.id !== waitlistId);
    // Re-index queue positions cleanly per event
    const eventCounters: Record<string, number> = {};
    const reindexed = [...remaining]
      .reverse()
      .map((entry) => {
        eventCounters[entry.eventId] = (eventCounters[entry.eventId] || 0) + 1;
        return { ...entry, position: eventCounters[entry.eventId] };
      })
      .reverse();

    setWaitlistEntries(reindexed);
    saveWaitlistToStorage(reindexed);
    showNotification(`Removed from waitlist for ${target.eventTitle}.`);
  };

  // Handle custom event creation
  const handleEventCreated = (newEvent: EventItem) => {
    const updated = [newEvent, ...events];
    setEvents(updated);
    const customList = loadCustomEventsFromStorage();
    saveCustomEventsToStorage([newEvent, ...customList]);
    showNotification(`"${newEvent.title}" published successfully to the event catalog!`);
    
    // Smooth scroll down to catalog
    const catalogEl = document.getElementById('events-catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle organizer drag-and-drop rescheduling of owned custom events in MonthlyCalendarView
  const handleRescheduleCustomEvent = (eventId: string, targetDateKey: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent || !isCustomEventOwner(targetEvent, currentUser)) {
      showNotification('Only the signed-in event owner can reschedule a custom event.');
      return;
    }

    const { date, formattedDate } = rescheduleEventDate(targetEvent.date, targetDateKey);

    setEvents((prev) => {
      const nextEvents = prev.map((e) =>
        e.id === eventId ? { ...e, date, formattedDate } : e
      );
      saveCustomEventsToStorage(nextEvents.filter((e) => e.id.startsWith('custom-')));
      return nextEvents;
    });

    if (selectedEventForDetail?.id === eventId) {
      setSelectedEventForDetail((prev) => (prev ? { ...prev, date, formattedDate } : prev));
    }

    // Keep stored registration and reminder dates synced if present
    setRegistrations((prev) => {
      if (!prev.some((r) => r.eventId === eventId)) return prev;
      const updated = prev.map((r) =>
        r.eventId === eventId ? { ...r, eventDate: formattedDate } : r
      );
      saveRegistrationsToStorage(updated);
      return updated;
    });

    setReminders((prev) => {
      if (!prev.some((r) => r.eventId === eventId)) return prev;
      const updated = prev.map((r) =>
        r.eventId === eventId ? { ...r, eventDate: date } : r
      );
      saveRemindersToStorage(updated);
      return updated;
    });

    showNotification(`Rescheduled "${targetEvent.title}" to ${formattedDate}.`);
  };

  // Toggle an event reminder (saved in localStorage, notifies 5 minutes before event start time)
  const handleToggleReminder = async (
    targetEvent: EventItem
  ): Promise<{ type: 'success' | 'info' | 'error'; message: string }> => {
    if (isReminderScheduled(targetEvent.id, reminders)) {
      const updated = removeReminder(targetEvent.id, reminders);
      setReminders(updated);
      saveRemindersToStorage(updated);
      showNotification(`5-minute reminder cancelled for ${targetEvent.title}.`);
      return {
        type: 'info',
        message: 'Browser alert reminder cancelled for this event.',
      };
    }

    const newReminder: ScheduledReminder = {
      eventId: targetEvent.id,
      eventTitle: targetEvent.title,
      eventDate: targetEvent.date,
      eventVenue: targetEvent.venue,
      eventCity: targetEvent.city,
      scheduledAt: new Date().toISOString(),
      leadMinutes: REMINDER_LEAD_TIME_MINUTES,
    };

    const updated = addReminder(newReminder, reminders);
    setReminders(updated);
    saveRemindersToStorage(updated);

    const { isPast, withinLeadWindow, formattedNotifyLeadTime } = calculatePreEventReminderDelay(
      targetEvent.date,
      REMINDER_LEAD_TIME_MINUTES
    );

    let hasNotificationPermission = false;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      let currentPerm: NotificationPermission = Notification.permission;
      if (currentPerm === 'default') {
        try {
          currentPerm = await Notification.requestPermission();
          setNotificationPermissionTick((n) => n + 1);
        } catch (err) {
          console.warn('Notification permission error:', err);
          currentPerm = 'denied';
        }
      }

      if (currentPerm === 'granted') {
        hasNotificationPermission = true;
        try {
          if (withinLeadWindow && !isPast) {
            new Notification(`🔔 Starting in Under 5 Minutes: ${targetEvent.title}`, {
              body: `Event begins soon at ${targetEvent.venue}, ${targetEvent.city}!`,
              icon: targetEvent.image,
              tag: `eventpulse-reminder-5m-${targetEvent.id}`,
            });
          } else {
            new Notification(`Reminder Set: ${targetEvent.title}`, {
              body: isPast
                ? 'Reminder saved (event start time has passed).'
                : `Browser notification scheduled ${formattedNotifyLeadTime} (5 minutes before start time).`,
              icon: targetEvent.image,
              tag: `eventpulse-confirm-${targetEvent.id}`,
            });
          }
        } catch (e) {
          console.warn('Could not dispatch browser notification:', e);
        }
      }
    }

    showNotification(`Reminder saved for ${targetEvent.title} (alerts 5 min before start).`);

    if (hasNotificationPermission) {
      return {
        type: 'success',
        message: isPast
          ? 'Reminder saved to local storage (event date has concluded).'
          : withinLeadWindow
          ? 'Reminder saved! Event starts within 5 minutes — browser notification sent now.'
          : `Reminder saved! Browser notification scheduled ${formattedNotifyLeadTime} (5 minutes before start time).`,
      };
    }

    return {
      type: 'success',
      message:
        'Reminder saved to local storage! Enable browser notifications in site settings to receive the 5-minute pre-event alert.',
    };
  };

  const handleOpenRegistration = (event: EventItem) => {
    setSelectedEventForReg(event);
    setIsRegModalOpen(true);
  };

  const handleNavigateSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-200">
      
      {/* Toast Notification Alert */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-3 rounded-xl shadow-lg border border-stone-700 dark:border-stone-200 flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        myTicketsCount={registrations.length}
        userTicketsCount={userTicketsCount}
        customEventsCount={customEvents.length}
        currentUser={currentUser}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
        onOpenMyAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenCreateEvent={() => setIsCreateEventOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onNavigateSection={handleNavigateSection}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <HeroSection
          searchQuery={filters.search}
          onSearchChange={(q) => setFilters((prev) => ({ ...prev, search: q }))}
          onSearchSubmit={() => handleNavigateSection('events-catalog')}
          onExploreClick={() => handleNavigateSection('events-catalog')}
          marqueeEvent={featuredEvents[0]}
          onSelectFeaturedEvent={(evt) => setSelectedEventForDetail(evt)}
        />

        {/* Section 1: Featured Marquee Events */}
        <section id="featured-events" className="py-12 bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Curated Highlights</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                  Featured & Marquee Gatherings
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  High-demand flagship events with limited seating and verified industry speakers.
                </p>
              </div>

              <button
                onClick={() => handleNavigateSection('events-catalog')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Featured Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  onSelectEvent={(e) => setSelectedEventForDetail(e)}
                  onRegisterClick={(e) => handleOpenRegistration(e)}
                />
              ))}
            </div>

          </div>
        </section>

        {/* Section 2: Full Events Catalog with Interactive Filters */}
        <section id="events-catalog" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Browse & Search
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                Upcoming Events Calendar
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Explore events across technology, music, executive leadership, arts, athletics, and cuisine.
              </p>
            </div>

            {/* Grid vs Monthly Calendar Layout Toggle */}
            <div
              role="group"
              aria-label="Event catalog layout view"
              className="inline-flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl self-start sm:self-auto"
            >
              <button
                type="button"
                onClick={() => setCatalogView('grid')}
                aria-pressed={catalogView === 'grid'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  catalogView === 'grid'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogView('calendar')}
                aria-pressed={catalogView === 'calendar'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  catalogView === 'calendar'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* Interactive Filters Bar */}
          <EventFilters
            filters={filters}
            events={events}
            onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
            onReset={() =>
              setFilters({
                search: '',
                category: 'All',
                location: 'All',
                priceFilter: 'All',
                sortBy: 'upcoming',
              })
            }
            totalResultsCount={filteredEvents.length}
          />

          {/* Events Grid, Calendar View, or Empty State */}
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                No events found matching your criteria
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Try clearing your search term, switching categories or locations, or resetting the price filter to view all available events.
              </p>
              <button
                onClick={() =>
                  setFilters({
                    search: '',
                    category: 'All',
                    location: 'All',
                    priceFilter: 'All',
                    sortBy: 'upcoming',
                  })
                }
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : catalogView === 'calendar' ? (
            <MonthlyCalendarView
              events={filteredEvents}
              registrations={registrations}
              currentUser={currentUser}
              onSelectEvent={(e) => setSelectedEventForDetail(e)}
              onRegisterClick={(e) => handleOpenRegistration(e)}
              onRescheduleEvent={handleRescheduleCustomEvent}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  onSelectEvent={(e) => setSelectedEventForDetail(e)}
                  onRegisterClick={(e) => handleOpenRegistration(e)}
                />
              ))}
            </div>
          )}

        </section>

        {/* Section 3: Host an Event Callout Strip */}
        <section className="bg-stone-100 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Organizer & Host Portal</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  Planning a conference, concert, or workshop?
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Publish your event on EventPulse to reach thousands of attendees, manage verified registrations with zero hassle, and offer instant digital passes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => setIsDocsOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  View Documentation
                </button>
                <button
                  onClick={() => setIsCreateEventOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Host New Event</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Semantic Footer */}
      <Footer
        onNavigateSection={handleNavigateSection}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
        onOpenCreateEvent={() => setIsCreateEventOpen(true)}
      />

      {/* Modals & Dialogs */}
      <EventDetailModal
        event={selectedEventForDetail}
        allEvents={events}
        currentUser={currentUser}
        reminders={reminders}
        isOpen={Boolean(selectedEventForDetail)}
        onClose={() => setSelectedEventForDetail(null)}
        onSelectEvent={(e) => setSelectedEventForDetail(e)}
        onRegisterClick={(e) => handleOpenRegistration(e)}
        onToggleReminder={handleToggleReminder}
        onToast={showNotification}
      />

      <RegistrationModal
        isOpen={isRegModalOpen}
        onClose={() => {
          setIsRegModalOpen(false);
          setSelectedEventForReg(null);
        }}
        selectedEvent={selectedEventForReg}
        allEvents={events}
        waitlistEntries={waitlistEntries}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onRegistrationSuccess={handleRegistrationSuccess}
        onWaitlistSuccess={handleWaitlistSuccess}
      />

      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        onClose={() => setIsMyTicketsOpen(false)}
        tickets={registrations}
        waitlistEntries={waitlistEntries}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onCancelRegistration={handleCancelRegistration}
        onUpdateRegistration={handleUpdateRegistration}
        onImportRegistrations={handleImportRegistrations}
        onClearAllRegistrations={handleClearAllRegistrations}
        onLeaveWaitlist={handleLeaveWaitlist}
        onBrowseEvents={() => handleNavigateSection('events-catalog')}
        onToast={showNotification}
      />

      <MyAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        customEvents={customEvents}
        registrations={registrations}
        onOpenCreateEvent={() => setIsCreateEventOpen(true)}
        onSelectEvent={(evt) => setSelectedEventForDetail(evt)}
      />

      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onEventCreated={handleEventCreated}
        currentUser={currentUser}
      />

      <ProjectDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <SocialAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onSignOut={handleSignOut}
      />

    </div>
  );
}
