import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Contrast, Calendar, MapPin, Ticket, Check, X, ArrowRightLeft } from 'lucide-react';

interface ThemePreviewPopoverProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  variant?: 'desktop' | 'mobile';
  onAfterAction?: () => void;
}

export const ThemePreviewPopover: React.FC<ThemePreviewPopoverProps> = ({
  darkMode,
  onToggleDarkMode,
  variant = 'desktop',
  onAfterAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewDark, setPreviewDark] = useState<boolean>(darkMode);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync preview starting state when opened
  useEffect(() => {
    if (isOpen) {
      setPreviewDark(darkMode);
    }
  }, [isOpen, darkMode]);

  // Close on Escape key or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const handleApplyToSite = () => {
    if (previewDark !== darkMode) {
      onToggleDarkMode();
    }
    setIsOpen(false);
    if (onAfterAction) onAfterAction();
  };

  return (
    <div ref={containerRef} className="relative">
      {variant === 'desktop' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Open theme preview toggle"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isOpen
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
              : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800'
          }`}
        >
          <Contrast className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden xl:inline whitespace-nowrap">Theme Preview</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Open theme preview toggle"
          className="w-full text-left py-2 px-3 text-sm font-medium rounded-md hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200 flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Contrast className="w-4 h-4 text-indigo-500" />
            <span>Theme Preview</span>
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {darkMode ? 'Dark' : 'Light'}
          </span>
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Theme transition preview"
          className={`${
            variant === 'desktop'
              ? 'absolute right-0 mt-2 w-80 sm:w-96 origin-top-right'
              : 'mt-2 w-full'
          } z-50 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl p-4 space-y-4`}
        >
          {/* Panel Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Theme Transition Preview
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Toggle the sample card below to preview light &amp; dark palettes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close theme preview"
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dedicated Preview Mode Switch */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800">
            <div
              role="group"
              aria-label="Sample preview theme mode"
              className="grid grid-cols-2 gap-1 flex-1"
            >
              <button
                type="button"
                onClick={() => setPreviewDark(false)}
                aria-pressed={!previewDark}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                  !previewDark
                    ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDark(true)}
                aria-pressed={previewDark}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                  previewDark
                    ? 'bg-stone-800 text-stone-100 shadow-xs ring-1 ring-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPreviewDark((prev) => !prev)}
              aria-label="Flip sample preview theme"
              title="Animate transition between light and dark"
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Transitioning Sample Component */}
          <div
            data-testid="theme-preview-sample"
            data-preview-theme={previewDark ? 'dark' : 'light'}
            className={`rounded-xl p-3.5 border transition-all duration-500 ease-in-out ${
              previewDark
                ? 'bg-stone-950 border-stone-800 text-stone-100 shadow-inner'
                : 'bg-stone-50 border-stone-200 text-stone-900'
            }`}
          >
            {/* Sample Mini Card Surface */}
            <div
              className={`rounded-lg p-3 border transition-all duration-500 ease-in-out space-y-2.5 ${
                previewDark
                  ? 'bg-stone-900 border-stone-800 shadow-md shadow-black/30'
                  : 'bg-white border-stone-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 ${
                    previewDark
                      ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-800/80'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                  }`}
                >
                  {previewDark ? (
                    <Moon className="w-2.5 h-2.5" />
                  ) : (
                    <Sun className="w-2.5 h-2.5 text-amber-500" />
                  )}
                  <span>{previewDark ? 'Dark Mode' : 'Light Mode'}</span>
                </span>
                <span
                  className={`text-[11px] font-mono font-semibold transition-colors duration-500 ${
                    previewDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  $45 · 160 left
                </span>
              </div>

              <div className="space-y-1">
                <div
                  className={`text-xs font-bold leading-snug transition-colors duration-500 ${
                    previewDark ? 'text-stone-50' : 'text-stone-900'
                  }`}
                >
                  Sample Event Card Preview
                </div>
                <div
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] transition-colors duration-500 ${
                    previewDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Nov 28, 2026</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>Asheville, NC</span>
                  </span>
                </div>
              </div>

              <div
                className={`pt-2 border-t flex items-center justify-between gap-2 transition-colors duration-500 ${
                  previewDark ? 'border-stone-800' : 'border-stone-100'
                }`}
              >
                {/* Palette Token Swatches */}
                <div className="flex items-center gap-1.5" aria-label="Active palette swatches">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border transition-colors duration-500 ${
                      previewDark ? 'bg-stone-950 border-stone-700' : 'bg-stone-50 border-stone-300'
                    }`}
                    title="Background"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border transition-colors duration-500 ${
                      previewDark ? 'bg-stone-100 border-stone-600' : 'bg-stone-900 border-stone-700'
                    }`}
                    title="Foreground"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full transition-colors duration-500 ${
                      previewDark ? 'bg-indigo-500' : 'bg-indigo-600'
                    }`}
                    title="Accent"
                  />
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors duration-500 ${
                    previewDark
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <Ticket className="w-3 h-3" />
                  <span>Reserve Spot</span>
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action to Apply Previewed Theme */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
            <span className="text-stone-500 dark:text-stone-400">
              Site theme: <strong className="text-stone-800 dark:text-stone-200">{darkMode ? 'Dark' : 'Light'}</strong>
            </span>
            <button
              type="button"
              onClick={handleApplyToSite}
              disabled={previewDark === darkMode}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                previewDark === darkMode
                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-2xs'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>{previewDark === darkMode ? 'Active on Site' : `Apply ${previewDark ? 'Dark' : 'Light'} Mode`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
