import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { AuthSessionUser, RegistrationRecord, WaitlistEntry } from '../types/event';
import {
  generateQRCodeData,
  generateShareableTicketURL,
  parseImportedRegistrationsJson,
  validateRegistrationForm,
  formatProviderLabel,
  filterRegistrationsForAuthUser,
} from '../utils/eventUtils';
import { TicketQRCode, exportBrandedTicketQRPng } from './TicketQRCode';
import { 
  X, 
  Ticket, 
  Calendar, 
  MapPin, 
  Search, 
  Trash2, 
  Download, 
  QrCode, 
  CheckCircle, 
  Share2,
  Copy,
  Check,
  ImageDown,
  Link2,
  Clock,
  Pencil,
  Upload,
  Database,
  AlertCircle,
  LogIn,
  LogOut
} from 'lucide-react';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: RegistrationRecord[];
  waitlistEntries?: WaitlistEntry[];
  currentUser?: AuthSessionUser | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  onCancelRegistration: (ticketId: string) => void;
  onUpdateRegistration?: (
    ticketId: string,
    updates: Partial<Pick<RegistrationRecord, 'fullName' | 'email' | 'phone' | 'ticketType' | 'specialNotes'>>
  ) => void;
  onImportRegistrations?: (records: RegistrationRecord[]) => void;
  onClearAllRegistrations?: () => void;
  onLeaveWaitlist?: (waitlistId: string) => void;
  onBrowseEvents: () => void;
  onToast?: (message: string) => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  onClose,
  tickets,
  waitlistEntries = [],
  currentUser = null,
  onOpenAuthModal,
  onSignOut,
  onCancelRegistration,
  onUpdateRegistration,
  onImportRegistrations,
  onClearAllRegistrations,
  onLeaveWaitlist,
  onBrowseEvents,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'tickets' | 'waitlist'>('tickets');
  const [accountFilterOnly, setAccountFilterOnly] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<RegistrationRecord | null>(null);
  const [shareTicket, setShareTicket] = useState<RegistrationRecord | null>(null);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [exportedImageSuccess, setExportedImageSuccess] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    ticketType: RegistrationRecord['ticketType'];
    specialNotes: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    ticketType: 'General Admission',
    specialNotes: '',
  });
  const [editError, setEditError] = useState<string>('');
  const [storageFeedback, setStorageFeedback] = useState<string>('');
  const shareQrCanvasRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredWaitlist = waitlistEntries.filter((w) => {
    const q = search.toLowerCase();
    return (
      w.eventTitle.toLowerCase().includes(q) ||
      w.waitlistCode.toLowerCase().includes(q) ||
      w.fullName.toLowerCase().includes(q) ||
      w.eventCity.toLowerCase().includes(q)
    );
  });

  const scopedTickets =
    currentUser && accountFilterOnly ? filterRegistrationsForAuthUser(currentUser, tickets) : tickets;

  const filteredTickets = scopedTickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.eventTitle.toLowerCase().includes(q) ||
      t.ticketCode.toLowerCase().includes(q) ||
      t.fullName.toLowerCase().includes(q) ||
      t.eventCity.toLowerCase().includes(q)
    );
  });

  const handleDownloadTicket = (ticket: RegistrationRecord) => {
    const text = `
=============================================
EVENTPULSE ATTENDEE CREDENTIAL
=============================================
Ticket Code : ${ticket.ticketCode}
Event       : ${ticket.eventTitle}
Date & Time : ${ticket.eventDate}
Venue       : ${ticket.eventVenue}, ${ticket.eventCity}
Attendee    : ${ticket.fullName} (${ticket.email})
Access      : ${ticket.ticketType} (${ticket.ticketCount}x)
Registered  : ${new Date(ticket.registeredAt).toLocaleString()}
Status      : ${ticket.status}
=============================================
    `.trim();

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket-${ticket.ticketCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenShare = (ticket: RegistrationRecord) => {
    setCopiedShareUrl(false);
    setExportedImageSuccess(false);
    setShareTicket(ticket);
  };

  const handleCopyShareLink = async (ticket: RegistrationRecord) => {
    const shareUrl = generateShareableTicketURL(ticket);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Clipboard API fallback handled gracefully in restricted contexts
    }
    setCopiedShareUrl(true);
    setTimeout(() => setCopiedShareUrl(false), 2500);
    if (onToast) {
      onToast(`Shareable link copied for ${ticket.ticketCode}`);
    }
  };

  const handleNativeShare = async (ticket: RegistrationRecord) => {
    const shareUrl = generateShareableTicketURL(ticket);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `EventPulse Ticket: ${ticket.eventTitle}`,
          text: `${ticket.fullName}'s ${ticket.ticketType} pass (${ticket.ticketCode}) for ${ticket.eventTitle} on ${ticket.eventDate}.`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or native share unavailable; fall back to copying link
      }
    }
    await handleCopyShareLink(ticket);
  };

  const handleExportQRImage = (ticket: RegistrationRecord) => {
    const canvas = shareQrCanvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const ok = exportBrandedTicketQRPng(canvas, ticket);
    if (ok) {
      setExportedImageSuccess(true);
      setTimeout(() => setExportedImageSuccess(false), 2500);
      if (onToast) {
        onToast(`Exported QR ticket image EventPulse-QR-${ticket.ticketCode}.png`);
      }
    }
  };

  const handleExportRegistrationsJson = () => {
    const json = JSON.stringify(tickets, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EventPulse-Registrations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStorageFeedback(`Exported ${tickets.length} registration${tickets.length === 1 ? '' : 's'} as JSON.`);
    if (onToast) onToast('Registration backup exported as JSON.');
  };

  const handleImportJsonChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseImportedRegistrationsJson(text);
      if (!result.valid) {
        setStorageFeedback(result.error || 'Could not import registration JSON.');
        return;
      }
      if (onImportRegistrations) {
        onImportRegistrations(result.records);
      }
      setStorageFeedback(`Imported ${result.records.length} registration${result.records.length === 1 ? '' : 's'} into local storage.`);
    } catch {
      setStorageFeedback('Failed to read the selected JSON file.');
    }
  };

  const handleStartEdit = (ticket: RegistrationRecord) => {
    setEditingTicketId(ticket.id);
    setEditForm({
      fullName: ticket.fullName,
      email: ticket.email,
      phone: ticket.phone,
      ticketType: ticket.ticketType,
      specialNotes: ticket.specialNotes || '',
    });
    setEditError('');
  };

  const handleSaveEdit = (ticket: RegistrationRecord) => {
    const validation = validateRegistrationForm({
      fullName: editForm.fullName,
      email: editForm.email,
      phone: editForm.phone,
      eventId: ticket.eventId,
      ticketCount: ticket.ticketCount,
      agreedToTerms: true,
    });

    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0] || 'Please check updated fields.';
      setEditError(firstErr);
      return;
    }

    if (onUpdateRegistration) {
      onUpdateRegistration(ticket.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        ticketType: editForm.ticketType,
        specialNotes: editForm.specialNotes,
      });
    }
    setEditingTicketId(null);
    setEditError('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-tickets-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col animate-modal-pop">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h2 id="my-tickets-title" className="text-lg font-bold text-stone-900 dark:text-stone-100">
                My Tickets & Registrations
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Saved locally on this device ({tickets.length} pass{tickets.length === 1 ? '' : 'es'}, {waitlistEntries.length} waitlisted)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close My Tickets dialog"
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Social Auth Session Strip */}
        <div className="px-5 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-2 text-xs">
          {currentUser ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}
                >
                  {currentUser.avatarInitials}
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                    {currentUser.fullName}
                  </span>
                  <span className="ml-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                    ({formatProviderLabel(currentUser.provider)} session · {currentUser.email})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAccountFilterOnly((prev) => !prev)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                    accountFilterOnly
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {accountFilterOnly ? 'My Account Passes' : 'All Passes'}
                </button>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-2 py-1 text-[11px] font-semibold rounded-md border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Guest browser storage · Sign in with Google or GitHub to link a user profile.
              </span>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3 h-3 text-indigo-500" />
                  <span>Sign In</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Wallet View Tabs (Confirmed Passes vs Waitlist Queue) */}
        <div className="px-5 pt-3 pb-2 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2 bg-stone-50/70 dark:bg-stone-900/60">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Confirmed Passes ({tickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('waitlist')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'waitlist'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Waitlist Queue ({waitlistEntries.length})</span>
          </button>
        </div>

        {/* Local Storage Data Management Toolbar */}
        {activeTab === 'tickets' && (
          <div className="px-5 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-medium">Local Storage Manager</span>
              {storageFeedback && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1">
                  · {storageFeedback}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportJsonChange}
                className="hidden"
                aria-label="Import registrations JSON file"
              />
              {onImportRegistrations && (
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import JSON</span>
                </button>
              )}
              {tickets.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportRegistrationsJson}
                  className="px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Export JSON</span>
                </button>
              )}
              {tickets.length > 0 && onClearAllRegistrations && (
                confirmClearAll ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllRegistrations();
                        setConfirmClearAll(false);
                        setStorageFeedback('Cleared all locally stored registrations.');
                      }}
                      className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                    >
                      Confirm Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="px-2 py-1 text-stone-500 hover:text-stone-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Search if there are tickets or waitlist entries */}
        {(tickets.length > 0 || waitlistEntries.length > 0) && (
          <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'waitlist'
                    ? 'Search waitlist by event name or WL code...'
                    : 'Search by event name or ticket code...'
                }
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'waitlist' ? (
            waitlistEntries.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 mx-auto flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">No Waitlist Entries</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                    When an event reaches full capacity, you can join its priority waitlist and manage your spot here.
                  </p>
                </div>
              </div>
            ) : filteredWaitlist.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-500">
                No waitlist entries matched "{search}".
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWaitlist.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 dark:border-amber-800/40 pb-2.5">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                          {w.waitlistCode}
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {w.eventTitle}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1 self-start sm:self-auto tabular-nums">
                        <Clock className="w-3 h-3" />
                        <span>Waitlisted · Position #{w.position}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{w.eventDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{w.eventVenue}, {w.eventCity}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-1 border-t border-amber-200/70 dark:border-amber-800/40 gap-2">
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        Attendee: <strong className="text-stone-700 dark:text-stone-300">{w.fullName}</strong> ({w.preferredTicketType} · {w.requestedTickets}x)
                      </div>
                      {onLeaveWaitlist && (
                        <button
                          type="button"
                          onClick={() => onLeaveWaitlist(w.id)}
                          aria-label={`Leave waitlist for ${w.waitlistCode}`}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer self-end sm:self-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Leave Waitlist</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tickets.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 mx-auto flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">No Registrations Found</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  You haven't registered for any events yet. Explore upcoming summits, concerts, and workshops to claim your passes.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onBrowseEvents();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm cursor-pointer"
              >
                Explore Events Catalog
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500">
              No tickets matched your search query "{search}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80 pb-2.5">
                    <div>
                      <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                        {t.ticketCode}
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {t.eventTitle}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t.status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{t.eventDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{t.eventVenue}, {t.eventCity}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-1 border-t border-stone-100 dark:border-stone-800/80 gap-2">
                    <div className="text-[11px] text-stone-500">
                      Attendee: <strong className="text-stone-700 dark:text-stone-300">{t.fullName}</strong> ({t.ticketType})
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                        aria-label={`View scannable QR pass for ${t.ticketCode}`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View QR Pass</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenShare(t)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        aria-label={`Share ticket ${t.ticketCode}`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Ticket</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadTicket(t)}
                        className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors cursor-pointer"
                        aria-label={`Download pass text for ${t.ticketCode}`}
                        title="Save .txt credential"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {onUpdateRegistration && (
                        <button
                          type="button"
                          onClick={() =>
                            editingTicketId === t.id ? setEditingTicketId(null) : handleStartEdit(t)
                          }
                          className="p-1.5 text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                          aria-label={`Edit registration details for ${t.ticketCode}`}
                          title="Edit stored registration details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {confirmCancelId === t.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onCancelRegistration(t.id);
                              setConfirmCancelId(null);
                            }}
                            className="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer"
                          >
                            Confirm Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="px-1.5 py-0.5 text-[11px] text-stone-500 hover:text-stone-700 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(t.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                          aria-label={`Cancel registration for ${t.ticketCode}`}
                          title="Cancel registration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Edit Stored Registration Panel */}
                  {editingTicketId === t.id && (
                    <div className="pt-3 mt-2 border-t border-stone-200 dark:border-stone-800 space-y-3 text-xs animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          Edit Stored Registration ({t.ticketCode})
                        </span>
                        {editError && (
                          <span className="text-red-500 flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3 h-3" />
                            <span>{editError}</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={editForm.fullName}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                          aria-label="Edit attendee full name"
                          placeholder="Attendee full name"
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                        />
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                          aria-label="Edit attendee email"
                          placeholder="Attendee email"
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                        />
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                          aria-label="Edit attendee phone"
                          placeholder="Phone number"
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                        />
                        <select
                          value={editForm.ticketType}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              ticketType: e.target.value as RegistrationRecord['ticketType'],
                            }))
                          }
                          aria-label="Edit ticket tier"
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                        >
                          <option value="General Admission">General Admission</option>
                          <option value="VIP Pass">VIP Pass</option>
                          <option value="Student / Early Bird">Student / Early Bird</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editForm.specialNotes}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, specialNotes: e.target.value }))}
                        aria-label="Edit special notes"
                        placeholder="Dietary or accessibility notes (optional)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTicketId(null);
                            setEditError('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(t)}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* View Specific QR Pass Modal Overlay */}
          {selectedTicket && (
            <div 
              className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-label={`Digital Entry Pass for ${selectedTicket.eventTitle}`}
            >
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Check-in Pass
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    aria-label="Close pass view"
                    className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Unique QR Code Generated by qrcode.react */}
                <div className="py-1">
                  <TicketQRCode ticket={selectedTicket} size={180} showControls={true} />
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700/80 text-left space-y-1.5 text-xs">
                  <div className="font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                    {selectedTicket.eventTitle}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{selectedTicket.eventDate}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{selectedTicket.eventVenue}, {selectedTicket.eventCity}</span>
                  </div>
                  <div className="pt-1.5 border-t border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">Attendee:</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">{selectedTicket.fullName}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenShare(selectedTicket)}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Ticket</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="py-2 px-4 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Ticket & Export QR Image Modal Overlay */}
          {shareTicket && (
            <div
              className="fixed inset-0 z-70 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-ticket-title"
            >
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                {/* Hidden 2x Canvas for branded QR PNG export */}
                <div ref={shareQrCanvasRef} className="hidden" aria-hidden="true">
                  <QRCodeCanvas
                    value={generateQRCodeData(shareTicket)}
                    size={340}
                    level="H"
                    marginSize={2}
                    fgColor="#09090b"
                    bgColor="#ffffff"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 id="share-ticket-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Share Ticket Pass
                      </h3>
                      <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        {shareTicket.ticketCode}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareTicket(null)}
                    aria-label="Close share ticket dialog"
                    className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Compact Pass Preview with QR */}
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
                  <TicketQRCode ticket={shareTicket} size={84} compact={true} showControls={false} />
                  <div className="min-w-0 text-left space-y-1">
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-2">
                      {shareTicket.eventTitle}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      {shareTicket.eventDate}
                    </div>
                    <div className="text-[11px] text-stone-600 dark:text-stone-300 font-medium truncate">
                      {shareTicket.fullName} · {shareTicket.ticketType} ({shareTicket.ticketCount}x)
                    </div>
                  </div>
                </div>

                {/* Option 1: Shareable Ticket Link */}
                <div className="space-y-2">
                  <label
                    htmlFor="shareable-ticket-url"
                    className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Shareable Verification Link</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="shareable-ticket-url"
                      type="text"
                      readOnly
                      value={generateShareableTicketURL(shareTicket)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Shareable ticket link"
                      className="flex-1 px-3 py-2 text-xs font-mono bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(shareTicket)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {copiedShareUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Option 2: Export QR Code Image & Pass Actions */}
                <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Export Ticket to Your Device
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleExportQRImage(shareTicket)}
                      className="w-full py-2.5 px-3 text-xs font-bold rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {exportedImageSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                          <span>QR Image Saved!</span>
                        </>
                      ) : (
                        <>
                          <ImageDown className="w-4 h-4" />
                          <span>Export QR Image (.png)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNativeShare(shareTicket)}
                      className="w-full py-2.5 px-3 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-indigo-500" />
                      <span>Send via Share Sheet</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadTicket(shareTicket)}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Credential Summary (.txt)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
