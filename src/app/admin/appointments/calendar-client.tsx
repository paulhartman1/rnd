"use client";

import { useEffect, useMemo, useState } from "react";
import {
  appointmentStatuses,
  type AppointmentWithLead,
  type AppointmentStatus,
} from "@/lib/appointments";
import type { LeadRow } from "@/lib/leads";
import type { AppointmentRequestWithType } from "@/lib/appointment-types";

type Props = {
  initialAppointments: AppointmentWithLead[];
  allLeads: LeadRow[];
  initialRequests: AppointmentRequestWithType[];
};
type AppointmentStatusFilter = AppointmentStatus | "all";
type AppointmentTimeFilter = "all" | "upcoming" | "past";
type AppointmentSortOption =
  | "start-asc"
  | "start-desc"
  | "title-asc"
  | "title-desc"
  | "status-asc"
  | "status-desc";

type AppointmentDraft = {
  id?: string;
  leadId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  location: string;
  isSaving: boolean;
  error: string | null;
};

function formatDateTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Denver",
  });
}

function formatDateForInput(isoString: string) {
  return isoString.slice(0, 16);
}

function getDefaultEndTime(startTime: string) {
  const start = new Date(startTime);
  start.setHours(start.getHours() + 1);
  return start.toISOString().slice(0, 16);
}

export default function CalendarClient({ initialAppointments, allLeads, initialRequests }: Props) {
  const [appointments, setAppointments] = useState<AppointmentWithLead[]>(initialAppointments);
  const [requests, setRequests] = useState<AppointmentRequestWithType[]>(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => new Date().getTime());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<AppointmentTimeFilter>("all");
  const [sortOption, setSortOption] = useState<AppointmentSortOption>("start-asc");
  const [draft, setDraft] = useState<AppointmentDraft>({
    leadId: "",
    title: "",
    description: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: getDefaultEndTime(new Date().toISOString()),
    status: "scheduled",
    location: "",
    isSaving: false,
    error: null,
  });
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimeMs(new Date().getTime());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredAndSortedAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = currentTimeMs;

    return [...appointments]
      .filter((apt) => {
        const appointmentTime = new Date(apt.start_time).getTime();
        const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
        const matchesTime =
          timeFilter === "all" ||
          (timeFilter === "upcoming" ? appointmentTime >= now : appointmentTime < now);
        const searchText = [
          apt.title,
          apt.description ?? "",
          apt.location ?? "",
          apt.status,
          apt.lead?.full_name ?? "",
          apt.lead?.email ?? "",
          apt.lead?.phone ?? "",
          apt.lead?.street_address ?? "",
        ]
          .join(" ")
          .toLowerCase();
        const matchesSearch = query.length === 0 || searchText.includes(query);

        return matchesStatus && matchesTime && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOption === "start-asc") {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        }
        if (sortOption === "start-desc") {
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        }
        if (sortOption === "title-asc") {
          return a.title.localeCompare(b.title);
        }
        if (sortOption === "title-desc") {
          return b.title.localeCompare(a.title);
        }
        if (sortOption === "status-asc") {
          return a.status.localeCompare(b.status);
        }
        return b.status.localeCompare(a.status);
      });
  }, [appointments, currentTimeMs, searchQuery, sortOption, statusFilter, timeFilter]);

  const upcomingAppointments = useMemo(() => {
    return filteredAndSortedAppointments.filter(
      (apt) => new Date(apt.start_time).getTime() >= currentTimeMs,
    );
  }, [currentTimeMs, filteredAndSortedAppointments]);

  const pastAppointments = useMemo(() => {
    return filteredAndSortedAppointments.filter(
      (apt) => new Date(apt.start_time).getTime() < currentTimeMs,
    );
  }, [currentTimeMs, filteredAndSortedAppointments]);
  const showUpcomingSection = timeFilter !== "past";
  const showPastSection = timeFilter !== "upcoming";
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    timeFilter !== "all" ||
    sortOption !== "start-asc";

  const openNewForm = () => {
    setEditingId(null);
    setDraft({
      leadId: "",
      title: "",
      description: "",
      startTime: new Date().toISOString().slice(0, 16),
      endTime: getDefaultEndTime(new Date().toISOString()),
      status: "scheduled",
      location: "",
      isSaving: false,
      error: null,
    });
    setShowForm(true);
  };

  const openEditForm = (appointment: AppointmentWithLead) => {
    setEditingId(appointment.id);
    setDraft({
      id: appointment.id,
      leadId: appointment.lead_id || "",
      title: appointment.title,
      description: appointment.description || "",
      startTime: formatDateForInput(appointment.start_time),
      endTime: formatDateForInput(appointment.end_time),
      status: appointment.status,
      location: appointment.location || "",
      isSaving: false,
      error: null,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };
  const resetControls = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTimeFilter("all");
    setSortOption("start-asc");
  };

  const saveAppointment = async () => {
    setDraft((prev) => ({ ...prev, isSaving: true, error: null }));

    const url = editingId
      ? `/api/admin/appointments/${editingId}`
      : "/api/admin/appointments";
    const method = editingId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: draft.leadId || null,
        title: draft.title,
        description: draft.description,
        startTime: draft.startTime,
        endTime: draft.endTime,
        status: draft.status,
        location: draft.location,
      }),
    });

    if (!response.ok) {
      setDraft((prev) => ({
        ...prev,
        isSaving: false,
        error: "Failed to save appointment",
      }));
      return;
    }

    // Refresh appointments
    const refreshResponse = await fetch("/api/admin/appointments");
    if (refreshResponse.ok) {
      const { appointments: refreshedAppointments } = await refreshResponse.json();
      setAppointments(refreshedAppointments);
    }

    setDraft((prev) => ({ ...prev, isSaving: false }));
    closeForm();
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Delete this appointment?")) return;

    const response = await fetch(`/api/admin/appointments/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setAppointments((prev) => prev.filter((apt) => apt.id !== id));
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    const response = await fetch(`/api/admin/appointment-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (response.ok) {
      // Refresh both requests and appointments
      const [requestsRes, appointmentsRes] = await Promise.all([
        fetch("/api/admin/appointment-requests"),
        fetch("/api/admin/appointments"),
      ]);

      if (requestsRes.ok) {
        const { appointmentRequests } = await requestsRes.json();
        setRequests(appointmentRequests);
      }

      if (appointmentsRes.ok) {
        const { appointments: refreshedAppointments } = await appointmentsRes.json();
        setAppointments(refreshedAppointments);
      }
    } else {
      alert("Failed to " + action + " request");
    }
  };

  const pendingRequests = requests.filter((req) => req.status === "pending");

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-black text-[var(--color-navy)]">
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-orange-200 bg-orange-50 p-4 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--color-navy)]">
                        {request.appointment_type?.name || "Appointment"}
                      </h3>
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                        PENDING
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-navy)]">
                      <strong>Contact:</strong> {request.full_name} • {request.phone} • {request.email}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-navy)]">
                      <strong>Property:</strong> {request.street_address}, {request.city}, {request.state}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-navy)]">
                      <strong>Requested:</strong> {formatDateTime(request.requested_start_time)}
                    </p>
                    {request.notes && (
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestAction(request.id, "approve")}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequestAction(request.id, "reject")}
                      className="rounded-lg border border-red-600 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black text-[var(--color-navy)]">
          Scheduled Appointments
        </h2>
        <button
          type="button"
          onClick={openNewForm}
          className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
        >
          Schedule Appointment
        </button>
      </div>
      <div className="space-y-3 rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, lead, status, or location"
              className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AppointmentStatusFilter)
              }
              className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
            >
              <option value="all">All statuses</option>
              {appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Time
            </span>
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value as AppointmentTimeFilter)}
              className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
            >
              <option value="all">All appointments</option>
              <option value="upcoming">Upcoming only</option>
              <option value="past">Past only</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Sort by
            </span>
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as AppointmentSortOption)
              }
              className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
            >
              <option value="start-asc">Start time (earliest)</option>
              <option value="start-desc">Start time (latest)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="status-asc">Status (A-Z)</option>
              <option value="status-desc">Status (Z-A)</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            Showing {filteredAndSortedAppointments.length} matching appointment
            {filteredAndSortedAppointments.length === 1 ? "" : "s"}.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetControls}
              className="rounded-lg border border-black/12 px-3 py-1 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              {editingId ? "Edit Appointment" : "Schedule Appointment"}
            </h3>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Lead (optional)
                </span>
                <select
                  value={draft.leadId}
                  onChange={(e) => setDraft({ ...draft, leadId: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                >
                  <option value="">-- No lead --</option>
                  {allLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.full_name} - {lead.street_address}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Title
                </span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Property visit, Follow-up call, etc."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Description
                </span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Additional notes..."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Start Time
                  </span>
                  <input
                    type="datetime-local"
                    value={draft.startTime}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        startTime: e.target.value,
                        endTime: getDefaultEndTime(e.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    End Time
                  </span>
                  <input
                    type="datetime-local"
                    value={draft.endTime}
                    onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Location
                </span>
                <input
                  type="text"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Property address, office, phone, etc."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Status
                </span>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as AppointmentStatus })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                >
                  {appointmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              {draft.error && <p className="text-sm text-red-700">{draft.error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveAppointment}
                  disabled={draft.isSaving || !draft.title}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {draft.isSaving
                    ? "Saving..."
                    : editingId
                      ? "Save"
                      : "Schedule Appointment"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={draft.isSaving}
                  className="flex-1 rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpcomingSection ? (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--color-navy)]">
            Upcoming ({upcomingAppointments.length})
          </h3>
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <article
                  key={apt.id}
                  className="rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-[var(--color-navy)]">
                        {apt.title}
                      </h4>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {formatDateTime(apt.start_time)} → {formatDateTime(apt.end_time)}
                      </p>
                      {apt.lead && (
                        <p className="mt-1 text-sm text-[var(--color-navy)]">
                          <strong>Lead:</strong> {apt.lead.full_name} ({apt.lead.phone})
                        </p>
                      )}
                      {apt.location && (
                        <p className="mt-1 text-sm text-[var(--color-navy)]">
                          <strong>Location:</strong> {apt.location}
                        </p>
                      )}
                      {apt.description && (
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          {apt.description}
                        </p>
                      )}
                      <p className="mt-2 inline-block rounded-md bg-[var(--color-accent)]/10 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        {apt.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(apt)}
                        className="rounded-lg border border-black/12 px-3 py-1 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAppointment(apt.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-sm font-bold text-red-700 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
      {showPastSection ? (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--color-navy)]">
            Past ({pastAppointments.length})
          </h3>
          {pastAppointments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No past appointments.</p>
          ) : (
            <div className="space-y-3">
              {pastAppointments.slice(0, 10).map((apt) => (
                <article
                  key={apt.id}
                  className="rounded-[1.4rem] border border-black/6 bg-white p-4 opacity-60 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-[var(--color-navy)]">
                        {apt.title}
                      </h4>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {formatDateTime(apt.start_time)}
                      </p>
                      {apt.lead && (
                        <p className="mt-1 text-sm text-[var(--color-navy)]">
                          <strong>Lead:</strong> {apt.lead.full_name}
                        </p>
                      )}
                      <p className="mt-2 inline-block rounded-md bg-[var(--color-accent)]/10 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        {apt.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAppointment(apt.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-bold text-red-700 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
