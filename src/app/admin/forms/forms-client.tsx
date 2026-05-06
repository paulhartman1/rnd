"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { FormRow, FormStatus } from "@/lib/forms";
import { getFormTypeName, getFormStatusName } from "@/lib/forms";
import type { LeadRow } from "@/lib/leads";

type Props = {
  initialForms: FormRow[];
  leads: Pick<LeadRow, "id" | "full_name" | "email">[];
};

export default function FormsClient({ initialForms, leads }: Props) {
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);

  // Create a map of lead IDs to names for quick lookup
  const leadMap = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((lead) => {
      map.set(lead.id, lead.full_name || lead.email || "Unknown");
    });
    return map;
  }, [leads]);

  const filteredForms = useMemo(() => {
    let filtered = forms;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((form) => form.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((form) => {
        const leadName = leadMap.get(form.lead_id)?.toLowerCase() || "";
        const formType = getFormTypeName(form.form_type).toLowerCase();
        return leadName.includes(query) || formType.includes(query);
      });
    }

    return filtered;
  }, [forms, statusFilter, searchQuery, leadMap]);

  const handleDelete = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form? This cannot be undone.")) {
      return;
    }

    setDeletingFormId(formId);
    try {
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setForms(forms.filter((f) => f.id !== formId));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete form");
      }
    } catch (error) {
      alert("Error deleting form");
    } finally {
      setDeletingFormId(null);
    }
  };

  const getStatusBadgeColor = (status: FormStatus): string => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "pending_signature":
        return "bg-yellow-100 text-yellow-700";
      case "signed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lead name or form type..."
              className="w-full rounded-lg border border-black/10 px-4 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FormStatus | "all")}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_signature">Pending Signature</option>
              <option value="signed">Signed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        {filteredForms.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              {searchQuery || statusFilter !== "all"
                ? "No forms match your filters"
                : "No forms yet. Forms will appear here when leads convert to sales."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/6">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Form Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-black/2">
                    <td className="px-6 py-4 text-sm font-medium text-[var(--color-navy)]">
                      {getFormTypeName(form.form_type)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-ink)]">
                      {leadMap.get(form.lead_id) || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeColor(
                          form.status
                        )}`}
                      >
                        {getFormStatusName(form.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-muted)]">
                      {new Date(form.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/forms/${form.id}`}
                          className="text-[var(--color-primary-gold)] hover:underline"
                        >
                          View
                        </Link>
                        {form.status === "draft" && (
                          <button
                            onClick={() => handleDelete(form.id)}
                            disabled={deletingFormId === form.id}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingFormId === form.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
