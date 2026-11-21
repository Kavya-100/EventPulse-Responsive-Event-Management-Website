import React, { useMemo, useState } from 'react';
import { EventItem, GeoCoordinates } from '../types/event';
import { findNearbyUpcomingEvents } from '../utils/eventUtils';
import {
  LocateFixed,
  MapPin,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  Compass,
  RefreshCw,
} from 'lucide-react';

interface NearbyEventsSuggestionProps {
  currentEventId: string;
  allEvents: EventItem[];
  onSelectEvent?: (event: EventItem) => void;
  onToast?: (message: string) => void;
}

type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

const RADIUS_MILES = 50;

export const NearbyEventsSuggestion: React.FC<NearbyEventsSuggestionProps> = ({
  currentEventId,
  allEvents,
  onSelectEvent,
  onToast,
}) => {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [userLocation, setUserLocation] = useState<GeoCoordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { nearby, closestOutsideRadius } = useMemo(() => {
    if (!userLocation) {
      return { nearby: [], closestOutsideRadius: null };
    }
    return findNearbyUpcomingEvents(allEvents, userLocation, {
      radiusMiles: RADIUS_MILES,
      excludeEventId: currentEventId,
    });
  }, [allEvents, userLocation, currentEventId]);

  const handleLocateUser = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your current browser.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GeoCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setStatus('success');

        const result = findNearbyUpcomingEvents(allEvents, coords, {
          radiusMiles: RADIUS_MILES,
          excludeEventId: currentEventId,
        });
        if (onToast) {
          onToast(
            result.nearby.length > 0
              ? `Found ${result.nearby.length} upcoming event${result.nearby.length === 1 ? '' : 's'} within ${RADIUS_MILES} miles.`
              : `Location detected. No other upcoming events within ${RADIUS_MILES} miles.`
          );
        }
      },
      (error) => {
        setStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage(
            'Location permission was denied. Please enable location access in your browser settings to discover nearby events.'
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage(
            'Your current location could not be determined. Please try again in a moment.'
          );
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage(
            'Location request timed out. Please check your connection and try again.'
          );
        } else {
          setErrorMessage('Unable to retrieve your location.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <section
      aria-labelledby="nearby-events-heading"
      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/50 p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Compass className="w-4 h-4" />
            <span>Nearby Discovery · {RADIUS_MILES}-Mile Radius</span>
          </div>
          <h3
            id="nearby-events-heading"
            className="text-base font-bold text-stone-900 dark:text-stone-100"
          >
            Upcoming Events Near You
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Use your browser&apos;s location to find upcoming events within {RADIUS_MILES} miles of where you are.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLocateUser}
          disabled={status === 'loading'}
          aria-label={
            status === 'success'
              ? 'Refresh nearby events from my current location'
              : 'Find upcoming events within 50 miles of my current location'
          }
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Locating...</span>
            </>
          ) : status === 'success' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Location</span>
            </>
          ) : (
            <>
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Find Nearby Events</span>
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {status === 'loading' && (
        <div
          role="status"
          className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center gap-3 text-xs text-stone-600 dark:text-stone-300"
        >
          <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
          <span>Requesting your browser coordinates and scanning events within {RADIUS_MILES} miles...</span>
        </div>
      )}

      {/* Error / Permission Denied State */}
      {status === 'error' && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-800 dark:text-red-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleLocateUser}
            className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-800 dark:text-red-100 font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && userLocation && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5 font-mono bg-white dark:bg-stone-900 px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-800">
              <LocateFixed className="w-3 h-3 text-emerald-500" />
              <span>
                Your location: {userLocation.lat.toFixed(2)}°, {userLocation.lng.toFixed(2)}°
              </span>
            </span>
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              {nearby.length} {nearby.length === 1 ? 'event' : 'events'} within {RADIUS_MILES} mi
            </span>
          </div>

          {nearby.length === 0 ? (
            <div className="p-5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center space-y-2">
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                No other upcoming events found within {RADIUS_MILES} miles of your location.
              </p>
              {closestOutsideRadius && (
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Closest upcoming event:{' '}
                  <strong className="text-stone-700 dark:text-stone-200">
                    {closestOutsideRadius.event.title}
                  </strong>{' '}
                  in {closestOutsideRadius.event.city} ({closestOutsideRadius.distanceMiles.toLocaleString()} mi away).
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {nearby.map(({ event: nearbyEvt, distanceMiles }) => {
                const seatsLeft = Math.max(0, nearbyEvt.capacity - nearbyEvt.registeredCount);
                return (
                  <div
                    key={nearbyEvt.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <img
                        src={nearbyEvt.image}
                        alt={nearbyEvt.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-stone-200 dark:bg-stone-800"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md tabular-nums">
                            {distanceMiles} mi away
                          </span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {nearbyEvt.category}
                          </span>
                          <span className="text-stone-400">·</span>
                          <span className="font-semibold text-stone-700 dark:text-stone-300">
                            {nearbyEvt.price === 0 ? 'Free' : `$${nearbyEvt.price}`}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                          {nearbyEvt.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            <span>{nearbyEvt.formattedDate}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            <span>{nearbyEvt.city}</span>
                          </span>
                          <span>
                            {seatsLeft <= 0 ? 'Waitlist open' : `${seatsLeft} spots left`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {onSelectEvent && (
                      <button
                        type="button"
                        onClick={() => onSelectEvent(nearbyEvt)}
                        aria-label={`View details for ${nearbyEvt.title}`}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-indigo-50 dark:bg-stone-800 dark:hover:bg-indigo-950/60 text-stone-800 dark:text-stone-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-stone-200 dark:border-stone-700 transition-colors shrink-0 cursor-pointer"
                      >
                        <span>View Event</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
