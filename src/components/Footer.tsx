import React, { useState } from 'react';
import { Calendar, Mail, Check, ArrowRight } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenDocs: () => void;
  onOpenMyTickets: () => void;
  onOpenCreateEvent: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateSection,
  onOpenDocs,
  onOpenMyTickets,
  onOpenCreateEvent,
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !/^\S+@\S+\.\S+$/.test(newsletterEmail)) {
      setNewsletterError('Please enter a valid email address');
      return;
    }
    setNewsletterError('');
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setNewsletterEmail('');
    }, 4000);
  };

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </span>
              <span>EventPulse</span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm leading-relaxed">
              The premier platform for discovering industry summits, concerts, leadership conferences, and cultural events. Built with responsive HTML5, modern CSS3, and React.
            </p>
            <div className="text-xs text-stone-500">
              Crafted for clean attendee experience and instant digital ticket management.
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
              <li>
                <button 
                  onClick={() => onNavigateSection('events-catalog')}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  All Events
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateSection('featured-events')}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  Featured Marquee
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenMyTickets}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  My Tickets Wallet
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenCreateEvent}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  Publish New Event
                </button>
              </li>
            </ul>
          </div>

          {/* Documentation & Resources */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
              <li>
                <button 
                  onClick={onOpenDocs}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  Project README
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenDocs}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  Architecture & Rubric
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenDocs}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  Deployment Guide
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter / Notifications */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">Stay Informed</h4>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Receive curated event notifications and early-bird ticket releases directly to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    aria-label="Email for newsletter updates"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {subscribed ? <Check className="w-3.5 h-3.5" /> : <span>Subscribe</span>}
                </button>
              </div>
              {newsletterError && (
                <div className="text-[11px] text-red-500">{newsletterError}</div>
              )}
              {subscribed && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Thanks for subscribing to EventPulse updates!
                </div>
              )}
            </form>
          </div>

        </div>

        {/* Quiet Bottom Copyright Bar */}
        <div className="pt-8 border-t border-stone-100 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            © {new Date().getFullYear()} EventPulse Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Responsive Web Design</span>
            <span aria-hidden="true">·</span>
            <span>Local Storage Powered</span>
            <span aria-hidden="true">·</span>
            <span>WCAG Accessible</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
