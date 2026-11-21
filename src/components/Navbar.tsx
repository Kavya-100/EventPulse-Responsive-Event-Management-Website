import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Ticket, 
  PlusCircle, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  BookOpen, 
  Sparkles,
  BarChart3,
  LogIn,
  LogOut,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { AuthSessionUser } from '../types/event';
import { formatProviderLabel } from '../utils/eventUtils';
import { ThemePreviewPopover } from './ThemePreviewPopover';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  myTicketsCount: number;
  userTicketsCount: number;
  customEventsCount: number;
  currentUser: AuthSessionUser | null;
  onOpenMyTickets: () => void;
  onOpenMyAnalytics: () => void;
  onOpenCreateEvent: () => void;
  onOpenDocs: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  myTicketsCount,
  userTicketsCount,
  customEventsCount,
  currentUser,
  onOpenMyTickets,
  onOpenMyAnalytics,
  onOpenCreateEvent,
  onOpenDocs,
  onOpenAuthModal,
  onSignOut,
  onNavigateSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [accountMenuOpen]);

  const handleNavClick = (sectionId: string) => {
    onNavigateSection(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-stone-50/90 dark:bg-stone-950/90 border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 lg:gap-4">
        
        {/* Zone 1: Single text wordmark */}
        <button
          onClick={() => handleNavClick('hero')}
          className="flex items-center gap-2 text-left text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
          aria-label="EventPulse Home"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Calendar className="w-4 h-4" />
          </span>
          <span>EventPulse</span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-5 text-sm font-medium text-stone-600 dark:text-stone-300">
          <button
            onClick={() => handleNavClick('events-catalog')}
            className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Browse Events
          </button>
          <button
            onClick={() => handleNavClick('featured-events')}
            className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Featured</span>
          </button>
          <button
            onClick={onOpenMyTickets}
            className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            aria-label={`My Tickets, ${myTicketsCount} tickets`}
          >
            <Ticket className="w-4 h-4 text-indigo-500" />
            <span>My Tickets</span>
            {myTicketsCount > 0 && (
              <span className="ml-0.5 text-xs font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                ({myTicketsCount})
              </span>
            )}
          </button>
          <button
            onClick={onOpenMyAnalytics}
            className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            aria-label={`My Analytics, ${customEventsCount} custom events`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>My Analytics</span>
            {customEventsCount > 0 && (
              <span className="ml-0.5 text-xs font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                ({customEventsCount})
              </span>
            )}
          </button>
          <button
            onClick={onOpenDocs}
            className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <span>Docs</span>
          </button>
        </nav>

        {/* Zone 3: Theme preview + dark toggle + social auth + Host Event */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemePreviewPopover
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            variant="desktop"
          />

          <button
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>

          {/* Social Auth Session Trigger / Profile Dropdown */}
          {!currentUser ? (
            <button
              type="button"
              onClick={onOpenAuthModal}
              aria-label="Sign in with Google or GitHub"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sign In</span>
            </button>
          ) : (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-expanded={accountMenuOpen}
                aria-label={`Account menu for ${currentUser.fullName}`}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span
                  className={`w-6 h-6 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}
                >
                  {currentUser.avatarInitials}
                </span>
                <span className="hidden xl:inline text-xs font-semibold max-w-[130px] truncate">
                  {currentUser.fullName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  aria-label="Signed-in user options"
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl py-2 z-50 animate-fade-in"
                >
                  <div className="px-3.5 py-2.5 border-b border-stone-100 dark:border-stone-800 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {currentUser.avatarInitials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {currentUser.fullName}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {currentUser.username ? `@${currentUser.username} · ` : ''}
                          {currentUser.email}
                        </div>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Signed in with {formatProviderLabel(currentUser.provider)}
                      </span>
                      <span className="text-stone-500 dark:text-stone-400 tabular-nums">
                        {userTicketsCount} {userTicketsCount === 1 ? 'pass' : 'passes'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenMyTickets();
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                        <span>My Tickets & Passes</span>
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                        {myTicketsCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
                      <span>Switch Account</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onOpenCreateEvent}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Host Event</span>
          </button>

          {/* Mobile & Tablet hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            className="lg:hidden p-2 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-4 pt-2 pb-4 space-y-2">
          {currentUser ? (
            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-8 h-8 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                >
                  {currentUser.avatarInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                    {formatProviderLabel(currentUser.provider)} · {currentUser.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                >
                  Switch Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuthModal();
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-indigo-500" />
              <span>Sign In with Google or GitHub</span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('events-catalog')}
            className="w-full text-left py-2 px-3 text-sm font-medium rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200"
          >
            Browse All Events
          </button>
          <button
            onClick={() => handleNavClick('featured-events')}
            className="w-full text-left py-2 px-3 text-sm font-medium rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 flex items-center justify-between"
          >
            <span>Featured Highlights</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </button>
          <button
            onClick={() => {
              onOpenMyTickets();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 text-sm font-medium rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-500" />
              <span>My Tickets</span>
            </span>
            {myTicketsCount > 0 && (
              <span className="text-xs font-mono tabular-nums font-semibold text-indigo-700 dark:text-indigo-300">
                {myTicketsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onOpenMyAnalytics();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 text-sm font-medium rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>My Analytics</span>
            </span>
            {customEventsCount > 0 && (
              <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                {customEventsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onOpenDocs();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 text-sm font-medium rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-stone-400" />
            <span>Project Documentation & README</span>
          </button>
          <ThemePreviewPopover
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            variant="mobile"
            onAfterAction={() => setMobileMenuOpen(false)}
          />
          <div className="pt-2">
            <button
              onClick={() => {
                onOpenCreateEvent();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Host New Event</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
