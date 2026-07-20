"use client";

import { useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  active: boolean;
};

type Props = {
  sourceId: string;
  sourceName: string;
  initialKeys: ApiKey[];
};

export default function ApiKeysClient({
  sourceId,
  sourceName,
  initialKeys,
}: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      setError("Key name is required");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeneratedKey("");

    try {
      // Generate API key client-side
      const prefix = "rnd";
      const sourceShort = sourceName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      const version = "v1";
      const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(36))
        .join("")
        .substring(0, 32);

      const apiKey = `${prefix}_${sourceShort}_${version}_${randomPart}`;

      // Hash the key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Store via API
      const response = await fetch(`/api/admin/sources/${sourceId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key_hash: keyHash,
          name: keyName.trim(),
        }),
      });

      if (response.ok) {
        const newKeyRecord = await response.json();
        setKeys([newKeyRecord, ...keys]);
        setGeneratedKey(apiKey);
        setKeyName("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate API key");
      }
    } catch (err) {
      console.error("Error generating key:", err);
      setError("An error occurred while generating the key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    try {
      const response = await fetch(
        `/api/admin/sources/${sourceId}/api-keys/${keyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !currentActive }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setKeys(keys.map((k) => (k.id === keyId ? updated : k)));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update key");
      }
    } catch {
      alert("Error updating key");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Delete this API key? This cannot be undone.")) return;

    try {
      const response = await fetch(
        `/api/admin/sources/${sourceId}/api-keys/${keyId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setKeys(keys.filter((k) => k.id !== keyId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete key");
      }
    } catch {
      alert("Error deleting key");
    }
  };

  const resetGenerateForm = () => {
    setGeneratedKey("");
    setKeyName("");
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* Generate New Key Section */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-bold text-[var(--color-navy)]">
          Generate New API Key
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Create a new API key for this lead source
        </p>

        {!generatedKey ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)]">
                Key Name *
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production Integration"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-gold)]"
                disabled={isGenerating}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateKey}
              disabled={isGenerating || !keyName.trim()}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate API Key"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-semibold text-yellow-800">
                  Copy this key now. It will never be shown again.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-100 p-4">
              <code className="break-all text-sm font-mono text-gray-900">
                {generatedKey}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyKey}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
              >
                {copySuccess ? "Copied!" : "Copy to Clipboard"}
              </button>
              <button
                onClick={resetGenerateForm}
                className="flex-1 rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-gray-50"
              >
                Generate Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Keys Section */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-bold text-[var(--color-navy)]">
          Existing API Keys
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage API keys for this lead source
        </p>

        <div className="mt-6 space-y-3">
          {keys.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No API keys generated yet.
            </p>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-start justify-between rounded-lg border border-black/6 bg-white p-4 shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--color-navy)]">
                      {key.name}
                    </h3>
                    {!key.active && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        Inactive
                      </span>
                    )}
                    {key.active && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-[var(--color-muted)]">
                    <p>Created: {new Date(key.created_at).toLocaleString()}</p>
                    {key.last_used_at && (
                      <p>
                        Last used:{" "}
                        {new Date(key.last_used_at).toLocaleString()}
                      </p>
                    )}
                    {!key.last_used_at && <p>Never used</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(key.id, key.active)}
                    className="text-xs font-bold text-[var(--color-primary-gold)] transition hover:underline"
                  >
                    {key.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="text-xs font-bold text-red-600 transition hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
