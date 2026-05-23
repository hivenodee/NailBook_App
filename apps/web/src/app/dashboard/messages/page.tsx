"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type Thread = {
  id: string;
  updatedAt: string;
  appointment: {
    id: string;
    startTime: string;
    clientName: string | null;
    clientEmail: string | null;
    service: { name: string };
    client: { firstName: string | null; lastName: string | null };
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
    isSystem: boolean;
  } | null;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  isSystem: boolean;
  sender?: { firstName: string | null; avatarUrl: string | null } | null;
};

const QUICK_REPLIES = [
  "Confirmed. See you then.",
  "Running about 10 minutes behind.",
  "Thanks for booking with me.",
  "Just sent the payment link.",
  "Hope you loved it. Mind leaving a quick review?",
];

// ─── Helpers ───────────────────────────────────────────────

function getClientName(t: Thread): string {
  const c = t.appointment.client;
  if (c.firstName) return `${c.firstName}${c.lastName ? ` ${c.lastName}` : ""}`;
  return t.appointment.clientName || t.appointment.clientEmail || "Client";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dDate = new Date(d);
  dDate.setHours(0, 0, 0, 0);
  if (dDate.getTime() === today.getTime()) return "Today";
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── Page ──────────────────────────────────────────────────

export default function MessagesPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeThreadId = searchParams.get("thread");

  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [myUserId, setMyUserId] = React.useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);

  const [composer, setComposer] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Load threads
  const loadThreads = React.useCallback(async () => {
    try {
      const res = await fetch("/api/messages/threads");
      const json = await res.json();
      if (json.data) {
        setThreads(json.data.threads);
        setMyUserId(json.data.myUserId);
      }
    } catch (e) {
      console.error("Failed to load threads:", e);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages for active thread
  const loadMessages = React.useCallback(async (threadId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(
        `/api/messages?threadId=${encodeURIComponent(threadId)}`,
      );
      const json = await res.json();
      setMessages(json.data || []);
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeThreadId) loadMessages(activeThreadId);
    else setMessages([]);
  }, [activeThreadId, loadMessages]);

  // Soft poll while a thread is open (10s).
  React.useEffect(() => {
    if (!activeThreadId) return;
    const t = setInterval(() => {
      fetch(`/api/messages?threadId=${encodeURIComponent(activeThreadId)}`)
        .then((r) => r.json())
        .then((j) => setMessages(j.data || []))
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
  }, [activeThreadId]);

  function selectThread(threadId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (threadId) params.set("thread", threadId);
    else params.delete("thread");
    router.replace(`/dashboard/messages${params.toString() ? `?${params}` : ""}`);
  }

  async function sendMessage() {
    if (!activeThreadId || !composer.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThreadId,
          body: composer.trim(),
        }),
      });
      if (res.ok) {
        setComposer("");
        await loadMessages(activeThreadId);
        await loadThreads();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Couldn't send that message.");
      }
    } catch {
      alert("Couldn't send that message. Try again.");
    } finally {
      setSending(false);
    }
  }

  // Filter threads by search
  const filteredThreads = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const name = getClientName(t).toLowerCase();
      const service = t.appointment.service.name.toLowerCase();
      const preview = t.lastMessage?.body.toLowerCase() ?? "";
      return name.includes(q) || service.includes(q) || preview.includes(q);
    });
  }, [threads, search]);

  const activeThread = activeThreadId
    ? threads.find((t) => t.id === activeThreadId) ?? null
    : null;
  const isFullEmpty = !threadsLoading && threads.length === 0;

  return (
    <div className="-mx-6 lg:-mx-10 -my-10 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] flex flex-col">
      {/* List view title — only on conversations list (per spec) */}
      <div
        className={cn(
          "px-6 lg:px-10 pt-8 pb-4",
          // Hide title on mobile when viewing a thread
          activeThreadId ? "hidden lg:block" : "block",
        )}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <Heading variant="display" className="text-3xl md:text-4xl">
              Messages
            </Heading>
            <p className="font-sans text-sm text-ink-500">
              {threadsLoading
                ? "Loading…"
                : threads.length === 0
                  ? "Conversations land here when bookings come in."
                  : `${threads.length} ${threads.length === 1 ? "conversation" : "conversations"}`}
            </p>
          </div>
          <Link
            href="/dashboard/messages/templates"
            className="font-sans text-sm text-ink-500 hover:text-ink-900 underline-offset-4 hover:underline transition-colors"
          >
            Manage templates
          </Link>
        </div>
      </div>

      {/* Two-pane body */}
      <div className="flex-1 min-h-0 flex border-t border-ink-200">
        {/* ─── List pane (35% on lg+, full on mobile when no active thread) ─── */}
        <aside
          className={cn(
            "flex flex-col border-r border-ink-200 bg-cream-50",
            "lg:w-[35%] lg:max-w-md",
            activeThreadId ? "hidden lg:flex w-full" : "flex w-full",
          )}
        >
          {/* Search */}
          <div className="px-4 py-3 border-b border-ink-200">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="h-10 w-full rounded-md border border-ink-200 bg-cream-50 pl-10 pr-3 font-sans text-sm text-ink-900 placeholder:text-ink-300 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
              />
            </div>
          </div>

          {/* Thread list / empty state */}
          {threadsLoading ? (
            <div className="px-4 py-3 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-md skeleton-shimmer bg-cream-100"
                />
              ))}
            </div>
          ) : isFullEmpty ? (
            <div className="flex-1 px-2 py-4">
              <div className="rounded-md border border-dashed border-ink-200">
                <EmptyState
                  icon={MessageCircle}
                  size="sm"
                  title="No messages yet"
                  description="Conversations with clients will appear here when bookings are made."
                />
              </div>
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="px-4 py-6 font-sans text-sm text-ink-500">
              No matches for &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {filteredThreads.map((t) => (
                <ConversationRow
                  key={t.id}
                  thread={t}
                  active={t.id === activeThreadId}
                  myUserId={myUserId}
                  onSelect={() => selectThread(t.id)}
                />
              ))}
            </ul>
          )}
        </aside>

        {/* ─── Thread pane (65% on lg+, full on mobile when active thread) ─── */}
        <section
          className={cn(
            "flex-1 min-w-0 flex flex-col bg-cream-50",
            activeThreadId ? "flex" : "hidden lg:flex",
          )}
        >
          {activeThread ? (
            <ThreadPane
              thread={activeThread}
              messages={messages}
              messagesLoading={messagesLoading}
              myUserId={myUserId}
              composer={composer}
              setComposer={setComposer}
              sending={sending}
              onSend={sendMessage}
              onBack={() => selectThread(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center px-6">
              <p className="font-display italic text-lg text-ink-500">
                Select a conversation
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Conversation row ─────────────────────────────────────

function ConversationRow({
  thread,
  active,
  myUserId,
  onSelect,
}: {
  thread: Thread;
  active: boolean;
  myUserId: string | null;
  onSelect: () => void;
}): React.JSX.Element {
  const name = getClientName(thread);
  const last = thread.lastMessage;
  const fromMe = last && myUserId && last.senderId === myUserId;
  const preview = last
    ? last.isSystem
      ? last.body
      : `${fromMe ? "You: " : ""}${last.body}`
    : `Booked ${new Date(thread.appointment.startTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;

  // Unread indicator: requires a Message.readAt schema field that doesn't
  // exist yet. Always false today; markup is ready for when it lands.
  const hasUnread = false;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-150",
          "border-l-2",
          active
            ? "bg-cream-100 border-l-rust-500"
            : "border-l-transparent hover:bg-cream-100",
          "focus-visible:outline-none focus-visible:bg-cream-100",
        )}
      >
        <Avatar name={name} size="md" className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-base text-ink-900 truncate">
              {name}
            </p>
            {last && (
              <span className="shrink-0 font-sans text-xs text-ink-500">
                {relativeTime(last.createdAt)}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 font-sans text-sm truncate",
              hasUnread ? "text-ink-900 font-medium" : "text-ink-500",
            )}
          >
            {preview}
          </p>
        </div>
        {hasUnread && (
          <span
            aria-hidden="true"
            className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-rust-500"
          />
        )}
      </button>
    </li>
  );
}

// ─── Thread pane ─────────────────────────────────────────

function ThreadPane({
  thread,
  messages,
  messagesLoading,
  myUserId,
  composer,
  setComposer,
  sending,
  onSend,
  onBack,
}: {
  thread: Thread;
  messages: Message[];
  messagesLoading: boolean;
  myUserId: string | null;
  composer: string;
  setComposer: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const name = getClientName(thread);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showQuickReplies, setShowQuickReplies] = React.useState(false);

  // Auto-scroll to bottom when messages change.
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, thread.id]);

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-pill text-ink-700 hover:bg-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>

        <Avatar name={name} size="md" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-ink-900 truncate">
            {name}
          </p>
          <p className="font-sans text-xs text-ink-500 truncate">
            {thread.appointment.service.name} ·{" "}
            {new Date(thread.appointment.startTime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <Link
          href={`/dashboard/appointments/${thread.appointment.id}`}
          aria-label="View appointment"
          className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-ink-500 hover:bg-cream-100 hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          <MoreHorizontal size={18} strokeWidth={1.75} />
        </Link>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-2"
      >
        {messagesLoading && messages.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-10 max-w-[60%] rounded-md skeleton-shimmer bg-cream-100",
                  i % 2 === 0 ? "ml-auto" : "mr-auto",
                )}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center font-sans text-sm text-ink-500 mt-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((m, i) => {
            const showSep =
              i === 0 || !isSameDay(messages[i - 1].createdAt, m.createdAt);
            const isSelf = myUserId !== null && m.senderId === myUserId;
            return (
              <React.Fragment key={m.id}>
                {showSep && <DateSeparator iso={m.createdAt} />}
                {m.isSystem ? (
                  <p className="text-center font-sans text-xs text-ink-500 italic py-2">
                    {m.body}
                  </p>
                ) : (
                  <Bubble body={m.body} isSelf={isSelf} />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-ink-200 px-4 py-3 bg-cream-50">
        {showQuickReplies && (
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_REPLIES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setComposer(composer ? `${composer} ${r}` : r);
                  setShowQuickReplies(false);
                }}
                className="shrink-0 inline-flex items-center h-8 rounded-pill border border-ink-200 bg-cream-50 px-3 font-sans text-xs text-ink-700 hover:border-ink-300 transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attachments — disabled, schema doesn't support yet */}
          <button
            type="button"
            disabled
            aria-label="Attach file (coming soon)"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-ink-300 cursor-not-allowed"
            title="Attachments coming soon"
          >
            <Paperclip size={16} strokeWidth={1.75} />
          </button>

          {/* Quick replies trigger */}
          <button
            type="button"
            onClick={() => setShowQuickReplies((v) => !v)}
            aria-label="Quick replies"
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
              showQuickReplies
                ? "bg-cream-100 text-rust-500"
                : "text-ink-500 hover:bg-cream-100 hover:text-ink-900",
            )}
            title="Quick replies"
          >
            <Sparkles size={16} strokeWidth={1.75} />
          </button>

          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Write a message"
            rows={1}
            className="flex-1 min-h-[40px] max-h-32 resize-none rounded-md border border-ink-200 bg-cream-50 px-4 py-2.5 font-sans text-base text-ink-900 placeholder:text-ink-300 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          />

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onSend}
            disabled={!composer.trim() || sending}
            aria-label="Send"
            className="shrink-0 px-3"
          >
            {sending ? (
              "Sending…"
            ) : (
              <>
                <Send size={14} strokeWidth={1.75} />
                <span className="hidden sm:inline ml-1.5">Send</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Bubble ────────────────────────────────────────────────

function Bubble({
  body,
  isSelf,
}: {
  body: string;
  isSelf: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-4 py-2.5 font-sans text-base whitespace-pre-line break-words",
          isSelf
            ? "bg-rust-500 text-cream-50"
            : "bg-cream-100 text-ink-900",
        )}
      >
        {body}
      </div>
    </div>
  );
}

// ─── Date separator ──────────────────────────────────────

function DateSeparator({ iso }: { iso: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex-1 h-px bg-ink-200" />
      <span className="font-display italic text-sm text-ink-500 px-1">
        {dateSeparatorLabel(iso)}
      </span>
      <span className="flex-1 h-px bg-ink-200" />
    </div>
  );
}
