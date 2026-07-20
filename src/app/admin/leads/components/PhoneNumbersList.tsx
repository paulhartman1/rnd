"use client";

import { useState } from "react";
import type { LeadPhone } from "@/lib/lead-phones";

type Props = {
  leadId: string;
  phones: LeadPhone[];
  onUpdate: () => void;
  onCall: (phoneId: string, phoneNumber: string) => void;
  isCalling?: boolean;
};

export default function PhoneNumbersList({ leadId, phones, onUpdate, onCall, isCalling }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPhone, setNewPhone] = useState({
    number: "",
    type: "",
    isPrimary: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedPhones = [...phones].sort((a, b) => {
    // Primary first
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }
    // Then by display order
    return a.display_order - b.display_order;
  });

  const handleAdd = async () => {
    if (!newPhone.number.trim()) {
      setError("Phone number is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/phones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: newPhone.number,
          phoneType: newPhone.type || null,
          isPrimary: newPhone.isPrimary,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add phone number");
      }

      setNewPhone({ number: "", type: "", isPrimary: false });
      setIsAdding(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add phone number");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrimary = async (phoneId: string) => {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/phones/${phoneId}/set-primary`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set primary phone");
      }

      onUpdate();
    } catch (err) {
      console.error("Failed to set primary:", err);
    }
  };

  const handleDelete = async (phoneId: string) => {
    if (!confirm("Delete this phone number?")) return;

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/phones/${phoneId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete phone number");
      }

      onUpdate();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const maxPhones = 7;
  const canAddMore = phones.length < maxPhones;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Phone Numbers ({phones.length}/{maxPhones})
        </h4>
        {canAddMore && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-semibold text-[var(--color-primary-gold)] hover:underline"
          >
            + Add Number
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {sortedPhones.map((phone) => (
          <div
            key={phone.id}
            className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCall(phone.id, phone.phone_number)}
                  disabled={isCalling}
                  className="font-medium text-[var(--color-primary-gold)] hover:underline disabled:opacity-50"
                >
                  {phone.phone_number}
                </button>
                {phone.is_primary && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Primary
                  </span>
                )}
              </div>
              {phone.phone_type && (
                <p className="text-xs text-[var(--color-muted)]">{phone.phone_type}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!phone.is_primary && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(phone.id)}
                  className="rounded px-2 py-1 text-xs font-semibold text-[var(--color-muted)] hover:bg-black/5"
                  title="Set as primary"
                >
                  Set Primary
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(phone.id)}
                className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="space-y-2 rounded-lg border border-black/10 bg-[var(--color-surface-soft)] p-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)]">
              Phone Number *
            </label>
            <input
              type="tel"
              value={newPhone.number}
              onChange={(e) => setNewPhone({ ...newPhone, number: e.target.value })}
              placeholder="(555) 123-4567"
              className="mt-1 w-full rounded border border-black/10 px-2 py-1 text-sm outline-none focus:border-[var(--color-primary-gold)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)]">
              Type (optional)
            </label>
            <input
              type="text"
              value={newPhone.type}
              onChange={(e) => setNewPhone({ ...newPhone, type: e.target.value })}
              placeholder="e.g. mobile, home, work"
              className="mt-1 w-full rounded border border-black/10 px-2 py-1 text-sm outline-none focus:border-[var(--color-primary-gold)]"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={newPhone.isPrimary}
              onChange={(e) => setNewPhone({ ...newPhone, isPrimary: e.target.checked })}
              className="rounded"
            />
            <span className="font-semibold text-[var(--color-navy)]">Set as primary</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting}
              className="flex-1 rounded bg-[var(--color-primary-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--color-navy)] hover:brightness-95 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewPhone({ number: "", type: "", isPrimary: false });
                setError(null);
              }}
              disabled={isSubmitting}
              className="rounded border border-black/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-black/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
