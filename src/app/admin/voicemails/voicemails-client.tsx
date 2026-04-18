"use client";

import { useState } from "react";

type Voicemail = {
  id: string;
  from_number: string;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_status: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialVoicemails: Voicemail[];
};

export default function VoicemailsClient({ initialVoicemails }: Props) {
  const [voicemails, setVoicemails] = useState<Voicemail[]>(initialVoicemails);
  const [showRead, setShowRead] = useState(false);

  const visibleVoicemails = voicemails.filter((v) => showRead || !v.is_read);

  const markAsRead = async (id: string) => {
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
    } catch (error) {
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
    } catch (error) {
      alert("Error deleting voicemail");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

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

  const unreadCount = voicemails.filter((v) => !v.is_read).length;

  return (
    <div className="space-y-6">
      {/* Stats & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-xl border border-black/8 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-[var(--color-muted)]">
            Unread Messages
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">
            {unreadCount}
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={showRead}
            onChange={(e) => setShowRead(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary-gold)]"
          />
          <span className="text-sm font-semibold text-[var(--color-navy)]">
            Show read messages
          </span>
        </label>
      </div>

      {/* Voicemails List */}
      {visibleVoicemails.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            {showRead ? "No voicemails" : "No unread voicemails"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleVoicemails.map((voicemail) => (
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

                  {/* Audio Player */}
                  {voicemail.recording_url && (
                    <div className="mt-4">
                      <audio
                        controls
                        className="w-full max-w-md"
                        onPlay={() => !voicemail.is_read && markAsRead(voicemail.id)}
                      >
                        <source src={`/api/admin/voicemails/${voicemail.id}/audio`} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Transcription */}
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

                {/* Actions */}
                <div className="flex gap-2">
                  {!voicemail.is_read && (
                    <button
                      onClick={() => markAsRead(voicemail.id)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-200"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteVoicemail(voicemail.id)}
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
