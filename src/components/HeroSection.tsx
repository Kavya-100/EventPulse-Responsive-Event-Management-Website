import React, { useState, useEffect } from 'react';
import { EventItem } from '../types/event';
import { HERO_EVENT_IMAGE } from '../data/eventImages';
import { calculateTimeRemaining } from '../utils/eventUtils';
import { Search, ArrowRight, Compass, ShieldCheck, Clock } from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  onExploreClick: () => void;
  marqueeEvent?: EventItem;
  onSelectFeaturedEvent?: (event: EventItem) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onExploreClick,
  marqueeEvent,
  onSelectFeaturedEvent,
}) => {
  const targetDate = marqueeEvent?.date || '2026-11-28T16:30:00-05:00';
  const [countdown, setCountdown] = useState(() => calculateTimeRemaining(targetDate));

  useEffect(() => {
    setCountdown(calculateTimeRemaining(targetDate));
    const timer = setInterval(() => {
      setCountdown(calculateTimeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  return (
    <section id="hero" className="relative pt-8 pb-14 md:pt-14 md:pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 2-column or Hero statement */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Value Proposition & Call to Action */}
          <div className="lg:col-span-7 space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">Next-Gen Event Platform</span>
              <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">/</span>
              <span className="whitespace-nowrap">2026 Global Season</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-[1.14] text-balance">
              Discover Premier Events. Reserve Your Spot in Seconds.
            </h1>

            <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
              Experience transformative technology summits, intimate acoustic festivals, and executive leadership forums. Browse live schedules, track countdowns, and manage verified digital passes seamlessly.
            </p>

            {/* Quick Search & Explore Input */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-1.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm max-w-xl">
                <div className="relative flex-1 flex items-center pl-3">
                  <Search className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search events, cities, or keynote topics..."
                    className="w-full px-3 py-2 text-sm bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                    aria-label="Search events"
                  />
                </div>
                <button
                  onClick={onSearchSubmit}
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Micro trust indicators */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Instant Ticket QR Pass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-500" />
                <span>Verified Venues & Speakers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset with Live Event Countdown */}
          <div className="lg:col-span-5 relative animate-card-enter">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-stone-200/80 dark:border-stone-800 group">
              <img
                src={marqueeEvent?.image || HERO_EVENT_IMAGE}
                alt={marqueeEvent?.title || 'International Innovation Summit audience and keynote stage'}
                referrerPolicy="no-referrer"
                className="w-full aspect-16/10 object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
              <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Clock className="w-3 h-3 text-indigo-300" />
                <span>Live Marquee Countdown</span>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent flex flex-col justify-end p-5 text-white space-y-3">
                <div>
                  <div className="text-xs font-medium text-indigo-200">Featured Marquee Event</div>
                  <div className="text-base font-bold tracking-tight">
                    {marqueeEvent?.title || 'International Innovation & AI Summit 2026'}
                  </div>
                  <div className="text-xs text-stone-300 mt-0.5">
                    {marqueeEvent ? `${marqueeEvent.city} · ${marqueeEvent.formattedDate}` : 'San Francisco · Nov 20, 2026'}
                  </div>
                </div>

                {/* Live 4-Unit Countdown Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                  <div
                    data-testid="hero-live-countdown"
                    className="grid grid-cols-4 gap-1.5 text-center"
                  >
                    <div className="px-2 py-1 rounded-md bg-stone-950/75 border border-white/10">
                      <div className="text-xs font-extrabold font-mono tabular-nums">{countdown.days}</div>
                      <div className="text-[9px] uppercase tracking-wider text-stone-300">Days</div>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-stone-950/75 border border-white/10">
                      <div className="text-xs font-extrabold font-mono tabular-nums">{countdown.hours}</div>
                      <div className="text-[9px] uppercase tracking-wider text-stone-300">Hrs</div>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-stone-950/75 border border-white/10">
                      <div className="text-xs font-extrabold font-mono tabular-nums">{countdown.minutes}</div>
                      <div className="text-[9px] uppercase tracking-wider text-stone-300">Min</div>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-stone-950/75 border border-white/10">
                      <div className="text-xs font-extrabold font-mono tabular-nums text-indigo-300">{countdown.seconds}</div>
                      <div className="text-[9px] uppercase tracking-wider text-stone-300">Sec</div>
                    </div>
                  </div>

                  {marqueeEvent && onSelectFeaturedEvent && (
                    <button
                      type="button"
                      onClick={() => onSelectFeaturedEvent(marqueeEvent)}
                      className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      View Event
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Quantified Proof Adjacency Strip */}
        <div className="mt-14 pt-8 border-t border-stone-200 dark:border-stone-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">
              14,800+
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Registered Attendees</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">
              99.4%
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Check-In Reliability</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">
              4.9 / 5.0
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Attendee Satisfaction</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">
              100%
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Instant Spot Confirmation</div>
          </div>
        </div>

      </div>
    </section>
  );
};
