import React, { useState, useEffect } from 'react';
import { AuthSessionUser, EventItem, ScheduledReminder } from '../types/event';
import { 
  calculateTimeRemaining, 
  isReminderScheduled, 
  addReminder, 
  removeReminder, 
  REMINDER_LEAD_TIME_MINUTES,
  calculatePreEventReminderDelay,
  loadRemindersFromStorage,
  saveRemindersToStorage,
  buildEventShareLink,
  buildShareEventMailtoHref,
  buildEventIcsFilename,
  buildEventIcsContent,
  buildEventIcsDataUrl,
  resolveEventCoordinates
} from '../utils/eventUtils';
import { 
  X, 
  Calendar, 
  CalendarPlus,
  MapPin, 
  Clock, 
  Ticket, 
  Share2, 
  Check, 
  Mail, 
  Phone,
  Bell,
  BellRing,
  BellOff,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { VenueMapPreview } from './VenueMapPreview';
import { NearbyEventsSuggestion } from './NearbyEventsSuggestion';
import { EventComments } from './EventComments';

interface EventDetailModalProps {
  event: EventItem | null;
  allEvents?: EventItem[];
  currentUser?: AuthSessionUser | null;
  reminders?: ScheduledReminder[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent?: (event: EventItem) => void;
  onRegisterClick: (event: EventItem) => void;
  onToggleReminder?: (
    event: EventItem
  ) =>
    | Promise<{ type: 'success' | 'error' | 'info'; message: string }>
    | { type: 'success' | 'error' | 'info'; message: string }
    | void;
  onToast?: (message: string) => void;
  onRemindersChange?: (reminders: ScheduledReminder[]) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  allEvents = [],
  currentUser = null,
  reminders: remindersProp,
  isOpen,
  onClose,
  onSelectEvent,
  onRegisterClick,
  onToggleReminder,
  onToast,
  onRemindersChange,
}) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, formatted: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [calendarDownloaded, setCalendarDownloaded] = useState(false);
  const [icsBlobUrl, setIcsBlobUrl] = useState<string>('');
  const [localReminders, setLocalReminders] = useState<ScheduledReminder[]>(() => loadRemindersFromStorage());
  const [reminderStatus, setReminderStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const reminders = remindersProp ?? localReminders;

  // Update countdown every second specifically for this event's start time
  useEffect(() => {
    if (!event) return;
    setCountdown(calculateTimeRemaining(event.date));
    const interval = setInterval(() => {
      setCountdown(calculateTimeRemaining(event.date));
    }, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Sync reminder state whenever modal is opened and reset scroll/share feedback when event changes
  useEffect(() => {
    if (isOpen) {
      if (!remindersProp) {
        setLocalReminders(loadRemindersFromStorage());
      }
      setReminderStatus({ type: null, message: '' });
      setCopiedLink(false);
      setCalendarDownloaded(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, event?.id, remindersProp]);

  // Generate and clean up Blob URL for downloadable .ics calendar file
  useEffect(() => {
    if (!isOpen || !event || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      setIcsBlobUrl('');
      return;
    }
    const content = buildEventIcsContent(event, { shareLink: buildEventShareLink(event.id) });
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    setIcsBlobUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const seatsLeft = Math.max(0, event.capacity - event.registeredCount);
  const isSoldOut = seatsLeft <= 0;
  const isReminded = isReminderScheduled(event.id, reminders);
  const shareLink = buildEventShareLink(event.id);
  const shareEmailHref = buildShareEventMailtoHref(event, shareLink);
  const icsFilename = buildEventIcsFilename(event.title, event.id);
  const icsDownloadHref =
    icsBlobUrl || buildEventIcsDataUrl(buildEventIcsContent(event, { shareLink }));

  const handleShare = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // Clipboard API may be restricted in non-HTTPS contexts; status banner still displays shareLink
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    if (onToast) {
      onToast(`Event link copied to clipboard: ${shareLink}`);
    }
  };

  /**
   * Delegates reminder toggling to App (saves to localStorage and schedules notification 5 minutes before start),
   * with a standalone fallback if onToggleReminder is omitted.
   */
  const handleToggleReminder = async () => {
    if (!event) return;

    if (onToggleReminder) {
      const feedback = await onToggleReminder(event);
      if (feedback) {
        setReminderStatus({
          type: feedback.type,
          message: feedback.message,
        });
      }
      return;
    }

    if (isReminded) {
      const updated = removeReminder(event.id, reminders);
      setLocalReminders(updated);
      saveRemindersToStorage(updated);
      if (onRemindersChange) onRemindersChange(updated);
      setReminderStatus({
        type: 'info',
        message: 'Browser alert reminder cancelled for this event.',
      });
      if (onToast) {
        onToast(`5-minute reminder cancelled for ${event.title}`);
      }
      return;
    }

    const { isPast, withinLeadWindow, formattedNotifyLeadTime } = calculatePreEventReminderDelay(
      event.date,
      REMINDER_LEAD_TIME_MINUTES
    );

    const newReminder: ScheduledReminder = {
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventVenue: event.venue,
      eventCity: event.city,
      scheduledAt: new Date().toISOString(),
      leadMinutes: REMINDER_LEAD_TIME_MINUTES,
    };

    const updated = addReminder(newReminder, reminders);
    setLocalReminders(updated);
    saveRemindersToStorage(updated);
    if (onRemindersChange) onRemindersChange(updated);

    setReminderStatus({
      type: 'success',
      message: isPast
        ? 'Reminder saved to local storage.'
        : withinLeadWindow
        ? 'Reminder saved! Event starts within 5 minutes.'
        : `Reminder saved! Notification scheduled ${formattedNotifyLeadTime} (5 minutes before start).`,
    });

    if (onToast) {
      onToast(`Reminder saved for ${event.title}!`);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-event-title"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col animate-modal-pop">
        
        {/* Sticky Header with Close & Share */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={handleShare}
            aria-label="Share event link"
            className="p-2 rounded-full bg-stone-900/60 hover:bg-stone-900/80 text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close event modal"
            className="p-2 rounded-full bg-stone-900/60 hover:bg-stone-900/80 text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
          
          {/* Hero Image & Overlay Banner */}
          <div className="relative aspect-16/9 w-full bg-stone-900">
            <img
              src={event.image}
              alt={event.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent flex flex-col justify-end p-6 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                <span>{event.category}</span>
                <span aria-hidden="true">·</span>
                <span>{event.price === 0 ? 'Complimentary Admission' : `$${event.price} USD`}</span>
              </div>
              <h2 id="modal-event-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                {event.title}
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Dedicated Event Start Time Countdown & Browser Alert Reminder Section */}
            <div className="bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/90 dark:to-stone-850 rounded-2xl p-5 sm:p-6 border border-stone-200/90 dark:border-stone-750 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>Event Start Time Countdown</span>
                  </span>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Starts {event.formattedDate} · {event.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {countdown.isPast ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      Event Concluded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Live Ticker</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Countdown Digits specifically for this event's start time */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                <div className="p-3 sm:p-4 bg-white dark:bg-stone-900 rounded-xl shadow-2xs border border-stone-200/70 dark:border-stone-800">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums font-mono">
                    {countdown.days}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5 uppercase tracking-wide">Days</div>
                </div>
                <div className="p-3 sm:p-4 bg-white dark:bg-stone-900 rounded-xl shadow-2xs border border-stone-200/70 dark:border-stone-800">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums font-mono">
                    {countdown.hours}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5 uppercase tracking-wide">Hours</div>
                </div>
                <div className="p-3 sm:p-4 bg-white dark:bg-stone-900 rounded-xl shadow-2xs border border-stone-200/70 dark:border-stone-800">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums font-mono">
                    {countdown.minutes}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5 uppercase tracking-wide">Minutes</div>
                </div>
                <div className="p-3 sm:p-4 bg-white dark:bg-stone-900 rounded-xl shadow-2xs border border-stone-200/70 dark:border-stone-800">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums font-mono">
                    {countdown.seconds}
                  </div>
                  <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5 uppercase tracking-wide">Seconds</div>
                </div>
              </div>

              {/* Remind Me Action & Browser Reminder Status */}
              <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {isReminded ? (
                    <>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                          Reminder saved for this event
                        </p>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                          Alerts 5 minutes before {event.formattedDate}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <p className="font-semibold text-stone-800 dark:text-stone-200">
                          Save to your calendar or set a 5-minute alert
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          Export an .ics invite or get a browser notification 5 minutes before start time.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={icsDownloadHref}
                    download={icsFilename}
                    onClick={() => {
                      setCalendarDownloaded(true);
                      setTimeout(() => setCalendarDownloaded(false), 3500);
                      setReminderStatus({
                        type: 'success',
                        message: `Calendar invite (${icsFilename}) downloaded! Open it to import into Google Calendar or Apple Calendar.`,
                      });
                      if (onToast) {
                        onToast(`Downloaded ${icsFilename} for Google & Apple Calendar`);
                      }
                    }}
                    aria-label={`Add ${event.title} to Calendar`}
                    title="Download .ics file for Google Calendar or Apple Calendar"
                    className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap ${
                      calendarDownloaded
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-white dark:bg-stone-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                    }`}
                  >
                    {calendarDownloaded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>.ics Downloaded</span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Add to Calendar</span>
                      </>
                    )}
                  </a>

                  <button
                    type="button"
                    onClick={handleToggleReminder}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      isReminded
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                    aria-label={isReminded ? `Cancel reminder for ${event.title}` : `Set Reminder for ${event.title}`}
                  >
                    {isReminded ? (
                      <>
                        <BellOff className="w-3.5 h-3.5" />
                        <span>Cancel Reminder</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        <span>Set Reminder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Message / Notification Feedback Banner */}
              {reminderStatus.message && (
                <div
                  role="status"
                  className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 transition-all ${
                    reminderStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60'
                      : reminderStatus.type === 'error'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800/60'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {reminderStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {reminderStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    {reminderStatus.type === 'info' && <Info className="w-4 h-4 text-stone-500 shrink-0" />}
                    <span>{reminderStatus.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReminderStatus({ type: null, message: '' })}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-0.5"
                    aria-label="Dismiss notification status message"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Details Logistics Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Date & Schedule</span>
                </div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{event.formattedDate}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Doors open 45 minutes prior</p>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <span>Venue & Location</span>
                </div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{event.venue}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{event.address}</p>
              </div>
            </div>

            {/* Static Venue Map & Coordinates Visualization */}
            <VenueMapPreview
              venue={event.venue}
              address={event.address}
              city={event.city}
              coordinates={resolveEventCoordinates(event)}
            />

            {/* Geolocation Nearby Upcoming Events (50-mile radius) */}
            <NearbyEventsSuggestion
              currentEventId={event.id}
              allEvents={allEvents}
              onSelectEvent={onSelectEvent}
              onToast={onToast}
            />

            {/* About the Event */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">About the Event</h3>
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                {event.fullDescription}
              </p>
            </div>

            {/* Featured Speakers / Guests */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Featured Speakers & Hosts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {event.speakers.map((sp, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                        {sp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{sp.name}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{sp.role}</div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate">{sp.company}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Schedule / Agenda */}
            {event.schedule && event.schedule.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Agenda & Timeline</h3>
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-200 dark:divide-stone-800">
                  {event.schedule.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="font-mono text-stone-500 dark:text-stone-400 font-medium shrink-0 sm:w-44">
                        {item.time}
                      </div>
                      <div className="flex-1 font-semibold text-stone-900 dark:text-stone-100">
                        {item.session}
                        {item.speaker && (
                          <span className="block sm:inline sm:ml-2 font-normal text-indigo-600 dark:text-indigo-400 text-[11px]">
                            ({item.speaker})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer Contact Info */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-stone-400">Organized by</span>{' '}
                <strong className="text-stone-800 dark:text-stone-200">{event.organizer.name}</strong>
              </div>
              <div className="flex items-center gap-4 text-stone-600 dark:text-stone-400">
                <a href={`mailto:${event.organizer.email}`} className="flex items-center gap-1 hover:text-indigo-600">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{event.organizer.email}</span>
                </a>
                {event.organizer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{event.organizer.phone}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Public Event Comments */}
            <EventComments
              eventId={event.id}
              eventTitle={event.title}
              currentUser={currentUser}
              onToast={onToast}
            />

          </div>

        </div>

        {/* Copied Share Link Feedback Banner */}
        {copiedLink && (
          <div
            role="status"
            className="px-4 sm:px-5 py-2 border-t border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 text-xs animate-fade-in"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold shrink-0">Link copied:</span>
              <code className="font-mono text-[11px] truncate">{shareLink}</code>
            </div>
          </div>
        )}

        {/* Sticky Modal Footer CTA */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
              {isSoldOut ? 'Full capacity · Waitlist open' : `${seatsLeft} of ${event.capacity} spots remaining`}
            </div>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums whitespace-nowrap">
              {event.price === 0 ? 'Free Entry' : `$${event.price} USD`}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Share (Copy Event-ID Link to Clipboard) Button */}
            <button
              type="button"
              onClick={handleShare}
              aria-label={`Share ${event.title}`}
              title={`Copy link (${shareLink})`}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-300 dark:border-stone-700 hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Share</span>
                </>
              )}
            </button>

            {/* Share via Email (mailto:) Button */}
            <a
              href={shareEmailHref}
              onClick={() => {
                if (onToast) {
                  onToast(`Opening email draft to share "${event.title}"`);
                }
              }}
              aria-label={`Share via Email: ${event.title}`}
              title="Pre-fill an email template with event details and link"
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Share via Email</span>
            </a>

            {/* Set Reminder Button */}
            <button
              type="button"
              onClick={handleToggleReminder}
              aria-label={isReminded ? `Cancel reminder for ${event.title}` : `Set Reminder for ${event.title}`}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isReminded
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 hover:border-red-300'
                  : 'border-stone-300 dark:border-stone-700 hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
              title={isReminded ? 'Click to cancel 5-minute pre-event reminder' : 'Save reminder and notify 5 minutes before event start time'}
            >
              {isReminded ? (
                <>
                  <BellRing className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Reminder Set</span>
                  <span className="sm:hidden">Active</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                  <span>Set Reminder</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRegisterClick(event);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                isSoldOut
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              aria-label={isSoldOut ? `Join waitlist for ${event.title}` : `Register now for ${event.title}`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>{isSoldOut ? 'Join Waitlist' : 'Register Now'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
