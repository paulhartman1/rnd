"use client";

import { useState } from "react";
import type {
  AppointmentTypeRow,
  AvailabilityWindowRow,
  BlackoutPeriodRow,
  AppointmentRequestRow,
} from "@/lib/appointment-types";

type Props = {
  initialTypes: AppointmentTypeRow[];
  initialAvailability: AvailabilityWindowRow[];
  initialBlackouts: BlackoutPeriodRow[];
  initialRequests: AppointmentRequestRow[];
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function AppointmentSettingsClient({
  initialTypes,
  initialAvailability,
  initialBlackouts,
  initialRequests,
}: Props) {
  const [activeTab, setActiveTab] = useState<"availability" | "blackouts" | "types">("availability");
  const [availability, setAvailability] = useState<AvailabilityWindowRow[]>(initialAvailability);
  const [blackouts, setBlackouts] = useState<BlackoutPeriodRow[]>(initialBlackouts);
  const [types, setTypes] = useState<AppointmentTypeRow[]>(initialTypes);
  
  const [editingAvailability, setEditingAvailability] = useState<AvailabilityWindowRow | null>(null);
  const [editingBlackout, setEditingBlackout] = useState<BlackoutPeriodRow | null>(null);
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [isAddingBlackout, setIsAddingBlackout] = useState(false);

  const handleSaveAvailability = async (window: Partial<AvailabilityWindowRow>) => {
    if (window.id) {
      // Update existing
      const response = await fetch(`/api/admin/availability/${window.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(window),
      });
      if (response.ok) {
        const updated = await response.json();
        setAvailability(availability.map(a => a.id === window.id ? updated : a));
        setEditingAvailability(null);
      } else {
        const error = await response.json();
        console.error("Failed to update availability:", error);
        alert(`Failed to update: ${error.error || "Unknown error"}`);
      }
    } else {
      // Create new
      const response = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(window),
      });
      if (response.ok) {
        const created = await response.json();
        setAvailability([...availability, created]);
        setIsAddingAvailability(false);
      } else {
        const error = await response.json();
        console.error("Failed to create availability:", error);
        alert(`Failed to save: ${error.error || "Unknown error"}`);
      }
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!confirm("Delete this availability window?")) return;
    const response = await fetch(`/api/admin/availability/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAvailability(availability.filter(a => a.id !== id));
    }
  };

  const handleSaveBlackout = async (blackout: Partial<BlackoutPeriodRow>) => {
    if (blackout.id) {
      // Update existing
      const response = await fetch(`/api/admin/blackouts/${blackout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blackout),
      });
      if (response.ok) {
        const updated = await response.json();
        setBlackouts(blackouts.map(b => b.id === blackout.id ? updated : b));
        setEditingBlackout(null);
      }
    } else {
      // Create new
      const response = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blackout),
      });
      if (response.ok) {
        const created = await response.json();
        setBlackouts([...blackouts, created]);
        setIsAddingBlackout(false);
      }
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    if (!confirm("Delete this blackout period?")) return;
    const response = await fetch(`/api/admin/blackouts/${id}`, { method: "DELETE" });
    if (response.ok) {
      setBlackouts(blackouts.filter(b => b.id !== id));
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Denver",
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/10">
        <button
          onClick={() => setActiveTab("availability")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "availability"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Availability
        </button>
        <button
          onClick={() => setActiveTab("blackouts")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "blackouts"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Blackout Dates
        </button>
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "types"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Appointment Types
        </button>
      </div>

      {/* Availability Tab */}
      {activeTab === "availability" && (
        <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-navy)]">Business Hours</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Set your weekly availability for appointments
              </p>
            </div>
            <button
              onClick={() => setIsAddingAvailability(true)}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
            >
              + Add Hours
            </button>
          </div>

          <div className="space-y-3">
            {availability.length === 0 && !isAddingAvailability && (
              <p className="text-sm text-[var(--color-muted)]">No availability windows set. Add your business hours.</p>
            )}
            
            {availability.map((window) => (
              <div key={window.id} className="flex items-center justify-between rounded-lg border border-black/10 p-4">
                <div>
                  <p className="font-bold text-[var(--color-navy)]">
                    {DAYS_OF_WEEK.find(d => d.value === window.day_of_week)?.label}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {formatTime(window.start_time)} - {formatTime(window.end_time)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingAvailability(window)}
                    className="text-sm font-bold text-[var(--color-accent)] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAvailability(window.id)}
                    className="text-sm font-bold text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {(isAddingAvailability || editingAvailability) && (
              <AvailabilityForm
                initial={editingAvailability || undefined}
                onSave={handleSaveAvailability}
                onCancel={() => {
                  setIsAddingAvailability(false);
                  setEditingAvailability(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Blackouts Tab */}
      {activeTab === "blackouts" && (
        <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-navy)]">Blackout Periods</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Block out dates when you're unavailable
              </p>
            </div>
            <button
              onClick={() => setIsAddingBlackout(true)}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
            >
              + Add Blackout
            </button>
          </div>

          <div className="space-y-3">
            {blackouts.length === 0 && !isAddingBlackout && (
              <p className="text-sm text-[var(--color-muted)]">No blackout periods set.</p>
            )}
            
            {blackouts.map((blackout) => (
              <div key={blackout.id} className="flex items-center justify-between rounded-lg border border-black/10 p-4">
                <div>
                  <p className="font-bold text-[var(--color-navy)]">
                    {blackout.reason || "Unavailable"}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {formatDate(blackout.start_time.split("T")[0])} - {formatDate(blackout.end_time.split("T")[0])}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingBlackout(blackout)}
                    className="text-sm font-bold text-[var(--color-accent)] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBlackout(blackout.id)}
                    className="text-sm font-bold text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {(isAddingBlackout || editingBlackout) && (
              <BlackoutForm
                initial={editingBlackout || undefined}
                onSave={handleSaveBlackout}
                onCancel={() => {
                  setIsAddingBlackout(false);
                  setEditingBlackout(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Types Tab */}
      {activeTab === "types" && (
        <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[var(--color-navy)]">Appointment Types</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Current appointment types offered
            </p>
          </div>

          <div className="space-y-3">
            {types.map((type) => (
              <div key={type.id} className="rounded-lg border border-black/10 p-4">
                <p className="font-bold text-[var(--color-navy)]">{type.name}</p>
                {type.description && (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{type.description}</p>
                )}
                <p className="mt-2 text-sm text-[var(--color-accent)]">
                  Duration: {type.default_duration_minutes} minutes
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Availability Form Component
function AvailabilityForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: AvailabilityWindowRow;
  onSave: (data: Partial<AvailabilityWindowRow>) => void;
  onCancel: () => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(initial?.day_of_week ?? 1);
  const [startTime, setStartTime] = useState(initial?.start_time ?? "09:00:00");
  const [endTime, setEndTime] = useState(initial?.end_time ?? "17:00:00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border-2 border-[var(--color-primary-gold)] bg-[var(--color-surface)] p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-[var(--color-navy)]">Day of Week</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-gold)]"
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[var(--color-navy)]">Start Time</label>
            <input
              type="time"
              value={startTime.slice(0, 5)}
              onChange={(e) => setStartTime(e.target.value + ":00")}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-gold)]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--color-navy)]">End Time</label>
            <input
              type="time"
              value={endTime.slice(0, 5)}
              onChange={(e) => setEndTime(e.target.value + ":00")}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-gold)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Blackout Form Component
function BlackoutForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: BlackoutPeriodRow;
  onSave: (data: Partial<BlackoutPeriodRow>) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [startDate, setStartDate] = useState(initial?.start_time.split("T")[0] ?? "");
  const [endDate, setEndDate] = useState(initial?.end_time.split("T")[0] ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id,
      reason: reason || null,
      start_time: startDate + "T00:00:00",
      end_time: endDate + "T23:59:59",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border-2 border-[var(--color-primary-gold)] bg-[var(--color-surface)] p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-[var(--color-navy)]">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vacation, Holiday, etc."
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-gold)]"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[var(--color-navy)]">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-gold)]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--color-navy)]">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-gold)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
