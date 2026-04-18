"use client";

import { useState } from "react";

type PhoneSettings = {
  id: string;
  forward_to_number: string;
  is_forwarding_enabled: boolean;
  voicemail_message: string;
  voicemail_voice: string | null;
  created_at: string;
  updated_at: string;
} | null;

type PhoneAvailability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialSettings: PhoneSettings;
  initialAvailability: PhoneAvailability[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PhoneSettingsClient({ initialSettings, initialAvailability }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [availability, setAvailability] = useState(initialAvailability);
  const [saving, setSaving] = useState(false);
  const [addingWindow, setAddingWindow] = useState(false);

  // Form state
  const [forwardNumber, setForwardNumber] = useState(settings?.forward_to_number || "");
  const [isEnabled, setIsEnabled] = useState(settings?.is_forwarding_enabled ?? true);
  const [voicemailMsg, setVoicemailMsg] = useState(
    settings?.voicemail_message ||
      "Thank you for calling Rush N Dush Logistics. We are unable to take your call at this time. Please leave a detailed message with your name, phone number, and property address, and we will get back to you as soon as possible."
  );
  const [voicemailVoice, setVoicemailVoice] = useState(settings?.voicemail_voice || "Polly.Matthew");

  // New availability window state
  const [newDay, setNewDay] = useState(1);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("17:00");

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/phone-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forward_to_number: forwardNumber,
          is_forwarding_enabled: isEnabled,
          voicemail_message: voicemailMsg,
          voicemail_voice: voicemailVoice,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAvailability = async () => {
    setAddingWindow(true);
    try {
      const response = await fetch("/api/admin/phone-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: newDay,
          start_time: newStartTime,
          end_time: newEndTime,
          is_active: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailability([...availability, data].sort((a, b) => a.day_of_week - b.day_of_week));
        // Reset form
        setNewDay(1);
        setNewStartTime("09:00");
        setNewEndTime("17:00");
      } else {
        alert("Failed to add availability window");
      }
    } catch (error) {
      alert("Error adding availability window");
    } finally {
      setAddingWindow(false);
    }
  };

  const handleDeleteAvailability = async (windowId: string) => {
    if (!confirm("Delete this availability window?")) return;

    try {
      const response = await fetch(`/api/admin/phone-availability/${windowId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAvailability(availability.filter((w) => w.id !== windowId));
      } else {
        alert("Failed to delete availability window");
      }
    } catch (error) {
      alert("Error deleting availability window");
    }
  };

  const handleToggleAvailability = async (window: PhoneAvailability) => {
    try {
      const response = await fetch(`/api/admin/phone-availability/${window.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: !window.is_active,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailability(availability.map((w) => (w.id === window.id ? data : w)));
      } else {
        alert("Failed to update availability window");
      }
    } catch (error) {
      alert("Error updating availability window");
    }
  };

  return (
    <div className="space-y-6">
      {/* Call Forwarding Settings */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-xl font-bold text-[var(--color-navy)]">Call Forwarding</h2>
        
        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-semibold text-[var(--color-navy)]">Enable call forwarding</span>
            </label>
            <p className="ml-6 text-xs text-[var(--color-muted)]">
              When enabled and within availability hours, calls will be forwarded to the number below
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)]">
              Forward calls to
            </label>
            <input
              type="tel"
              value={forwardNumber}
              onChange={(e) => setForwardNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className="mt-2 w-full rounded-lg border border-black/10 px-4 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Phone number to forward incoming calls to
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)]">
              Voicemail message
            </label>
            <textarea
              value={voicemailMsg}
              onChange={(e) => setVoicemailMsg(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-black/10 px-4 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              This message will be read aloud when forwarding is disabled or outside availability hours
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)]">
              Voicemail voice
            </label>
            <select
              value={voicemailVoice}
              onChange={(e) => setVoicemailVoice(e.target.value)}
              className="mt-2 w-full rounded-lg border border-black/10 px-4 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
            >
              <optgroup label="Male Voices">
                <option value="Polly.Matthew">Matthew (US English - Male, Neural)</option>
                <option value="Polly.Joey">Joey (US English - Male)</option>
                <option value="Polly.Justin">Justin (US English - Male, Child)</option>
              </optgroup>
              <optgroup label="Female Voices">
                <option value="Polly.Joanna">Joanna (US English - Female, Neural)</option>
                <option value="Polly.Kendra">Kendra (US English - Female)</option>
                <option value="Polly.Kimberly">Kimberly (US English - Female)</option>
                <option value="Polly.Salli">Salli (US English - Female)</option>
                <option value="Polly.Ivy">Ivy (US English - Female, Child)</option>
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Choose the voice that will read your voicemail message
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="rounded-lg bg-[var(--color-primary-gold)] px-6 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Phone Availability Schedule */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="mb-4 text-xl font-bold text-[var(--color-navy)]">Availability Schedule</h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Define when calls should be forwarded vs. sent to voicemail
        </p>

        {/* Existing windows */}
        <div className="mb-6 space-y-2">
          {availability.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No availability windows set. Calls will always be forwarded when enabled.
            </p>
          ) : (
            availability.map((window) => (
              <div
                key={window.id}
                className="flex items-center justify-between rounded-lg border border-black/10 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={window.is_active}
                    onChange={() => handleToggleAvailability(window)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-navy)]">
                      {DAY_NAMES[window.day_of_week]}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {window.start_time.substring(0, 5)} - {window.end_time.substring(0, 5)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAvailability(window.id)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new window */}
        <div className="rounded-lg border border-black/10 bg-blue-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-[var(--color-navy)]">Add Availability Window</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)]">Day</label>
              <select
                value={newDay}
                onChange={(e) => setNewDay(parseInt(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none"
              >
                {DAY_NAMES.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)]">Start Time</label>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)]">End Time</label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddAvailability}
            disabled={addingWindow}
            className="mt-3 rounded-lg bg-[var(--color-navy)] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addingWindow ? "Adding..." : "Add Window"}
          </button>
        </div>
      </div>
    </div>
  );
}
