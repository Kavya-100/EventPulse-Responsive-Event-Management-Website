import React, { useState, useEffect } from 'react';
import { AuthSessionUser, EventItem, RegistrationRecord, WaitlistEntry } from '../types/event';
import {
  validateRegistrationForm,
  generateTicketCode,
  isEventAtFullCapacity,
  generateWaitlistCode,
  calculateWaitlistPosition,
  isAlreadyWaitlisted,
  formatProviderLabel,
} from '../utils/eventUtils';
import { TicketQRCode } from './TicketQRCode';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Ticket, 
  AlertCircle, 
  Download, 
  ArrowRight,
  ShieldCheck,
  Clock,
  ListChecks,
  LogIn
} from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: EventItem | null;
  allEvents: EventItem[];
  waitlistEntries?: WaitlistEntry[];
  currentUser?: AuthSessionUser | null;
  onOpenAuthModal?: () => void;
  onRegistrationSuccess: (record: RegistrationRecord) => void;
  onWaitlistSuccess?: (entry: WaitlistEntry) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  allEvents,
  waitlistEntries = [],
  currentUser = null,
  onOpenAuthModal,
  onRegistrationSuccess,
  onWaitlistSuccess,
}) => {
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketType, setTicketType] = useState<RegistrationRecord['ticketType']>('General Admission');
  const [ticketCount, setTicketCount] = useState(1);
  const [specialNotes, setSpecialNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState<RegistrationRecord | null>(null);
  const [confirmedWaitlist, setConfirmedWaitlist] = useState<WaitlistEntry | null>(null);

  // Sync selected event & autofill profile from active social session when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedEvent) {
        setActiveEventId(selectedEvent.id);
      } else if (allEvents.length > 0 && !activeEventId) {
        setActiveEventId(allEvents[0].id);
      }
      if (currentUser) {
        setFullName((prev) => prev || currentUser.fullName);
        setEmail((prev) => prev || currentUser.email);
      }
      setConfirmedTicket(null);
      setConfirmedWaitlist(null);
      setErrors({});
    }
  }, [isOpen, selectedEvent?.id, currentUser?.id]);

  if (!isOpen) return null;

  const currentEvent = allEvents.find((e) => e.id === activeEventId) || selectedEvent || allEvents[0];
  const isAtFullCapacity = currentEvent ? isEventAtFullCapacity(currentEvent) : false;
  const seatsLeft = currentEvent ? Math.max(0, currentEvent.capacity - currentEvent.registeredCount) : 0;
  const waitlistCountForEvent = currentEvent
    ? waitlistEntries.filter((entry) => entry.eventId === currentEvent.id).length
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateRegistrationForm({
      fullName,
      email,
      phone,
      eventId: activeEventId,
      ticketCount,
      agreedToTerms,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (isAtFullCapacity && currentEvent) {
      if (isAlreadyWaitlisted(currentEvent.id, email, waitlistEntries)) {
        setErrors({
          email: 'This email is already on the waitlist for this event.',
        });
        return;
      }
    } else if (currentEvent && ticketCount > seatsLeft) {
      setErrors({
        ticketCount: `Only ${seatsLeft} spot${seatsLeft === 1 ? '' : 's'} remaining for this event.`,
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Simulate realistic sub-second processing and persist either confirmed registration or waitlist entry
    setTimeout(() => {
      if (isAtFullCapacity && currentEvent) {
        const waitlistCode = generateWaitlistCode(currentEvent.id);
        const position = calculateWaitlistPosition(currentEvent.id, waitlistEntries);
        const newWaitlistEntry: WaitlistEntry = {
          id: `wl-${Date.now()}`,
          waitlistCode,
          eventId: currentEvent.id,
          eventTitle: currentEvent.title,
          eventDate: currentEvent.formattedDate,
          eventVenue: currentEvent.venue,
          eventCity: currentEvent.city,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          preferredTicketType: ticketType,
          requestedTickets: ticketCount,
          specialNotes: specialNotes.trim(),
          joinedAt: new Date().toISOString(),
          position,
          status: 'Waitlisted',
        };

        setConfirmedWaitlist(newWaitlistEntry);
        if (onWaitlistSuccess) {
          onWaitlistSuccess(newWaitlistEntry);
        }
        setIsSubmitting(false);
        return;
      }

      const ticketCode = generateTicketCode(currentEvent?.id || 'evt');
      const newRegistration: RegistrationRecord = {
        id: `reg-${Date.now()}`,
        ticketCode,
        eventId: currentEvent?.id || '',
        eventTitle: currentEvent?.title || 'Registered Event',
        eventDate: currentEvent?.formattedDate || '',
        eventVenue: currentEvent?.venue || '',
        eventCity: currentEvent?.city || '',
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ticketType,
        ticketCount,
        specialNotes: specialNotes.trim(),
        registeredAt: new Date().toISOString(),
        status: 'Confirmed',
      };

      setConfirmedTicket(newRegistration);
      onRegistrationSuccess(newRegistration);
      setIsSubmitting(false);
    }, 400);
  };

  const handleDownloadTicketSummary = () => {
    if (!confirmedTicket) return;
    const summaryText = `
=============================================
EVENTPULSE VERIFIED ATTENDEE PASS
=============================================
Ticket Code : ${confirmedTicket.ticketCode}
Event       : ${confirmedTicket.eventTitle}
Date & Time : ${confirmedTicket.eventDate}
Venue       : ${confirmedTicket.eventVenue}, ${confirmedTicket.eventCity}
Attendee    : ${confirmedTicket.fullName}
Email       : ${confirmedTicket.email}
Phone       : ${confirmedTicket.phone}
Pass Type   : ${confirmedTicket.ticketType} (${confirmedTicket.ticketCount} Attendee${confirmedTicket.ticketCount > 1 ? 's' : ''})
Status      : ${confirmedTicket.status}
Registered  : ${new Date(confirmedTicket.registeredAt).toLocaleString()}
=============================================
Please present this confirmation reference or QR code at check-in.
    `.trim();

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EventPulse-Ticket-${confirmedTicket.ticketCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadWaitlistReceipt = () => {
    if (!confirmedWaitlist) return;
    const receiptText = `
=============================================
EVENTPULSE PRIORITY WAITLIST CONFIRMATION
=============================================
Waitlist ID : ${confirmedWaitlist.waitlistCode}
Queue Rank  : #${confirmedWaitlist.position}
Event       : ${confirmedWaitlist.eventTitle}
Date & Time : ${confirmedWaitlist.eventDate}
Venue       : ${confirmedWaitlist.eventVenue}, ${confirmedWaitlist.eventCity}
Attendee    : ${confirmedWaitlist.fullName}
Email       : ${confirmedWaitlist.email}
Phone       : ${confirmedWaitlist.phone}
Preference  : ${confirmedWaitlist.preferredTicketType} (${confirmedWaitlist.requestedTickets} Spot${confirmedWaitlist.requestedTickets > 1 ? 's' : ''})
Status      : ${confirmedWaitlist.status}
Joined      : ${new Date(confirmedWaitlist.joinedAt).toLocaleString()}
=============================================
Your waitlist entry is stored locally. You will be prioritized if a spot opens.
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EventPulse-Waitlist-${confirmedWaitlist.waitlistCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6 animate-modal-pop">
        
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          aria-label="Close registration modal"
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Registration or Waitlist Form */}
        {!confirmedTicket && !confirmedWaitlist ? (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div className="space-y-1 pr-6">
              {isAtFullCapacity ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Event at Full Capacity · Waitlist Open</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Fast Event Registration</span>
                </div>
              )}
              <h2 id="registration-modal-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                {isAtFullCapacity ? 'Join Event Waitlist' : 'Reserve Your Attendance'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isAtFullCapacity
                  ? 'All spots are currently filled. Submit your details below to join the priority waitlist stored on this device.'
                  : 'Fill in your details below to receive your digital entry credential.'}
              </p>
            </div>

            {/* Event Selector / Highlight Banner */}
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isAtFullCapacity
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                  : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/80'
              }`}
            >
              <label htmlFor="event-select" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Selected Event
              </label>
              <select
                id="event-select"
                value={activeEventId}
                onChange={(e) => {
                  setActiveEventId(e.target.value);
                  setErrors({});
                }}
                className="w-full text-xs font-semibold p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {allEvents.map((ev) => {
                  const evFull = isEventAtFullCapacity(ev);
                  return (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.city} · {ev.price === 0 ? 'Free' : `$${ev.price}`}{evFull ? ' · Full / Waitlist' : ''})
                    </option>
                  );
                })}
              </select>

              {currentEvent && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      <span>{currentEvent.formattedDate.split('·')[0]}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      <span>{currentEvent.venue}</span>
                    </span>
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${
                      isAtFullCapacity
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isAtFullCapacity
                      ? `0 spots left (${waitlistCountForEvent} on waitlist)`
                      : `${seatsLeft} of ${currentEvent.capacity} spots left`}
                  </span>
                </div>
              )}
            </div>

            {/* Signed-in Session Banner or Social Autofill Prompt */}
            {currentUser ? (
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}
                  >
                    {currentUser.avatarInitials}
                  </span>
                  <span className="text-emerald-800 dark:text-emerald-200 truncate">
                    Signed in via <strong>{formatProviderLabel(currentUser.provider)}</strong> ({currentUser.email})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFullName(currentUser.fullName);
                    setEmail(currentUser.email);
                    setErrors((prev) => ({ ...prev, fullName: '', email: '' }));
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                >
                  Apply profile
                </button>
              </div>
            ) : onOpenAuthModal ? (
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-600 dark:text-stone-300">
                  Have a Google or GitHub profile? Autofill your attendee credentials.
                </span>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-stone-800 shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign In</span>
                </button>
              </div>
            ) : null}

            {/* Registration Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              
              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="fullName" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>Participant Full Name *</span>
                  {errors.fullName && (
                    <span className="text-[11px] text-red-500 font-normal flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fullName}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="e.g. Alexandra Miller"
                    className={`w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-stone-900 border rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.fullName ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-200 dark:border-stone-700'
                    }`}
                    aria-invalid={Boolean(errors.fullName)}
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Email Address */}
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>Email Address *</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="alexandra@company.com"
                      className={`w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-stone-900 border rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-200 dark:border-stone-700'
                      }`}
                      aria-invalid={Boolean(errors.email)}
                    />
                  </div>
                  {errors.email && (
                    <div className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label htmlFor="phone" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>Phone Number *</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="+1 (555) 234-5678"
                      className={`w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-stone-900 border rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-200 dark:border-stone-700'
                      }`}
                      aria-invalid={Boolean(errors.phone)}
                    />
                  </div>
                  {errors.phone && (
                    <div className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phone}
                    </div>
                  )}
                </div>

              </div>

              {/* Ticket Type & Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="ticketType" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                    {isAtFullCapacity ? 'Preferred Access Level' : 'Access Level'}
                  </label>
                  <select
                    id="ticketType"
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value as RegistrationRecord['ticketType'])}
                    className="w-full text-xs p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="General Admission">General Admission</option>
                    <option value="VIP Pass">VIP Pass (Priority Seating + Lounge)</option>
                    <option value="Student / Early Bird">Student / Early Bird</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ticketCount" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                    {isAtFullCapacity ? 'Spots Requested' : 'Quantity'}
                  </label>
                  <select
                    id="ticketCount"
                    value={ticketCount}
                    onChange={(e) => {
                      setTicketCount(Number(e.target.value));
                      if (errors.ticketCount) setErrors((prev) => ({ ...prev, ticketCount: '' }));
                    }}
                    className="w-full text-xs p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 {isAtFullCapacity ? 'Spot' : 'Ticket'}</option>
                    <option value={2}>2 {isAtFullCapacity ? 'Spots' : 'Tickets'}</option>
                    <option value={3}>3 {isAtFullCapacity ? 'Spots' : 'Tickets'}</option>
                    <option value={4}>4 {isAtFullCapacity ? 'Spots' : 'Tickets'}</option>
                    <option value={5}>5 {isAtFullCapacity ? 'Spots' : 'Tickets'}</option>
                  </select>
                  {errors.ticketCount && (
                    <div className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {errors.ticketCount}
                    </div>
                  )}
                </div>
              </div>

              {/* Special Requirements / Notes */}
              <div className="space-y-1">
                <label htmlFor="specialNotes" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Dietary or Accessibility Requests <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="specialNotes"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Vegetarian luncheon, wheelchair accessible seating"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Terms and Conduct Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-600 dark:text-stone-300 select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (errors.agreedToTerms) setErrors((prev) => ({ ...prev, agreedToTerms: '' }));
                    }}
                    className="mt-0.5 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>
                    I agree to the EventPulse Attendee Terms of Service, venue safety regulations, and community code of conduct.
                  </span>
                </label>
                {errors.agreedToTerms && (
                  <div className="text-[11px] text-red-500 flex items-center gap-1 pt-1 ml-6.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.agreedToTerms}
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-xs font-bold rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60 ${
                    isAtFullCapacity
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting ? (
                    <span>{isAtFullCapacity ? 'Adding to Waitlist...' : 'Verifying Entry...'}</span>
                  ) : (
                    <>
                      <span>{isAtFullCapacity ? 'Join Waitlist' : 'Complete Registration'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        ) : confirmedWaitlist ? (
          /* STEP 2B: Waitlist Confirmation Receipt */
          <div className="p-6 sm:p-8 space-y-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
              <ListChecks className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                You're on the Waitlist!
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Your waitlist entry has been saved separately in local storage on this device.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-5 text-left space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-3">
                <div>
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">Waitlist Reference</div>
                  <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                    {confirmedWaitlist.waitlistCode}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded text-[11px] font-semibold tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Queue Position #{confirmedWaitlist.position}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {confirmedWaitlist.eventTitle}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>{confirmedWaitlist.eventDate}</span>
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{confirmedWaitlist.eventVenue}, {confirmedWaitlist.eventCity}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Attendee</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{confirmedWaitlist.fullName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Requested Tier</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {confirmedWaitlist.preferredTicketType} ({confirmedWaitlist.requestedTickets}x)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-700">
                You can view or manage your waitlist queue status anytime inside <strong>My Tickets</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadWaitlistReceipt}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Receipt (.txt)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : confirmedTicket ? (
          /* STEP 2A: Instant Confirmation Pass */
          <div className="p-6 sm:p-8 space-y-6 text-center animate-fade-in">
            
            {/* Success Icon */}
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                Registration Confirmed!
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Your credentials have been recorded and saved to your device.
              </p>
            </div>

            {/* Visual Digital Ticket Card */}
            <div className="bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-5 text-left space-y-4 relative overflow-hidden shadow-xs">
              
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-3">
                <div>
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">Credential Code</div>
                  <div className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {confirmedTicket.ticketCode}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Pass</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {confirmedTicket.eventTitle}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>{confirmedTicket.eventDate}</span>
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{confirmedTicket.eventVenue}, {confirmedTicket.eventCity}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Attendee</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{confirmedTicket.fullName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Pass Type</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {confirmedTicket.ticketType} ({confirmedTicket.ticketCount}x)
                  </span>
                </div>
              </div>

              {/* QR Code representation */}
              <div className="pt-2 flex items-center justify-center">
                <TicketQRCode ticket={confirmedTicket} size={150} showControls={true} />
              </div>

            </div>

            {/* Actions: Download Text Pass & Finish */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleDownloadTicketSummary}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Pass (.txt)</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
};
