"use client";

import { useState, useEffect } from "react";
import type { Voicemail, Message } from "./page";

type Props = {
  initialVoicemails: Voicemail[];
  initialMessages: Message[];
  smsOutboundEnabled: boolean;
  initialReplyTo?: string;
  initialLeadId?: string;
};

type Tab = "voicemails" | "texts";

type Formatters = {
  formatDate: (dateString: string) => string;
  formatDuration: (seconds: number | null) => string;
  formatPhoneNumber: (phone: string) => string;
};

export default function CommsClient({
  initialVoicemails,
  initialMessages,
  smsOutboundEnabled,
  initialReplyTo,
  initialLeadId,
}: Props) {
  const [tab, setTab] = useState<Tab>("voicemails");
  const [voicemails, setVoicemails] = useState<Voicemail[]>(initialVoicemails);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [showRead, setShowRead] = useState(false);

  const [replyTo, setReplyTo] = useState(initialReplyTo || "");
  const [composerBody, setComposerBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Auto-switch to texts tab if replyTo is provided
  useEffect(() => {
    if (initialReplyTo) {
      setTab("texts");
    }
  }, [initialReplyTo]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      const number = cleaned.slice(1);
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // ---- Voicemail handlers ----
  const markAsVoicemailRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/voicemails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (response.ok) {
        setVoicemails((prev) =>
          prev.map((v) => (v.id === id ? { ...v, is_read: true } : v))
        );
      } else {
        alert("Failed to mark as read");
      }
    } catch {
      alert("Error marking voicemail as read");
    }
  };

  const deleteVoicemail = async (id: string) => {
    if (!confirm("Delete this voicemail?")) return;
    try {
      const response = await fetch(`/api/admin/voicemails/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setVoicemails((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert("Failed to delete voicemail");
      }
    } catch {
      alert("Error deleting voicemail");
    }
  };

  // ---- Message handlers ----
  const markMessageRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
        );
      } else {
        alert("Failed to mark as read");
      }
    } catch {
      alert("Error marking message as read");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this text message?")) return;
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert("Failed to delete message");
      }
    } catch {
      alert("Error deleting message");
    }
  };

  const handleReply = (number: string) => {
    if (!smsOutboundEnabled) return;
    setReplyTo(number);
    setTab("texts");
  };

  const sendMessage = async () => {
    const to = replyTo.trim();
    const body = composerBody.trim();

    if (!to || !body) {
      setSendError("Enter both a phone number and a message.");
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const response = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body, leadId: initialLeadId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSendError(data.error || "Failed to send message");
        return;
      }

      setComposerBody("");
      const refreshed = await fetch("/api/admin/messages");
      if (refreshed.ok) {
        const data = await refreshed.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      setSendError("Error sending message");
    } finally {
      setSending(false);
    }
  };

  // ---- Derived ----
  const visibleVoicemails = voicemails.filter((v) => showRead || !v.is_read);
  const unreadVoicemailCount = voicemails.filter((v) => !v.is_read).length;
  const unreadTextCount = messages.filter(
    (m) => m.direction !== "outbound" && !m.is_read
  ).length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "voicemails", label: "Voicemails", count: unreadVoicemailCount },
    { key: "texts", label: "Text Messages", count: unreadTextCount },
  ];

  const formatters: Formatters = { formatDate, formatDuration, formatPhoneNumber };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-black/8 bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-[var(--color-navy)] text-white"
                : "text-[var(--color-muted)] hover:bg-black/[0.04]"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-black ${
                  tab === t.key
                    ? "bg-white text-[var(--color-navy)]"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "voicemails" && (
        <VoicemailsPanel
          voicemails={visibleVoicemails}
          showRead={showRead}
          smsOutboundEnabled={smsOutboundEnabled}
          onToggleShowRead={setShowRead}
          onMarkRead={markAsVoicemailRead}
          onDelete={deleteVoicemail}
          onReply={handleReply}
          formatters={formatters}
        />
      )}

      {tab === "texts" && (
        <TextsPanel
          messages={messages}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          composerBody={composerBody}
          setComposerBody={setComposerBody}
          sending={sending}
          sendError={sendError}
          smsOutboundEnabled={smsOutboundEnabled}
          onSend={sendMessage}
          onMarkRead={markMessageRead}
          onDelete={deleteMessage}
          formatters={formatters}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voicemails panel
// ---------------------------------------------------------------------------
type VoicemailsPanelProps = {
  voicemails: Voicemail[];
  showRead: boolean;
  smsOutboundEnabled: boolean;
  onToggleShowRead: (show: boolean) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (number: string) => void;
  formatters: Formatters;
};

function VoicemailsPanel({
  voicemails,
  showRead,
  smsOutboundEnabled,
  onToggleShowRead,
  onMarkRead,
  onDelete,
  onReply,
  formatters,
}: VoicemailsPanelProps) {
  const { formatDate, formatDuration, formatPhoneNumber } = formatters;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={showRead}
            onChange={(e) => onToggleShowRead(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary-gold)]"
          />
          <span className="text-sm font-semibold text-[var(--color-navy)]">
            Show read messages
          </span>
        </label>
      </div>

      {voicemails.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            {showRead ? "No voicemails" : "No unread voicemails"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {voicemails.map((voicemail) => (
            <div
              key={voicemail.id}
              className={`rounded-xl border p-6 shadow-sm transition ${
                voicemail.is_read
                  ? "border-black/8 bg-white"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {!voicemail.is_read && (
                      <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                    )}
                    <h3 className="text-lg font-bold text-[var(--color-navy)]">
                      {formatPhoneNumber(voicemail.from_number)}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {formatDate(voicemail.created_at)} •{" "}
                    {formatDuration(voicemail.recording_duration)}
                  </p>

                  {voicemail.recording_url && (
                    <div className="mt-4">
                      <audio
                        controls
                        className="w-full max-w-md"
                        onPlay={() => !voicemail.is_read && onMarkRead(voicemail.id)}
                      >
                        <source
                          src={`/api/admin/voicemails/${voicemail.id}/audio`}
                          type="audio/mpeg"
                        />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {voicemail.transcription && (
                    <div className="mt-4 rounded-lg border border-black/10 bg-[var(--color-surface)] p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                        Transcription
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
                        {voicemail.transcription}
                      </p>
                    </div>
                  )}

                  {voicemail.transcription_status === "failed" && (
                    <p className="mt-2 text-xs text-orange-600">
                      Transcription failed
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!voicemail.is_read && (
                    <button
                      onClick={() => onMarkRead(voicemail.id)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-200"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => onReply(voicemail.from_number)}
                    disabled={!smsOutboundEnabled}
                    className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Text
                  </button>
                  <button
                    onClick={() => onDelete(voicemail.id)}
                    className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Texts panel
// ---------------------------------------------------------------------------
type TextsPanelProps = {
  messages: Message[];
  replyTo: string;
  setReplyTo: (value: string) => void;
  composerBody: string;
  setComposerBody: (value: string) => void;
  sending: boolean;
  sendError: string | null;
  smsOutboundEnabled: boolean;
  onSend: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  formatters: Formatters;
};

function TextsPanel({
  messages,
  replyTo,
  setReplyTo,
  composerBody,
  setComposerBody,
  sending,
  sendError,
  smsOutboundEnabled,
  onSend,
  onMarkRead,
  onDelete,
  formatters,
}: TextsPanelProps) {
  const { formatDate, formatPhoneNumber } = formatters;

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[var(--color-navy)]">
          Send a text message
        </p>
        {!smsOutboundEnabled && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Outbound SMS is disabled until the Twilio A2P campaign is approved.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="tel"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="Phone number (e.g. (720) 897-5219)"
            disabled={!smsOutboundEnabled}
            className="w-full rounded-lg border border-black/10 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary-gold)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <textarea
            value={composerBody}
            onChange={(e) => setComposerBody(e.target.value)}
            placeholder="Type your message…"
            rows={3}
            disabled={!smsOutboundEnabled}
            className="w-full resize-none rounded-lg border border-black/10 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary-gold)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          {sendError && <p className="text-xs text-red-600">{sendError}</p>}
          <button
            onClick={onSend}
            disabled={sending || !smsOutboundEnabled}
            className="self-end rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            No text messages yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const inbound = message.direction !== "outbound";
            const contact = inbound ? message.from_number : message.to_number;
            return (
              <div
                key={message.id}
                className={`rounded-xl border p-5 shadow-sm transition ${
                  !message.is_read && inbound
                    ? "border-blue-200 bg-blue-50"
                    : "border-black/8 bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {!inbound && (
                        <span className="rounded bg-black/5 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
                          Sent
                        </span>
                      )}
                      {!message.is_read && inbound && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                      )}
                      <h3 className="text-lg font-bold text-[var(--color-navy)]">
                        {formatPhoneNumber(contact)}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {inbound ? "Incoming" : "Outgoing"} •{" "}
                      {formatDate(message.created_at)}
                    </p>

                    {message.body && (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg border border-black/10 bg-[var(--color-surface)] p-4 text-sm leading-relaxed text-[var(--color-ink)]">
                        {message.body}
                      </p>
                    )}

                    {message.media_urls && message.media_urls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {message.media_urls.map((_, index) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={index}
                            src={`/api/admin/messages/${message.id}/media/${index}`}
                            alt={`Media ${index + 1}`}
                            className="h-32 w-32 rounded-lg border border-black/10 object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {inbound && (
                      <button
                        onClick={() => onMarkRead(message.id)}
                        disabled={message.is_read}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-200 disabled:opacity-40"
                      >
                        {message.is_read ? "Read" : "Mark Read"}
                      </button>
                    )}
                    <button
                      onClick={() => setReplyTo(contact)}
                      disabled={!smsOutboundEnabled}
                      className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => onDelete(message.id)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}