import React, { useState, useMemo, useEffect } from 'react';
import { AuthSessionUser, EventItem, RegistrationRecord } from '../types/event';
import {
  getMonthCalendarCells,
  groupEventsByDate,
  formatMonthYearLabel,
  toDateKey,
  isEventAtFullCapacity,
  isCustomEvent,
  isCustomEventOwner,
} from '../utils/eventUtils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  MapPin,
  Clock,
  Ticket,
  GripVertical,
  Lock,
} from 'lucide-react';

interface MonthlyCalendarViewProps {
  events: EventItem[];
  registrations: RegistrationRecord[];
  currentUser?: AuthSessionUser | null;
  onSelectEvent: (event: EventItem) => void;
  onRegisterClick: (event: EventItem) => void;
  onRescheduleEvent?: (eventId: string, targetDateKey: string) => void;
  onOpenAuthModal?: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  events,
  registrations,
  currentUser = null,
  onSelectEvent,
  onRegisterClick,
  onRescheduleEvent,
  onOpenAuthModal,
}) => {
  const initialDate = useMemo(() => {
    if (events.length > 0) {
      const sorted = [...events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstDate = new Date(sorted[0].date);
      if (!isNaN(firstDate.getTime())) {
        return firstDate;
      }
    }
    return new Date();
  }, [events]);

  const [viewYear, setViewYear] = useState<number>(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialDate.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(initialDate));
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);

  const { eventsByDate, registeredEventIds } = useMemo(
    () => groupEventsByDate(events, registrations),
    [events, registrations]
  );

  const hasCustomEvents = useMemo(
    () => events.some((evt) => isCustomEvent(evt)),
    [events]
  );

  const ownedCustomEventCount = useMemo(
    () => events.filter((evt) => isCustomEventOwner(evt, currentUser)).length,
    [events, currentUser]
  );

  const draggedEvent = useMemo(
    () => (draggedEventId ? events.find((e) => e.id === draggedEventId) || null : null),
    [events, draggedEventId]
  );
  const draggedSourceDateKey = draggedEvent ? toDateKey(draggedEvent.date) : null;

  const cells = useMemo(
    () => getMonthCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthEvents = useMemo(() => {
    return events
      .filter((evt) => toDateKey(evt.date).startsWith(monthPrefix))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, monthPrefix]);

  const registeredMonthCount = useMemo(() => {
    return monthEvents.filter((evt) => registeredEventIds.has(evt.id)).length;
  }, [monthEvents, registeredEventIds]);

  // Keep selected date aligned to an event in the viewed month if current selection is outside it
  useEffect(() => {
    if (!selectedDateKey.startsWith(monthPrefix)) {
      if (monthEvents.length > 0) {
        setSelectedDateKey(toDateKey(monthEvents[0].date));
      } else {
        setSelectedDateKey(`${monthPrefix}-01`);
      }
    }
  }, [monthPrefix, monthEvents, selectedDateKey]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateKey(toDateKey(now));
  };

  const handleEventDragStart = (e: React.DragEvent<HTMLElement>, evt: EventItem) => {
    if (!onRescheduleEvent || !isCustomEventOwner(evt, currentUser)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', evt.id);
    setDraggedEventId(evt.id);
  };

  const handleEventDragEnd = () => {
    setDraggedEventId(null);
    setDragOverDateKey(null);
  };

  const handleCellDragOver = (e: React.DragEvent<HTMLDivElement>, dateKey: string) => {
    if (!draggedEventId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDateKey !== dateKey) {
      setDragOverDateKey(dateKey);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent<HTMLDivElement>, dateKey: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverDateKey === dateKey) {
      setDragOverDateKey(null);
    }
  };

  const handleCellDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetCell: { dateKey: string; isCurrentMonth: boolean }
  ) => {
    e.preventDefault();
    const droppedId = e.dataTransfer?.getData('text/plain') || draggedEventId;
    setDraggedEventId(null);
    setDragOverDateKey(null);

    if (!droppedId || !onRescheduleEvent) return;
    const targetEvent = events.find((ev) => ev.id === droppedId);
    if (!targetEvent || !isCustomEventOwner(targetEvent, currentUser)) return;
    if (toDateKey(targetEvent.date) === targetCell.dateKey) return;

    if (!targetCell.isCurrentMonth) {
      const [y, m] = targetCell.dateKey.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
    setSelectedDateKey(targetCell.dateKey);
    onRescheduleEvent(targetEvent.id, targetCell.dateKey);
  };

  const selectedDayEvents = eventsByDate[selectedDateKey] || [];
  const formattedSelectedDay = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    if (!y || !m || !d) return selectedDateKey;
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateKey]);

  return (
    <div className="space-y-6" data-testid="monthly-calendar-view">
      {/* Calendar Header & Month Controls */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                {formatMonthYearLabel(viewYear, viewMonth)}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'} scheduled
                {registeredMonthCount > 0 ? ` · ${registeredMonthCount} registered` : ''}
              </p>
            </div>
          </div>

          {/* Month Navigation + Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 mr-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Upcoming</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Registered</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Waitlist</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Organizer Drag-and-Drop Notice Bar (shown when custom events are present) */}
        {hasCustomEvents && (
          <div className="px-4 sm:px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-indigo-50/60 dark:bg-indigo-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            {ownedCustomEventCount > 0 ? (
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                <GripVertical className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>Organizer Drag & Drop:</strong> Drag your custom events (marked with a grip handle) onto any date cell to reschedule.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  {currentUser
                    ? `Signed in as ${currentUser.fullName}. Only the custom event owner can drag events to reschedule.`
                    : 'Sign in as the event organizer to drag and reschedule your custom events.'}
                </span>
              </div>
            )}
            {!currentUser && onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Sign In to Manage
              </button>
            )}
          </div>
        )}

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 7-Column Calendar Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-stone-200 dark:divide-stone-800 border-b border-stone-200 dark:border-stone-800">
          {cells.map((cell) => {
            const dayEvents = eventsByDate[cell.dateKey] || [];
            const isSelected = selectedDateKey === cell.dateKey;
            const hasRegistered = dayEvents.some((evt) => registeredEventIds.has(evt.id));
            const isDropTarget =
              Boolean(draggedEventId) &&
              dragOverDateKey === cell.dateKey &&
              draggedSourceDateKey !== cell.dateKey;

            return (
              <div
                key={cell.dateKey}
                data-date-key={cell.dateKey}
                onDragOver={(e) => handleCellDragOver(e, cell.dateKey)}
                onDragLeave={(e) => handleCellDragLeave(e, cell.dateKey)}
                onDrop={(e) => handleCellDrop(e, cell)}
                className={`min-h-[68px] sm:min-h-[112px] p-1.5 sm:p-2 flex flex-col transition-colors ${
                  cell.isCurrentMonth
                    ? 'bg-white dark:bg-stone-900'
                    : 'bg-stone-50/70 dark:bg-stone-950/40 text-stone-400 dark:text-stone-600'
                } ${
                  isDropTarget
                    ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/60'
                    : isSelected
                    ? 'ring-2 ring-inset ring-indigo-500/80 bg-indigo-50/30 dark:bg-indigo-950/20'
                    : ''
                }`}
              >
                {/* Day Number Header Button */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    aria-label={`Select ${cell.dateKey} (${dayEvents.length} events)`}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer tabular-nums ${
                      cell.isToday
                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                        : isSelected
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : cell.isCurrentMonth
                        ? 'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                        : 'text-stone-400 dark:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {cell.dayNumber}
                  </button>

                  {isDropTarget ? (
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white">
                      Drop date
                    </span>
                  ) : hasRegistered ? (
                    <span
                      title="You are registered for an event on this date"
                      className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                    >
                      Going
                    </span>
                  ) : null}
                </div>

                {/* Desktop Event Chips */}
                <div className="hidden sm:flex flex-col gap-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((evt) => {
                    const isRegistered = registeredEventIds.has(evt.id);
                    const isFull = isEventAtFullCapacity(evt);
                    const isOwner = Boolean(onRescheduleEvent) && isCustomEventOwner(evt, currentUser);
                    const isDraggingThis = draggedEventId === evt.id;

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        draggable={isOwner}
                        data-event-id={evt.id}
                        data-owned-custom={isOwner ? 'true' : 'false'}
                        onDragStart={(e) => handleEventDragStart(e, evt)}
                        onDragEnd={handleEventDragEnd}
                        onClick={() => {
                          setSelectedDateKey(cell.dateKey);
                          onSelectEvent(evt);
                        }}
                        className={`w-full text-left px-1.5 py-1 rounded text-[11px] font-semibold truncate transition-all flex items-center gap-1 ${
                          isOwner ? 'cursor-grab active:cursor-grabbing ring-1 ring-indigo-400/50 dark:ring-indigo-500/40' : 'cursor-pointer'
                        } ${isDraggingThis ? 'opacity-45 scale-[0.98]' : ''} ${
                          isRegistered
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            : isFull
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                        }`}
                        title={
                          isOwner
                            ? `${evt.title} · Owned by you (drag to another date to reschedule)`
                            : `${evt.title} · ${evt.city}`
                        }
                        aria-label={
                          isOwner
                            ? `${evt.title} (Your custom event — drag to reschedule)`
                            : evt.title
                        }
                      >
                        {isOwner && (
                          <GripVertical className="w-3 h-3 shrink-0 text-indigo-500 dark:text-indigo-400" />
                        )}
                        {isRegistered && <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                        <span className="truncate">{evt.title}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 hover:text-indigo-600 text-left px-1 cursor-pointer"
                    >
                      +{dayEvents.length - 2} more
                    </button>
                  )}
                </div>

                {/* Mobile Dot Indicators */}
                {dayEvents.length > 0 && (
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-auto pt-1">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const isRegistered = registeredEventIds.has(evt.id);
                      const isFull = isEventAtFullCapacity(evt);
                      return (
                        <span
                          key={evt.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRegistered
                              ? 'bg-emerald-500'
                              : isFull
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Date Agenda Drawer */}
        <div className="p-4 sm:p-5 bg-stone-50/70 dark:bg-stone-950/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Selected Date Agenda
              </div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {formattedSelectedDay}
              </h4>
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'} on this day
            </span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-500 dark:text-stone-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>No events scheduled on this date. Select a highlighted date above to inspect its schedule.</span>
              {monthEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(toDateKey(monthEvents[0].date))}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  Jump to next event in {formatMonthYearLabel(viewYear, viewMonth)}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayEvents.map((evt) => {
                const isRegistered = registeredEventIds.has(evt.id);
                const isFull = isEventAtFullCapacity(evt);
                const isOwner = Boolean(onRescheduleEvent) && isCustomEventOwner(evt, currentUser);

                return (
                  <div
                    key={evt.id}
                    draggable={isOwner}
                    onDragStart={(e) => handleEventDragStart(e, evt)}
                    onDragEnd={handleEventDragEnd}
                    className={`p-4 rounded-xl border bg-white dark:bg-stone-900 flex flex-col justify-between gap-3 shadow-2xs ${
                      isOwner
                        ? 'border-indigo-200 dark:border-indigo-800/70 cursor-grab active:cursor-grabbing'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">
                            {evt.category}
                          </span>
                          {isOwner && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shrink-0">
                              <GripVertical className="w-2.5 h-2.5" />
                              <span>Your Event</span>
                            </span>
                          )}
                        </div>
                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Registered</span>
                          </span>
                        ) : isFull ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            Sold Out · Waitlist
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {evt.price === 0 ? 'Free' : `$${evt.price}`}
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {evt.title}
                      </h5>

                      <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                          <span>{evt.formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                          <span className="truncate">{evt.venue}, {evt.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegisterClick(evt)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isFull
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>{isFull ? 'Join Waitlist' : 'Register'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
