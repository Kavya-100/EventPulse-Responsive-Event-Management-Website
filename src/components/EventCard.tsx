import React, { useState, useEffect } from 'react';
import { EventItem } from '../types/event';
import { calculateTimeRemaining } from '../utils/eventUtils';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  onSelectEvent: (event: EventItem) => void;
  onRegisterClick: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelectEvent,
  onRegisterClick,
}) => {
  const [countdown, setCountdown] = useState(() => calculateTimeRemaining(event.date));

  useEffect(() => {
    // Update countdown timer every second
    const interval = setInterval(() => {
      setCountdown(calculateTimeRemaining(event.date));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.date]);

  const seatsLeft = Math.max(0, event.capacity - event.registeredCount);
  const fillPercent = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  const isSoldOut = seatsLeft <= 0;

  const isUrgentCountdown = !countdown.isPast && countdown.days === 0;

  return (
    <article className="animate-card-enter group flex flex-col bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5 transition-all duration-300 shadow-xs hover:shadow-md">
      
      {/* Visual Asset with Aspect 4:3 and Live Countdown Overlay */}
      <div className="relative aspect-4/3 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
          onError={(e) => {
            // High-fidelity fallback container if image fails
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Live Countdown Badge Overlay */}
        <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
          {!countdown.isPast && (
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isUrgentCountdown ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          )}
          <Clock className="w-3 h-3 text-indigo-400" />
          <span className="tabular-nums font-mono">{countdown.formatted}</span>
        </div>

        {/* Category Unboxed Tag Overlay */}
        <div className="absolute top-3 right-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md text-stone-800 dark:text-stone-200 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
          {event.category}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
        
        <div className="space-y-2.5">
          {/* Metadata line with clean typographic separators (Zero-Pill Discipline) */}
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{event.formattedDate.split('·')[0]}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{event.city}</span>
            </span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onSelectEvent(event)}
            className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            {event.title}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
            {event.shortDescription}
          </p>
        </div>

        {/* Capacity & Pricing Strip */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-3">
          
          {/* Capacity Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{isSoldOut ? 'Sold Out' : `${seatsLeft} spots left`}</span>
              </span>
              <span className="tabular-nums font-mono">{fillPercent}% booked</span>
            </div>
            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  fillPercent > 90 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          {/* Pricing & Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <div className="text-[10px] text-stone-400 uppercase font-medium tracking-wide">Admission</div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                {event.price === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Free</span>
                ) : (
                  `$${event.price}`
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectEvent(event)}
                className="px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
                aria-label={`View details for ${event.title}`}
              >
                Details
              </button>
              
              <button
                onClick={() => onRegisterClick(event)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-xs flex items-center gap-1 cursor-pointer ${
                  isSoldOut
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                aria-label={isSoldOut ? `Join waitlist for ${event.title}` : `Register for ${event.title}`}
              >
                <span>{isSoldOut ? 'Join Waitlist' : 'Register'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </article>
  );
};
