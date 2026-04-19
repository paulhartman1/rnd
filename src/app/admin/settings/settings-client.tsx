"use client";

import { useState } from "react";
import Link from "next/link";

type Source = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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

type AppointmentType = {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Question = {
  id: string;
  question_type: string;
  question_text: string;
  field_name: string | null;
  helper_text: string | null;
  placeholder: string | null;
  options: string[] | null;
  display_order: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialSources: Source[];
  initialPhoneSettings: PhoneSettings;
  initialPhoneAvailability: PhoneAvailability[];
  initialAppointmentTypes: AppointmentType[];
  initialQuestions: Question[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SettingsClient({
  initialSources,
  initialPhoneSettings,
  initialPhoneAvailability,
  initialAppointmentTypes,
  initialQuestions,
}: Props) {
  const [activeTab, setActiveTab] = useState<"sources" | "phone" | "appointments" | "questions">("sources");
  
  // Lead Sources state
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceActive, setSourceActive] = useState(true);

  // Phone Settings state
  const [phoneSettings] = useState(initialPhoneSettings);
  const [phoneAvailability] = useState(initialPhoneAvailability);
  
  // Appointment Types state
  const [appointmentTypes] = useState(initialAppointmentTypes);
  
  // Questions state
  const [questions] = useState(initialQuestions);

  // Lead Sources functions
  const handleAddSource = async () => {
    if (!sourceName.trim()) {
      alert("Source name is required");
      return;
    }

    try {
      const response = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceName,
          description: sourceDescription,
          is_active: sourceActive,
        }),
      });

      if (response.ok) {
        const newSource = await response.json();
        setSources([...sources, newSource].sort((a, b) => a.name.localeCompare(b.name)));
        setSourceName("");
        setSourceDescription("");
        setSourceActive(true);
        setIsAddingSource(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create source");
      }
    } catch (error) {
      alert("Error creating source");
    }
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    setSourceName(source.name);
    setSourceDescription(source.description || "");
    setSourceActive(source.is_active);
  };

  const handleUpdateSource = async () => {
    if (!editingSource || !sourceName.trim()) {
      alert("Source name is required");
      return;
    }

    try {
      const response = await fetch(`/api/admin/sources/${editingSource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceName,
          description: sourceDescription,
          is_active: sourceActive,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setSources(sources.map((s) => (s.id === editingSource.id ? updated : s)));
        setEditingSource(null);
        setSourceName("");
        setSourceDescription("");
        setSourceActive(true);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update source");
      }
    } catch (error) {
      alert("Error updating source");
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm("Delete this lead source? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/admin/sources/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSources(sources.filter((s) => s.id !== id));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete source");
      }
    } catch (error) {
      alert("Error deleting source");
    }
  };

  const cancelEdit = () => {
    setEditingSource(null);
    setIsAddingSource(false);
    setSourceName("");
    setSourceDescription("");
    setSourceActive(true);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/10">
        <button
          onClick={() => setActiveTab("sources")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "sources"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Lead Sources
        </button>
        <button
          onClick={() => setActiveTab("phone")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "phone"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Phone Settings
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "appointments"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Appointment Settings
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 text-sm font-bold transition ${
            activeTab === "questions"
              ? "border-b-2 border-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Questions
        </button>
      </div>

      {/* Lead Sources Tab */}
      {activeTab === "sources" && (
        <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-navy)]">Lead Sources</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Manage where your leads come from
              </p>
            </div>
            <button
              onClick={() => setIsAddingSource(true)}
              disabled={isAddingSource || editingSource !== null}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:opacity-50"
            >
              + Add Source
            </button>
          </div>

          <div className="space-y-3">
            {/* Add Source Form */}
            {isAddingSource && (
              <div className="rounded-lg border-2 border-[var(--color-primary-gold)] bg-amber-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-[var(--color-navy)]">New Lead Source</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-muted)]">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="e.g., Facebook Ads, Referral, etc."
                      className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-muted)]">
                      Description
                    </label>
                    <textarea
                      value={sourceDescription}
                      onChange={(e) => setSourceDescription(e.target.value)}
                      placeholder="Optional description"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sourceActive}
                        onChange={(e) => setSourceActive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-semibold text-[var(--color-navy)]">Active</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSource}
                      className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sources List */}
            {sources.length === 0 && !isAddingSource && (
              <p className="text-sm text-[var(--color-muted)]">No lead sources configured.</p>
            )}

            {sources.map((source) => (
              <div key={source.id}>
                {editingSource?.id === source.id ? (
                  <div className="rounded-lg border-2 border-[var(--color-primary-gold)] bg-amber-50 p-4">
                    <h3 className="mb-3 text-sm font-bold text-[var(--color-navy)]">Edit Source</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-muted)]">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={sourceName}
                          onChange={(e) => setSourceName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-muted)]">
                          Description
                        </label>
                        <textarea
                          value={sourceDescription}
                          onChange={(e) => setSourceDescription(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sourceActive}
                            onChange={(e) => setSourceActive(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm font-semibold text-[var(--color-navy)]">
                            Active
                          </span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateSource}
                          className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between rounded-lg border border-black/6 bg-white p-4 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--color-navy)]">{source.name}</h3>
                        {!source.is_active && (
                          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      {source.description && (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{source.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSource(source)}
                        disabled={isAddingSource || editingSource !== null}
                        className="text-xs font-bold text-[var(--color-primary-gold)] transition hover:underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        disabled={isAddingSource || editingSource !== null}
                        className="text-xs font-bold text-red-600 transition hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phone Settings Tab */}
      {activeTab === "phone" && (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[var(--color-navy)]">Phone Settings Overview</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Manage call forwarding and voicemail settings
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-black/6 bg-gray-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-navy)]">Forwarding Status</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {phoneSettings?.is_forwarding_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className={`h-3 w-3 rounded-full ${phoneSettings?.is_forwarding_enabled ? "bg-green-500" : "bg-gray-400"}`} />
              </div>
              
              {phoneSettings?.forward_to_number && (
                <div className="rounded-lg border border-black/6 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-[var(--color-navy)]">Forward To</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{phoneSettings.forward_to_number}</p>
                </div>
              )}

              <div className="rounded-lg border border-black/6 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-[var(--color-navy)]">Availability Windows</p>
                <div className="mt-2 space-y-1">
                  {phoneAvailability.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted)]">No availability windows set</p>
                  ) : (
                    phoneAvailability.map((window) => (
                      <div key={window.id} className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-[var(--color-navy)]">
                          {DAY_NAMES[window.day_of_week]}:
                        </span>
                        <span className="text-[var(--color-muted)]">
                          {formatTime(window.start_time)} - {formatTime(window.end_time)}
                        </span>
                        {!window.is_active && (
                          <span className="rounded bg-gray-300 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/admin/phone-settings"
                className="inline-block rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
              >
                Manage Phone Settings →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Settings Tab */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[var(--color-navy)]">Appointment Settings Overview</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Configure appointment types, availability, and blackout dates
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-black/6 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-[var(--color-navy)]">Appointment Types</p>
                <div className="mt-2 space-y-1">
                  {appointmentTypes.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted)]">No appointment types configured</p>
                  ) : (
                    appointmentTypes.map((type) => (
                      <div key={type.id} className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-[var(--color-navy)]">{type.name}</span>
                        <span className="text-[var(--color-muted)]">
                          ({type.default_duration_minutes} min)
                        </span>
                        {!type.is_active && (
                          <span className="rounded bg-gray-300 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/admin/appointments/settings"
                className="inline-block rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
              >
                Manage Appointment Settings →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[var(--color-navy)]">Questions Overview</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Manage intake form questions for lead capture
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-black/6 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-[var(--color-navy)]">Active Questions</p>
                <div className="mt-2 space-y-1">
                  {questions.filter(q => q.is_active).length === 0 ? (
                    <p className="text-xs text-[var(--color-muted)]">No active questions</p>
                  ) : (
                    questions.filter(q => q.is_active).map((question) => (
                      <div key={question.id} className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-[var(--color-navy)]">
                          {question.display_order}.
                        </span>
                        <span className="text-[var(--color-muted)]">
                          {question.question_text}
                        </span>
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                          {question.question_type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-black/6 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-navy)]">Total Questions</p>
                  <span className="text-lg font-black text-[var(--color-navy)]">{questions.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/admin/questions"
                className="inline-block rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
              >
                Manage Questions →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
