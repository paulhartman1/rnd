"use client";

import { useMemo, useState } from "react";
import { leadStatuses, type LeadRow, type LeadStatus } from "@/lib/leads";
import { createClient } from "@/lib/supabase/client";

type LeadDraftState = {
  status: LeadStatus;
  ownerNotes: string;
  isSaving: boolean;
  error: string | null;
};

type Props = {
  initialLeads: LeadRow[];
};

function toLeadDraft(lead: LeadRow): LeadDraftState {
  return {
    status: lead.status,
    ownerNotes: lead.owner_notes ?? "",
    isSaving: false,
    error: null,
  };
}

export default function LeadsClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [drafts, setDrafts] = useState<Record<string, LeadDraftState>>(() => {
    const nextState: Record<string, LeadDraftState> = {};
    initialLeads.forEach((lead) => {
      nextState[lead.id] = toLeadDraft(lead);
    });
    return nextState;
  });
  const [isSigningOut, setIsSigningOut] = useState(false);

  const hasLeads = useMemo(() => leads.length > 0, [leads.length]);

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

  const signOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/admin/login");
  };

  if (!hasLeads) {
    return (
      <section className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 text-sm text-[var(--color-muted)] shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        No leads yet.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={signOut}
          disabled={isSigningOut}
          className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      {leads.map((lead) => {
        const draft = drafts[lead.id];
        if (!draft) {
          return null;
        }

        return (
          <article
            key={lead.id}
            className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
          >
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-2 text-sm text-[var(--color-navy)]">
                <h2 className="text-xl font-black tracking-tight">
                  {lead.full_name} — {lead.property_type}
                </h2>
                <p className="text-[var(--color-muted)]">{lead.street_address}</p>
                <p className="text-[var(--color-muted)]">
                  {lead.city}, {lead.state} {lead.postal_code}
                </p>
                <p>
                  <strong>Email:</strong> {lead.email}
                </p>
                <p>
                  <strong>Phone:</strong> {lead.phone}
                </p>
                <p>
                  <strong>Repairs:</strong> {lead.repairs_needed}
                </p>
                <p>
                  <strong>Timeline:</strong> {lead.close_timeline}
                </p>
                <p>
                  <strong>Reason:</strong> {lead.sell_reason}
                </p>
                <p>
                  <strong>Acceptable offer:</strong> {lead.acceptable_offer}
                </p>
                <p>
                  <strong>Listed with agent:</strong>{" "}
                  {lead.listed_with_agent ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Owns land:</strong> {lead.owns_land ? "Yes" : "No"}
                </p>
                <p>
                  <strong>SMS consent:</strong> {lead.sms_consent ? "Yes" : "No"}
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-black/8 bg-[var(--color-surface-soft)] p-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Status
                  </span>
                  <select
                    value={draft.status}
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
                    onChange={(event) =>
                      updateDraft(lead.id, { ownerNotes: event.target.value })
                    }
                    rows={5}
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>

                {draft.error ? (
                  <p className="text-sm text-red-700">{draft.error}</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => saveLead(lead.id)}
                  disabled={draft.isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {draft.isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
