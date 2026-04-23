"use client";

import { useState } from "react";
import type { FeatureFlag } from "@/lib/feature-flags";

interface FeatureFlagsClientProps {
  initialFlags: FeatureFlag[];
}

export default function FeatureFlagsClient({ initialFlags }: FeatureFlagsClientProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUsers, setEditingUsers] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");

  const handleToggle = async (flag: FeatureFlag) => {
    setUpdating(flag.id);

    try {
      const response = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: flag.id,
          is_enabled: !flag.is_enabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update feature flag");
      }

      const { flag: updatedFlag } = await response.json();

      // Update local state
      setFlags((prev) =>
        prev.map((f) => (f.id === updatedFlag.id ? updatedFlag : f))
      );
    } catch (error) {
      console.error("Error toggling feature flag:", error);
      alert(error instanceof Error ? error.message : "Failed to update feature flag");
    } finally {
      setUpdating(null);
    }
  };

  const handleAddUser = async (flagId: string) => {
    if (!newUserEmail.trim()) return;

    const flag = flags.find(f => f.id === flagId);
    if (!flag) return;

    const currentUsers = flag.allowed_users || [];
    if (currentUsers.includes(newUserEmail.trim().toLowerCase())) {
      alert("User already has access to this feature");
      return;
    }

    setUpdating(flagId);

    try {
      const response = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: flagId,
          allowed_users: [...currentUsers, newUserEmail.trim().toLowerCase()],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add user");
      }

      const { flag: updatedFlag } = await response.json();
      setFlags((prev) => prev.map((f) => (f.id === updatedFlag.id ? updatedFlag : f)));
      setNewUserEmail("");
    } catch (error) {
      console.error("Error adding user:", error);
      alert(error instanceof Error ? error.message : "Failed to add user");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveUser = async (flagId: string, emailToRemove: string) => {
    const flag = flags.find(f => f.id === flagId);
    if (!flag) return;

    setUpdating(flagId);

    try {
      const updatedUsers = (flag.allowed_users || []).filter(email => email !== emailToRemove);
      
      const response = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: flagId,
          allowed_users: updatedUsers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove user");
      }

      const { flag: updatedFlag } = await response.json();
      setFlags((prev) => prev.map((f) => (f.id === updatedFlag.id ? updatedFlag : f)));
    } catch (error) {
      console.error("Error removing user:", error);
      alert(error instanceof Error ? error.message : "Failed to remove user");
    } finally {
      setUpdating(null);
    }
  };

  if (flags.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 text-center">
        <p className="text-sm text-[var(--color-muted)]">No feature flags configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flags.map((flag) => (
        <div
          key={flag.id}
          className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[var(--color-navy)]">
                  {flag.flag_name}
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    flag.is_enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {flag.is_enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>

              {flag.description && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {flag.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                <span className="font-mono rounded bg-gray-100 px-2 py-1">
                  {flag.flag_key}
                </span>
                {flag.allowed_users && flag.allowed_users.length > 0 && (
                  <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
                    👤 {flag.allowed_users.length} user{flag.allowed_users.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {flag.allowed_users && flag.allowed_users.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">
                    Allowed users:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {flag.allowed_users.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700"
                      >
                        {email}
                        <button
                          onClick={() => handleRemoveUser(flag.id, email)}
                          disabled={updating === flag.id}
                          className="ml-1 text-blue-900 hover:text-red-600 disabled:opacity-50"
                          title="Remove user"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {editingUsers === flag.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddUser(flag.id);
                      }
                    }}
                    className="flex-1 rounded border border-gray-300 px-3 py-1 text-sm"
                    disabled={updating === flag.id}
                  />
                  <button
                    onClick={() => handleAddUser(flag.id)}
                    disabled={updating === flag.id || !newUserEmail.trim()}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setEditingUsers(null);
                      setNewUserEmail("");
                    }}
                    className="rounded bg-gray-300 px-3 py-1 text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {editingUsers !== flag.id && (
                <button
                  onClick={() => setEditingUsers(flag.id)}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800"
                >
                  + Add User
                </button>
              )}
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => handleToggle(flag)}
              disabled={updating === flag.id}
              className={`relative h-8 w-14 rounded-full transition-all ${
                flag.is_enabled ? "bg-green-500" : "bg-gray-300"
              } ${updating === flag.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              aria-label={`Toggle ${flag.flag_name}`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all ${
                  flag.is_enabled ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
