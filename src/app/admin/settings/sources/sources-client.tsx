"use client";

import { useState } from "react";

type Source = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialSources: Source[];
};

export default function SourcesClient({ initialSources }: Props) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceActive, setSourceActive] = useState(true);

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
    } catch {
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
    } catch {
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
    } catch {
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

  return (
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
  );
}
