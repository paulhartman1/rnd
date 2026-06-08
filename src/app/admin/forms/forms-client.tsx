"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormRow, FormStatus } from "@/lib/forms";
import { getFormTypeName, getFormStatusName } from "@/lib/forms";
import type { LeadRow } from "@/lib/leads";

type Props = {
  initialForms: FormRow[];
  leads: Pick<LeadRow, "id" | "full_name" | "email">[];
  initialLeadId?: string;
};

export default function FormsClient({ initialForms, leads, initialLeadId }: Props) {
  const router = useRouter();
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    leadId: initialLeadId || "",
    earnestMoney: "",
    purchasePrice: "",
    isCreating: false,
    error: null as string | null,
  });

  // Auto-open modal if leadId is in URL
  useEffect(() => {
    if (initialLeadId) {
      setShowCreateModal(true);
      setCreateDraft((prev) => ({ ...prev, leadId: initialLeadId }));
    }
  }, [initialLeadId]);

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

  const closeCreateModal = () => {
    setShowCreateModal(false);
    // Remove leadId from URL if present
    if (initialLeadId) {
      router.push('/admin/forms');
    }
  };

  const handleCreateForm = async () => {
    if (!createDraft.leadId) {
      setCreateDraft((prev) => ({ ...prev, error: "Please select a lead" }));
      return;
    }

    if (!createDraft.purchasePrice) {
      setCreateDraft((prev) => ({ ...prev, error: "Purchase price is required" }));
      return;
    }

    setCreateDraft((prev) => ({ ...prev, isCreating: true, error: null }));

    try {
      // Get the selected lead
      const selectedLead = leads.find((l) => l.id === createDraft.leadId);
      const sellerName = selectedLead?.full_name || "";

      // Fetch property data for this lead
      const propertiesResponse = await fetch(`/api/admin/properties?leadId=${createDraft.leadId}`);
      let propertyAddress = "";
      let propertyApn = "";
      let propertyId = null;

      if (propertiesResponse.ok) {
        const properties = await propertiesResponse.json();
        // Use the first property if available
        if (properties.length > 0) {
          const property = properties[0];
          propertyId = property.id;
          propertyAddress = `${property.street_address}, ${property.city}, ${property.state} ${property.postal_code}`;
          propertyApn = property.apn || "";
        }
      }

      const response = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: createDraft.leadId,
          property_id: propertyId,
          form_type: "purchase_agreement",
          form_data: {
            seller_name: sellerName,
            property_address: propertyAddress,
            property_apn: propertyApn,
            earnest_money: createDraft.earnestMoney || null,
            purchase_price: createDraft.purchasePrice,
            buyer_name: "RUSHANDDUSHLOGISTICS, LLC",
            created_date: new Date().toISOString(),
          },
          status: "draft",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setCreateDraft((prev) => ({
          ...prev,
          isCreating: false,
          error: data.error || "Failed to create form",
        }));
        return;
      }

      const form = await response.json();
      setForms((prev) => [form, ...prev]);
      
      // Redirect to the new form detail page
      router.push(`/admin/forms/${form.id}`);
    } catch (error) {
      setCreateDraft((prev) => ({
        ...prev,
        isCreating: false,
        error: "Error creating form",
      }));
    }
  };

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
      {/* Filters, Search, and Create Button */}
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
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 whitespace-nowrap"
            >
              + New Form
            </button>
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

      {/* Create Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              Create Purchase Agreement
            </h3>

            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Create a new purchase agreement form. You can edit all details after creation.
            </p>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Select Lead (Seller)
                </span>
                <select
                  value={createDraft.leadId}
                  onChange={(e) =>
                    setCreateDraft({ ...createDraft, leadId: e.target.value, error: null })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                >
                  <option value="">Select a lead...</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.full_name || lead.email || "Unknown"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Purchase Price *
                </span>
                <input
                  type="text"
                  value={createDraft.purchasePrice}
                  onChange={(e) =>
                    setCreateDraft({ ...createDraft, purchasePrice: e.target.value, error: null })
                  }
                  placeholder="$100,000"
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Earnest Money (Optional)
                </span>
                <input
                  type="text"
                  value={createDraft.earnestMoney}
                  onChange={(e) =>
                    setCreateDraft({ ...createDraft, earnestMoney: e.target.value })
                  }
                  placeholder="$5,000"
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                <p className="font-semibold mb-1">Note:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Buyer name defaults to: RUSHANDDUSHLOGISTICS, LLC</li>
                  <li>Date will be set to today's date</li>
                  <li>You can edit all fields after creation</li>
                </ul>
              </div>

              {createDraft.error && (
                <p className="text-sm text-red-700">{createDraft.error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCreateForm}
                  disabled={createDraft.isCreating}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {createDraft.isCreating ? "Creating..." : "Create Form"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createDraft.isCreating}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
