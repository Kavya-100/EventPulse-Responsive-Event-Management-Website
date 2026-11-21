import React, { useState, useEffect, useMemo } from 'react';
import { AuthSessionUser, EventComment } from '../types/event';
import {
  validateCommentInput,
  createEventComment,
  getCommentsForEvent,
  deleteEventComment,
  formatCommentTimestamp,
  loadCommentsFromStorage,
  saveCommentsToStorage,
} from '../utils/eventUtils';
import { MessageSquare, Send, Trash2, AlertCircle } from 'lucide-react';

interface EventCommentsProps {
  eventId: string;
  eventTitle: string;
  currentUser?: AuthSessionUser | null;
  onToast?: (message: string) => void;
}

export const EventComments: React.FC<EventCommentsProps> = ({
  eventId,
  eventTitle,
  currentUser = null,
  onToast,
}) => {
  const [allComments, setAllComments] = useState<EventComment[]>(() =>
    loadCommentsFromStorage()
  );
  const [authorName, setAuthorName] = useState(() => currentUser?.fullName || '');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync from localStorage whenever the viewed event changes
  useEffect(() => {
    setAllComments(loadCommentsFromStorage());
    if (currentUser) {
      setAuthorName((prev) => prev || currentUser.fullName);
    }
    setErrors({});
  }, [eventId, currentUser?.id]);

  const eventComments = useMemo(
    () => getCommentsForEvent(eventId, allComments),
    [eventId, allComments]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCommentInput({ authorName, content });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const newComment = createEventComment({
      eventId,
      authorName,
      content,
    });

    const latestFromStorage = loadCommentsFromStorage();
    const updated = [newComment, ...latestFromStorage];
    setAllComments(updated);
    saveCommentsToStorage(updated);

    setAuthorName('');
    setContent('');
    setErrors({});

    if (onToast) {
      onToast(`Comment posted on ${eventTitle}`);
    }
  };

  const handleDelete = (comment: EventComment) => {
    const updated = deleteEventComment(comment.id, allComments);
    setAllComments(updated);
    saveCommentsToStorage(updated);

    if (onToast) {
      onToast('Comment removed');
    }
  };

  return (
    <section
      aria-labelledby="event-comments-heading"
      className="space-y-4 pt-2 border-t border-stone-200 dark:border-stone-800"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
          <h3
            id="event-comments-heading"
            className="text-base font-bold text-stone-900 dark:text-stone-100"
          >
            Public Comments
          </h3>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 tabular-nums">
            {eventComments.length}
          </span>
        </div>
        <span className="text-[11px] text-stone-400">Saved locally</span>
      </div>

      {/* Add Public Comment Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="comment-author-input"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Your Name *
            </label>
            <input
              id="comment-author-input"
              type="text"
              value={authorName}
              onChange={(e) => {
                setAuthorName(e.target.value);
                if (errors.authorName) {
                  setErrors((prev) => ({ ...prev, authorName: '' }));
                }
              }}
              placeholder="e.g. Jordan Taylor"
              aria-invalid={Boolean(errors.authorName)}
              className={`w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-stone-900 border text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.authorName
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            />
            {errors.authorName && (
              <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.authorName}</span>
              </p>
            )}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="comment-content-input"
                className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
              >
                Public Comment *
              </label>
              <span className="text-[11px] text-stone-400 tabular-nums">
                {content.trim().length} / 500
              </span>
            </div>
            <textarea
              id="comment-content-input"
              rows={3}
              maxLength={500}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) {
                  setErrors((prev) => ({ ...prev, content: '' }));
                }
              }}
              placeholder={`Ask a question or share your thoughts about ${eventTitle}...`}
              aria-invalid={Boolean(errors.content)}
              className={`w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-stone-900 border text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y ${
                errors.content
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            />
            {errors.content && (
              <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.content}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Comment</span>
          </button>
        </div>
      </form>

      {/* Comments List or Empty State */}
      {eventComments.length === 0 ? (
        <div className="p-5 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-1 bg-white dark:bg-stone-900/30">
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            No public comments yet
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Be the first attendee to post a question, tip, or discussion note for this event.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label={`Comments for ${eventTitle}`}>
          {eventComments.map((comment) => (
            <li
              key={comment.id}
              className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {comment.authorName}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {formatCommentTimestamp(comment.createdAt)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(comment)}
                  aria-label={`Delete comment by ${comment.authorName}`}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line break-words">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
