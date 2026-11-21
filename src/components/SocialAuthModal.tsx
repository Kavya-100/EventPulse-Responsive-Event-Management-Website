import React, { useState, useEffect } from 'react';
import { AuthSessionUser, SocialAuthProvider } from '../types/event';
import {
  getMockProviderAccounts,
  formatProviderLabel,
  createMockSocialSession,
  MockSocialAccountPreset,
} from '../utils/eventUtils';
import {
  X,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Mail,
  User,
  AtSign,
  AlertCircle,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SocialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthSessionUser | null;
  onAuthSuccess: (user: AuthSessionUser) => void;
  onSignOut?: () => void;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.08.72-2.46 1.15-4.23 1.15-3.25 0-6.01-2.2-7-5.15H1v3.14C3.05 21.2 7.25 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5 13.99c-.25-.72-.39-1.49-.39-2.29s.14-1.57.39-2.29V6.27H1C.36 7.55 0 9.01 0 10.7s.36 3.15 1 4.43l4-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.56c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.1 15.3 0 12 0 7.25 0 3.05 2.8 1 6.87l4 3.14c.99-2.95 3.75-5.45 7-5.45Z"
    />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"
    />
  </svg>
);

export const SocialAuthModal: React.FC<SocialAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onSignOut,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<SocialAuthProvider | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState('bg-indigo-600');
  const [error, setError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Reset modal flow whenever opened
  useEffect(() => {
    if (isOpen) {
      setSelectedProvider(null);
      setSelectedPresetId('');
      setFullName('');
      setEmail('');
      setUsername('');
      setError('');
      setIsAuthorizing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const applyPreset = (preset: MockSocialAccountPreset) => {
    setSelectedPresetId(preset.id);
    setFullName(preset.fullName);
    setEmail(preset.email);
    setUsername(preset.username || '');
    setAvatarColor(preset.avatarColor);
    setError('');
  };

  const handleChooseProvider = (provider: SocialAuthProvider) => {
    setSelectedProvider(provider);
    const presets = getMockProviderAccounts(provider);
    if (presets.length > 0) {
      applyPreset(presets[0]);
    }
  };

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    if (cleanName.length < 2) {
      setError('Please enter a display name with at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError('Please enter a valid email address for this social account.');
      return;
    }

    setError('');
    setIsAuthorizing(true);

    setTimeout(() => {
      const sessionUser = createMockSocialSession(selectedProvider, {
        fullName: cleanName,
        email: cleanEmail,
        username: username.trim() || undefined,
        avatarColor,
      });
      onAuthSuccess(sessionUser);
      setIsAuthorizing(false);
      onClose();
    }, 350);
  };

  const presets = selectedProvider ? getMockProviderAccounts(selectedProvider) : [];
  const providerLabel = selectedProvider ? formatProviderLabel(selectedProvider) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6 animate-modal-pop">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 1: Choose Provider */}
        {!selectedProvider ? (
          <div className="p-6 sm:p-7 space-y-6">
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Social Account Session</span>
              </div>
              <h2
                id="social-auth-modal-title"
                className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100"
              >
                Sign in to EventPulse
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Connect with Google or GitHub to autofill event registrations, sync comments, and keep your session stored alongside your ticket records in localStorage.
              </p>
            </div>

            {currentUser && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                  >
                    {currentUser.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                      Signed in with {formatProviderLabel(currentUser.provider)} · {currentUser.email}
                    </div>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                      onClose();
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0 cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleChooseProvider('google')}
                className="w-full py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 text-stone-900 dark:text-stone-100 font-semibold text-sm flex items-center justify-between transition-all shadow-2xs cursor-pointer group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                    <GoogleIcon className="w-4 h-4" />
                  </span>
                  <span>Continue with Google</span>
                </span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleChooseProvider('github')}
                className="w-full py-3 px-4 rounded-xl border border-stone-800 dark:border-stone-700 bg-stone-900 hover:bg-stone-800 dark:bg-stone-950 dark:hover:bg-stone-800 text-white font-semibold text-sm flex items-center justify-between transition-all shadow-xs cursor-pointer group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-stone-800 dark:bg-stone-900 border border-stone-700 flex items-center justify-center">
                    <GitHubIcon className="w-4 h-4 text-white" />
                  </span>
                  <span>Continue with GitHub</span>
                </span>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 flex items-start gap-2.5 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Simulated OAuth 2.0 consent flow for demo authentication. Your active session and ticket records stay safely persisted in browser <code className="font-mono text-indigo-600 dark:text-indigo-400">localStorage</code>.
              </span>
            </div>
          </div>
        ) : (
          /* Step 2: Simulated Provider OAuth Consent & Account Picker */
          <form onSubmit={handleAuthorize} noValidate className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 pr-8">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                aria-label="Back to provider selection"
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                {selectedProvider === 'google' ? (
                  <GoogleIcon className="w-4 h-4" />
                ) : (
                  <GitHubIcon className="w-4 h-4 text-stone-900 dark:text-stone-100" />
                )}
                <h2
                  id="social-auth-modal-title"
                  className="text-base font-extrabold text-stone-900 dark:text-stone-100"
                >
                  Authorize EventPulse with {providerLabel}
                </h2>
              </div>
            </div>

            {/* Quick-pick simulated provider accounts */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Select a {providerLabel} Account</span>
              </div>
              <div className="space-y-2">
                {presets.map((preset) => {
                  const active = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        active
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full ${preset.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                        >
                          {preset.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {preset.fullName}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                            {preset.email}
                          </div>
                        </div>
                      </div>
                      {active && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Profile Confirmation */}
            <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="space-y-1">
                <label
                  htmlFor="social-auth-name"
                  className="text-xs font-semibold text-stone-700 dark:text-stone-300 block"
                >
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    id="social-auth-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Your full name"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="social-auth-email"
                  className="text-xs font-semibold text-stone-700 dark:text-stone-300 block"
                >
                  {providerLabel} Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    id="social-auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="name@example.com"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {selectedProvider === 'github' && (
                <div className="space-y-1">
                  <label
                    htmlFor="social-auth-username"
                    className="text-xs font-semibold text-stone-700 dark:text-stone-300 block"
                  >
                    GitHub Handle
                  </label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      id="social-auth-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Scopes preview */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1">
              <div className="font-semibold text-stone-700 dark:text-stone-300">
                Requested Profile Permissions:
              </div>
              <div>· Read basic profile name & primary verified email address</div>
              <div>· Autofill attendee pass registrations on this browser</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isAuthorizing}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <span>{isAuthorizing ? 'Authorizing...' : 'Authorize & Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
