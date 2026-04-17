"use client";

import { useMemo, useState } from "react";
import { leadStatuses, type LeadRow, type LeadStatus } from "@/lib/leads";
import {
  appointmentStatuses,
  type AppointmentStatus,
} from "@/lib/appointments";
import { createClient } from "@/lib/supabase/client";
import type { LeadAnswer } from "./page";

type LeadDraftState = {
  status: LeadStatus;
  ownerNotes: string;
  isSaving: boolean;
  isCalling: boolean;
  isRemoving: boolean;
  error: string | null;
  callMessage: string | null;
  showContactMenu: boolean;
  showQuestions: boolean;
};

type Props = {
  initialLeads: LeadRow[];
  leadAnswers: Record<string, LeadAnswer[]>;
};

function toLeadDraft(lead: LeadRow): LeadDraftState {
  return {
    status: lead.status,
    ownerNotes: lead.owner_notes ?? "",
    isSaving: false,
    isCalling: false,
    isRemoving: false,
    error: null,
    callMessage: null,
    showContactMenu: false,
    showQuestions: false,
  };
}

export default function LeadsClient({ initialLeads, leadAnswers }: Props) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [drafts, setDrafts] = useState<Record<string, LeadDraftState>>(() => {
    const nextState: Record<string, LeadDraftState> = {};
    initialLeads.forEach((lead) => {
      nextState[lead.id] = toLeadDraft(lead);
    });
    return nextState;
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [hotLeadsOnly, setHotLeadsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "hot">("hot");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [schedulingLeadId, setSchedulingLeadId] = useState<string | null>(null);
  const [appointmentDraft, setAppointmentDraft] = useState({
    title: "",
    description: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: "",
    location: "",
    status: "scheduled" as AppointmentStatus,
    isSaving: false,
    error: null as string | null,
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailingLeadId, setEmailingLeadId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState({
    subject: "",
    message: "",
    isSending: false,
    error: null as string | null,
    success: false,
  });

  const visibleLeads = useMemo(() => {
    let filtered = leads.filter((lead) => showDeleted || !lead.deleted_at);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.full_name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.street_address.toLowerCase().includes(query) ||
          lead.city.toLowerCase().includes(query) ||
          lead.state.toLowerCase().includes(query) ||
          lead.property_type.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    // Apply hot leads filter
    if (hotLeadsOnly) {
      filtered = filtered.filter((lead) => lead.isHotLead === true);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "hot") {
        // Sort by hot leads first, then by newest
        if (a.isHotLead !== b.isHotLead) {
          return (b.isHotLead ? 1 : 0) - (a.isHotLead ? 1 : 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        // name
        return a.full_name.localeCompare(b.full_name);
      }
    });

    return filtered;
  }, [leads, showDeleted, searchQuery, statusFilter, hotLeadsOnly, sortBy]);

  const hasVisibleLeads = visibleLeads.length > 0;

  const updateDraft = (leadId: string, patch: Partial<LeadDraftState>) => {
    setDrafts((previous) => ({
      ...previous,
      [leadId]: {
        ...previous[leadId],
        ...patch,
      },
    }));
  };

  const saveLead = async (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;

    updateDraft(leadId, { isSaving: true, error: null });

    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: draft.status,
        ownerNotes: draft.ownerNotes,
      }),
    });

    if (!response.ok) {
      updateDraft(leadId, {
        isSaving: false,
        error: "Could not save this lead. Please try again.",
      });
      return;
    }

    setLeads((previous) =>
      previous.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: draft.status,
              owner_notes: draft.ownerNotes || null,
              updated_at: new Date().toISOString(),
            }
          : lead,
      ),
    );
    updateDraft(leadId, { isSaving: false, error: null });
  };

  const toggleContactMenu = (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;
    updateDraft(leadId, { showContactMenu: !draft.showContactMenu });
  };

  const callLead = async (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;

    updateDraft(leadId, { isCalling: true, error: null, callMessage: null, showContactMenu: false });

    const response = await fetch(`/api/admin/leads/${leadId}/call`, {
      method: "POST",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      updateDraft(leadId, {
        isCalling: false,
        error: body?.error ?? "Could not place call. Please try again.",
      });
      return;
    }

    updateDraft(leadId, {
      isCalling: false,
      error: null,
      callMessage: "Call initiated in Twilio.",
    });
  };

  const openEmailModal = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setEmailingLeadId(leadId);
    setEmailDraft({
      subject: `Re: ${lead.street_address}`,
      message: `Hi ${lead.full_name.split(' ')[0]},\n\n`,
      isSending: false,
      error: null,
      success: false,
    });
    setShowEmailModal(true);
    updateDraft(leadId, { showContactMenu: false });
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailingLeadId(null);
  };

  const sendEmail = async () => {
    if (!emailingLeadId || !emailDraft.message.trim()) return;

    setEmailDraft((prev) => ({ ...prev, isSending: true, error: null, success: false }));

    const response = await fetch(`/api/admin/leads/${emailingLeadId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: emailDraft.subject,
        message: emailDraft.message,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setEmailDraft((prev) => ({
        ...prev,
        isSending: false,
        error: body?.error ?? "Could not send email. Please try again.",
      }));
      return;
    }

    setEmailDraft((prev) => ({ ...prev, isSending: false, error: null, success: true }));
    
    // Auto-close after 2 seconds on success
    setTimeout(() => {
      closeEmailModal();
    }, 2000);
  };

  const removeLead = async (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;

    const confirmed = window.confirm(
      "Mark this lead as deleted? It will be hidden from the dashboard.",
    );
    if (!confirmed) {
      return;
    }

    updateDraft(leadId, { isRemoving: true, error: null, callMessage: null });
    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      updateDraft(leadId, {
        isRemoving: false,
        error: body?.error ?? "Could not delete this lead. Please try again.",
      });
      return;
    }

    setLeads((previous) => previous.filter((lead) => lead.id !== leadId));
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[leadId];
      return next;
    });
  };

  const signOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/admin/login");
  };

  const getDefaultEndTime = (startTime: string) => {
    const start = new Date(startTime);
    start.setHours(start.getHours() + 1);
    return start.toISOString().slice(0, 16);
  };

  const openAppointmentModal = (leadId: string) => {
    const now = new Date().toISOString().slice(0, 16);
    setSchedulingLeadId(leadId);
    setAppointmentDraft({
      title: "",
      description: "",
      startTime: now,
      endTime: getDefaultEndTime(now),
      location: "",
      status: "scheduled",
      isSaving: false,
      error: null,
    });
    setShowAppointmentModal(true);
    updateDraft(leadId, { showContactMenu: false });
  };

  const closeAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSchedulingLeadId(null);
  };

  const saveAppointment = async () => {
    if (!schedulingLeadId || !appointmentDraft.title) return;

    setAppointmentDraft((prev) => ({ ...prev, isSaving: true, error: null }));

    const response = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: schedulingLeadId,
        title: appointmentDraft.title,
        description: appointmentDraft.description || null,
        startTime: new Date(appointmentDraft.startTime).toISOString(),
        endTime: new Date(appointmentDraft.endTime).toISOString(),
        location: appointmentDraft.location || null,
        status: appointmentDraft.status,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setAppointmentDraft((prev) => ({
        ...prev,
        isSaving: false,
        error: body?.error ?? "Could not create appointment. Please try again.",
      }));
      return;
    }

    setAppointmentDraft((prev) => ({ ...prev, isSaving: false, error: null }));
    closeAppointmentModal();
  };


  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-navy)]">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(event) => setShowDeleted(event.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-[var(--color-primary-gold)] focus:ring-[var(--color-primary-gold)]"
            />
            Show deleted leads
          </label>
          <span className="text-sm text-[var(--color-muted)]">
            {visibleLeads.length} {visibleLeads.length === 1 ? "lead" : "leads"}
          </span>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={isSigningOut}
          className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <div className="rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, phone, address..."
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Filter by Status
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              >
                <option value="all">All statuses</option>
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Sort by
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name" | "hot")}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              >
                <option value="hot">🔥 Hot Leads First</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hotLeadsOnly}
              onChange={(e) => setHotLeadsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-semibold text-[var(--color-navy)]">
              🔥 Show Hot Leads Only
            </span>
          </label>
          <span className="text-xs text-[var(--color-muted)]">
            (Close in ≤30 days + Inherited/Foreclosure)
          </span>
        </div>

        {(searchQuery || statusFilter !== "all" || hotLeadsOnly) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]"
              >
                Search: {searchQuery}
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]"
              >
                Status: {statusFilter}
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            {hotLeadsOnly && (
              <button
                type="button"
                onClick={() => setHotLeadsOnly(false)}
                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
              >
                🔥 Hot Leads Only
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setHotLeadsOnly(false);
              }}
              className="text-xs font-semibold text-[var(--color-muted)] underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {!hasVisibleLeads ? (
        <article className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 text-sm text-[var(--color-muted)] shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          {showDeleted
            ? "No deleted leads found."
            : "No active leads found. Enable “Show deleted leads” to view deleted entries."}
        </article>
      ) : (
        visibleLeads.map((lead) => {
          const draft = drafts[lead.id];
          if (!draft) {
            return null;
          }
          const isDeleted = Boolean(lead.deleted_at);

          return (
            <article
              key={lead.id}
              className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
            >
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3 text-sm text-[var(--color-navy)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black tracking-tight">
                          {lead.full_name}
                        </h2>
                        {lead.isHotLead && (
                          <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white" title="Hot Lead: Close in ≤30 days + Inherited/Foreclosure">
                            🔥 HOT
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {lead.street_address}, {lead.city}, {lead.state} {lead.postal_code}
                      </p>
                    </div>
                    {isDeleted && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">
                        Deleted
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <a 
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1.5 text-[var(--color-primary-gold)] hover:underline"
                    >
                      <span>✉️</span>
                      {lead.email}
                    </a>
                    <a 
                      href={`tel:${lead.phone.replace(/\D/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-[var(--color-primary-gold)] hover:underline"
                    >
                      <span>📞</span>
                      {lead.phone}
                    </a>
                  </div>

                  {/* Display all answered questions */}
                  {leadAnswers[lead.id] && leadAnswers[lead.id].length > 0 && (
                    <div className="rounded-xl border border-black/10 bg-[var(--color-surface-soft)]">
                      <button
                        type="button"
                        onClick={() => updateDraft(lead.id, { showQuestions: !draft.showQuestions })}
                        className="w-full flex items-center justify-between p-4 text-left transition hover:bg-black/5"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                          Answered Questions ({leadAnswers[lead.id].length})
                        </p>
                        <span className="text-xs text-[var(--color-accent)]">
                          {draft.showQuestions ? "▲" : "▼"}
                        </span>
                      </button>
                      {draft.showQuestions && (
                        <div className="space-y-2.5 border-t border-black/10 p-4">
                          {leadAnswers[lead.id].map((answer) => (
                            <div key={answer.id} className="border-l-2 border-[var(--color-primary-gold)] pl-3 py-1">
                              <p className="text-xs font-semibold text-[var(--color-muted)]">
                                {answer.question_text}
                              </p>
                              <p className="mt-0.5 text-sm font-medium text-[var(--color-navy)]">
                                {answer.answer_value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>

                <div className="space-y-3 rounded-xl border border-black/8 bg-[var(--color-surface-soft)] p-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Status
                  </span>
                  <select
                    value={draft.status}
                    disabled={isDeleted}
                    onChange={(event) =>
                      updateDraft(lead.id, { status: event.target.value as LeadStatus })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Owner notes
                  </span>
                  <textarea
                    value={draft.ownerNotes}
                    disabled={isDeleted}
                    onChange={(event) =>
                      updateDraft(lead.id, { ownerNotes: event.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                      }
                    }}
                    rows={5}
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>

                {draft.error ? (
                  <p className="text-sm text-red-700">{draft.error}</p>
                ) : null}
                {draft.callMessage ? (
                  <p className="text-sm text-emerald-700">{draft.callMessage}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => saveLead(lead.id)}
                    disabled={isDeleted || draft.isSaving || draft.isCalling || draft.isRemoving}
                    className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 min-h-[44px]"
                  >
                    {draft.isSaving ? "Saving..." : "Save"}
                  </button>
                  <div className="relative flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => toggleContactMenu(lead.id)}
                      disabled={isDeleted || draft.isSaving || draft.isCalling || draft.isRemoving}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-black/12 px-4 py-2.5 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45 min-h-[44px]"
                    >
                      {draft.isCalling ? "Calling..." : "Contact"}
                      <span className="text-xs">{draft.showContactMenu ? "▲" : "▼"}</span>
                    </button>
                    {draft.showContactMenu && !isDeleted && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => updateDraft(lead.id, { showContactMenu: false })}
                        />
                        <div className="absolute left-0 right-0 sm:left-0 sm:right-auto top-full z-30 mt-1 sm:min-w-[240px] overflow-hidden rounded-lg border border-black/12 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.15)]">
                          <button
                            type="button"
                            onClick={() => callLead(lead.id)}
                            className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px]"
                          >
                            <span className="text-xl sm:text-base">📞</span>
                            <span>Call</span>
                          </button>
                          <button
                            type="button"
                            disabled
                            className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-muted)] cursor-not-allowed opacity-50 flex items-center gap-3 min-h-[52px]"
                            title="SMS unavailable until A2P registration complete"
                          >
                            <span className="text-xl sm:text-base">💬</span>
                            <span>SMS <span className="text-xs">(Coming Soon)</span></span>
                          </button>
                        <button
                          type="button"
                          onClick={() => openEmailModal(lead.id)}
                          className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px]"
                        >
                          <span className="text-xl sm:text-base">✉️</span>
                          <span>Email</span>
                        </button>
                          <button
                            type="button"
                            onClick={() => openAppointmentModal(lead.id)}
                            className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px] border-t border-black/6"
                          >
                            <span className="text-xl sm:text-base">📅</span>
                            <span>Schedule Appointment</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLead(lead.id)}
                    disabled={isDeleted || draft.isRemoving || draft.isSaving || draft.isCalling}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 min-h-[44px]"
                  >
                    {isDeleted ? "Deleted" : draft.isRemoving ? "Deleting..." : "Delete Lead"}
                  </button>
                </div>
              </div>
            </div>
          </article>
          );
        })
      )}

      {showEmailModal && emailingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              Compose Email
            </h3>

            {(() => {
              const lead = leads.find((l) => l.id === emailingLeadId);
              if (!lead) return null;
              return (
                <div className="mb-4 rounded-lg bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-navy)]">
                  <p className="font-bold">{lead.full_name}</p>
                  <p className="text-[var(--color-muted)]">{lead.email}</p>
                </div>
              );
            })()}

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Subject
                </span>
                <input
                  type="text"
                  value={emailDraft.subject}
                  onChange={(e) =>
                    setEmailDraft({ ...emailDraft, subject: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Email subject"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Message
                </span>
                <textarea
                  value={emailDraft.message}
                  onChange={(e) =>
                    setEmailDraft({ ...emailDraft, message: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  rows={12}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Type your message here..."
                />
              </label>

              {emailDraft.error && (
                <p className="text-sm text-red-700">{emailDraft.error}</p>
              )}
              {emailDraft.success && (
                <p className="text-sm text-emerald-700">✓ Email sent successfully!</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={sendEmail}
                  disabled={emailDraft.isSending || !emailDraft.message.trim() || emailDraft.success}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {emailDraft.isSending ? "Sending..." : emailDraft.success ? "Sent!" : "Send Email"}
                </button>
                <button
                  type="button"
                  onClick={closeEmailModal}
                  disabled={emailDraft.isSending}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {emailDraft.success ? "Close" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && schedulingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              Schedule Appointment
            </h3>

            {(() => {
              const lead = leads.find((l) => l.id === schedulingLeadId);
              if (!lead) return null;
              return (
                <div className="mb-4 rounded-lg bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-navy)]">
                  <p className="font-bold">{lead.full_name}</p>
                  <p className="text-[var(--color-muted)]">
                    {lead.street_address}, {lead.city}, {lead.state}
                  </p>
                </div>
              );
            })()}

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Title
                </span>
                <input
                  type="text"
                  value={appointmentDraft.title}
                  onChange={(e) =>
                    setAppointmentDraft({ ...appointmentDraft, title: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Property visit, Follow-up call, etc."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Description
                </span>
                <textarea
                  value={appointmentDraft.description}
                  onChange={(e) =>
                    setAppointmentDraft({ ...appointmentDraft, description: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
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
                    value={appointmentDraft.startTime}
                    onChange={(e) =>
                      setAppointmentDraft({
                        ...appointmentDraft,
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
                    value={appointmentDraft.endTime}
                    onChange={(e) =>
                      setAppointmentDraft({ ...appointmentDraft, endTime: e.target.value })
                    }
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
                  value={appointmentDraft.location}
                  onChange={(e) =>
                    setAppointmentDraft({ ...appointmentDraft, location: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Property address, office, phone, etc."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Status
                </span>
                <select
                  value={appointmentDraft.status}
                  onChange={(e) =>
                    setAppointmentDraft({
                      ...appointmentDraft,
                      status: e.target.value as AppointmentStatus,
                    })
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

              {appointmentDraft.error && (
                <p className="text-sm text-red-700">{appointmentDraft.error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveAppointment}
                  disabled={appointmentDraft.isSaving || !appointmentDraft.title}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {appointmentDraft.isSaving ? "Saving..." : "Create Appointment"}
                </button>
                <button
                  type="button"
                  onClick={closeAppointmentModal}
                  disabled={appointmentDraft.isSaving}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
