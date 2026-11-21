import React, { useState, useEffect } from 'react';
import { EventItem, EventCategory, AuthSessionUser } from '../types/event';
import { getCategoryEventImage } from '../data/eventImages';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Check, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
  currentUser?: AuthSessionUser | null;
}

const CATEGORIES: Exclude<EventCategory, 'All'>[] = [
  'Technology',
  'Music & Concerts',
  'Business & Leadership',
  'Design & Arts',
  'Sports & Wellness',
  'Culinary & Culture',
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<EventCategory, 'All'>>('Technology');
  const [dateStr, setDateStr] = useState('2026-12-20T10:00');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [capacity, setCapacity] = useState<number>(200);
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && currentUser) {
      setOrganizerName((prev) => prev || currentUser.fullName);
      setOrganizerEmail((prev) => prev || currentUser.email);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Event title is required';
    if (!venue.trim()) newErrors.venue = 'Venue name is required';
    if (!city.trim()) newErrors.city = 'City name is required';
    if (!shortDesc.trim()) newErrors.shortDesc = 'A short summary is required';
    if (!organizerName.trim()) newErrors.organizerName = 'Organizer name is required';
    if (!organizerEmail.trim() || !/^\S+@\S+\.\S+$/.test(organizerEmail)) {
      newErrors.organizerEmail = 'Valid organizer email is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const eventDate = new Date(dateStr);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    // Pick an appropriate bundled theme image based on category
    const image = getCategoryEventImage(category);

    const newEvent: EventItem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      category,
      date: dateStr,
      formattedDate,
      venue: venue.trim(),
      city: city.trim(),
      address: address.trim() || `${venue.trim()}, ${city.trim()}`,
      image,
      shortDescription: shortDesc.trim(),
      fullDescription: fullDesc.trim() || shortDesc.trim(),
      price: Number(price) || 0,
      capacity: Number(capacity) || 100,
      registeredCount: 0,
      featured: false,
      tags: [category, city.trim(), 'Community Event'],
      speakers: [
        {
          name: organizerName.trim(),
          role: 'Event Host & Curator',
          company: 'Organizing Committee',
        },
      ],
      schedule: [
        { time: 'Opening', session: 'Registration & Welcome Keynote' },
        { time: 'Mid-session', session: 'Featured Presentations & Interactive Workshops' },
        { time: 'Closing', session: 'Networking Reception & Concluding Remarks' },
      ],
      organizer: {
        name: organizerName.trim(),
        email: organizerEmail.trim(),
      },
      ownerId: currentUser?.id,
      ownerEmail: currentUser?.email,
    };

    onEventCreated(newEvent);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-event-modal-title" className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Publish a New Event
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Create and list your event on the EventPulse discovery portal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close form"
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-stone-300 flex justify-between">
              <span>Event Title *</span>
              {errors.title && <span className="text-red-500">{errors.title}</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. NextGen Web Frameworks Forum 2026"
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Exclude<EventCategory, 'All'>)}
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Date & Start Time</label>
              <input
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Venue & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300 flex justify-between">
                <span>Venue Name *</span>
                {errors.venue && <span className="text-red-500">{errors.venue}</span>}
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Innovation Hall"
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300 flex justify-between">
                <span>City & Region *</span>
                {errors.city && <span className="text-red-500">{errors.city}</span>}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Seattle, WA"
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Admission Price & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">
                Ticket Price (USD) <span className="text-stone-400 font-normal">(0 for Free)</span>
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">
                Attendee Capacity
              </label>
              <input
                type="number"
                min="10"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-stone-300 flex justify-between">
              <span>Short Summary *</span>
              {errors.shortDesc && <span className="text-red-500">{errors.shortDesc}</span>}
            </label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="1-2 sentences summarizing the theme and why attendees should join."
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Full Narrative */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-stone-300">
              Detailed Event Description
            </label>
            <textarea
              rows={3}
              value={fullDesc}
              onChange={(e) => setFullDesc(e.target.value)}
              placeholder="Outline what delegates can expect, keynote themes, and logistics..."
              className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Organizer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300 flex justify-between">
                <span>Organizer Name *</span>
                {errors.organizerName && <span className="text-red-500">{errors.organizerName}</span>}
              </label>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. Pacific Tech Guild"
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300 flex justify-between">
                <span>Contact Email *</span>
                {errors.organizerEmail && <span className="text-red-500">{errors.organizerEmail}</span>}
              </label>
              <input
                type="email"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                placeholder="organizer@domain.com"
                className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Publish Event
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
