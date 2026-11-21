import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { EventItem, RegistrationRecord } from '../types/event';
import { generateCustomEventAnalytics } from '../utils/eventUtils';
import {
  X,
  BarChart3,
  Users,
  Ticket,
  DollarSign,
  TrendingUp,
  PlusCircle,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

interface MyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customEvents: EventItem[];
  registrations: RegistrationRecord[];
  onOpenCreateEvent: () => void;
  onSelectEvent: (event: EventItem) => void;
}

export const MyAnalyticsModal: React.FC<MyAnalyticsModalProps> = ({
  isOpen,
  onClose,
  customEvents,
  registrations,
  onOpenCreateEvent,
  onSelectEvent,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const analytics = useMemo(
    () => generateCustomEventAnalytics(customEvents, registrations, selectedEventId),
    [customEvents, registrations, selectedEventId]
  );

  if (!isOpen) return null;

  const activeFilterValid =
    selectedEventId === 'all' || customEvents.some((evt) => evt.id === selectedEventId);
  const effectiveFilter = activeFilterValid ? selectedEventId : 'all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-analytics-title"
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="my-analytics-title"
                className="text-lg font-bold text-stone-900 dark:text-stone-100"
              >
                My Analytics
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Attendee growth and ticket sales trends for your hosted custom events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {customEvents.length > 0 && (
              <select
                value={effectiveFilter}
                onChange={(e) => setSelectedEventId(e.target.value)}
                aria-label="Filter analytics by custom event"
                className="px-3 py-1.5 text-xs font-medium bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px] truncate"
              >
                <option value="all">All Custom Events ({customEvents.length})</option>
                {customEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateEvent();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Host New Event</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close My Analytics dialog"
              className="p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {customEvents.length === 0 ? (
            /* Empty State */
            <div className="py-14 px-6 text-center rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  No Custom Events Hosted Yet
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Publish your first custom event via Host Event to unlock live Recharts
                  visualizations tracking attendee growth, capacity utilization, and ticket sales
                  revenue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateEvent();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Event</span>
              </button>
            </div>
          ) : (
            <>
              {/* 4-Column KPI Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span>Hosted Events</span>
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                    {analytics.totalCustomEvents}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    Active in catalog
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span>Total Attendees</span>
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                    {analytics.totalAttendees.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                    of {analytics.totalCapacity.toLocaleString()} capacity
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span>Tickets Sold</span>
                    <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                    {analytics.totalTicketsSold.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-medium">
                    {analytics.averageFillRate}% average fill
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span>Ticket Revenue</span>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                    ${analytics.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    Estimated gross USD
                  </div>
                </div>
              </div>

              {/* Recharts Data Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Attendee Growth */}
                <div
                  data-testid="attendee-growth-chart-card"
                  className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        <span>Attendee Growth Trend</span>
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Cumulative registrations vs. capacity milestone pacing
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart
                        data={analytics.growthSeries}
                        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="attendeeGrowthFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" opacity={0.6} />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11, fill: '#78716c' }}
                          axisLine={{ stroke: '#d6d3d1' }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="attendees"
                          allowDecimals={false}
                          domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.35))]}
                          tick={{ fontSize: 11, fill: '#4f46e5' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="target"
                          orientation="right"
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: '#78716c' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1c1917',
                            borderColor: '#44403c',
                            borderRadius: '8px',
                            color: '#fafaf9',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} itemSorter={null} />
                        <Area
                          yAxisId="attendees"
                          type="monotone"
                          dataKey="attendees"
                          name="Registered Attendees"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#4f46e5', strokeWidth: 1.5, stroke: '#ffffff' }}
                          activeDot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                          fill="url(#attendeeGrowthFill)"
                          animationDuration={200}
                        />
                        <Area
                          yAxisId="target"
                          type="monotone"
                          dataKey="capacityTarget"
                          name="Capacity Pacing"
                          stroke="#a8a29e"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          fill="transparent"
                          animationDuration={200}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Ticket Sales Trends */}
                <div
                  data-testid="ticket-sales-chart-card"
                  className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        <span>Ticket Sales Trends by Event</span>
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Tickets sold and gross revenue ($USD) across custom events
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={analytics.salesByEvent}
                        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" opacity={0.6} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#78716c' }}
                          axisLine={{ stroke: '#d6d3d1' }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          allowDecimals={false}
                          domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.25))]}
                          tick={{ fontSize: 11, fill: '#4f46e5' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          allowDecimals={false}
                          domain={[0, (max: number) => Math.max(50, Math.ceil(max * 1.15))]}
                          tick={{ fontSize: 11, fill: '#059669' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1c1917',
                            borderColor: '#44403c',
                            borderRadius: '8px',
                            color: '#fafaf9',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} itemSorter={null} />
                        <Bar
                          yAxisId="left"
                          dataKey="ticketsSold"
                          name="Tickets Sold"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                          barSize={28}
                          animationDuration={200}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="revenue"
                          name="Revenue ($USD)"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                          barSize={28}
                          animationDuration={200}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* High-Density Performance Table */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Custom Events Performance Breakdown
                  </h3>
                  <span className="text-[11px] text-stone-500 font-mono tabular-nums">
                    {analytics.salesByEvent.length} event{analytics.salesByEvent.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                        <th className="py-2.5 px-4 font-semibold">Event Name</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Sold / Capacity</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Fill Rate</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Revenue</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {analytics.salesByEvent.map((row) => {
                        const matchedEvent = customEvents.find((e) => e.id === row.eventId);
                        return (
                          <tr
                            key={row.eventId}
                            className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-semibold text-stone-900 dark:text-stone-100">
                              {row.fullTitle}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                              {row.ticketsSold} / {row.capacity}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                              {row.fillRate}%
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                              ${row.revenue.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {matchedEvent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onSelectEvent(matchedEvent);
                                  }}
                                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                                >
                                  <span>Inspect</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-500">
          <span>Synced with local organizer events & registration data</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
