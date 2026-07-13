"use client";

import { useState } from "react";
import Link from "next/link";

type MatchedLead = {
  id: string;
  name: string;
  status: string;
} | null;

export default function DialClient() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [matchedLead, setMatchedLead] = useState<MatchedLead>(null);

  const handleKeyPress = (key: string) => {
    if (phoneNumber.length < 20) {
      setPhoneNumber((prev) => prev + key);
      setError(null);
      setSuccess(false);
      setMatchedLead(null);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
    setError(null);
    setSuccess(false);
    setMatchedLead(null);
  };

  const handleClear = () => {
    setPhoneNumber("");
    setError(null);
    setSuccess(false);
    setMatchedLead(null);
  };

  const handleDial = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setIsCalling(true);
    setError(null);
    setSuccess(false);
    setMatchedLead(null);

    try {
      const response = await fetch("/api/admin/dial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to place call");
        return;
      }

      setSuccess(true);
      setMatchedLead(data.matchedLead);
      
      // Clear the number after 3 seconds on success
      setTimeout(() => {
        setPhoneNumber("");
        setSuccess(false);
        setMatchedLead(null);
      }, 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsCalling(false);
    }
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-surface-soft)] to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/admin/leads"
            className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            ← Back to Leads
          </Link>
        </div>

        <div className="rounded-2xl border border-black/6 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <h1 className="mb-6 text-center text-2xl font-black tracking-tight text-[var(--color-navy)]">
            Quick Dial
          </h1>

          {/* Display */}
          <div className="mb-6 rounded-xl border border-black/10 bg-[var(--color-surface-soft)] p-6">
            <div className="mb-2 min-h-[48px] overflow-x-auto">
              <p className="text-center text-3xl font-bold tracking-wider text-[var(--color-navy)]">
                {phoneNumber || "—"}
              </p>
            </div>
            
            {/* Matched Lead Info */}
            {matchedLead && (
              <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
                <p className="text-center text-sm font-semibold text-blue-900">
                  📋 {matchedLead.name}
                </p>
                <p className="text-center text-xs text-blue-700">
                  Lead • {matchedLead.status}
                </p>
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <p className="mt-3 text-center text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 text-center text-sm font-semibold text-emerald-700">
                ✓ Call initiated via Twilio
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            {keys.map((row, rowIndex) =>
              row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  disabled={isCalling}
                  className="flex h-16 items-center justify-center rounded-xl border border-black/10 bg-white text-2xl font-bold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {key}
                </button>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={handleBackspace}
              disabled={isCalling || !phoneNumber}
              className="rounded-lg border border-black/12 px-4 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Delete
            </button>
            <button
              onClick={handleClear}
              disabled={isCalling || !phoneNumber}
              className="rounded-lg border border-black/12 px-4 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Clear
            </button>
          </div>

          {/* Call Button */}
          <button
            onClick={handleDial}
            disabled={isCalling || !phoneNumber}
            className="w-full rounded-lg bg-[var(--color-primary-gold)] px-6 py-4 text-lg font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCalling ? "Calling..." : "📞 Call"}
          </button>

          {/* Helper Text */}
          <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
            Enter a phone number and tap Call to initiate a Twilio call.
            {matchedLead && " This number matches an existing lead."}
          </p>
        </div>
      </div>
    </div>
  );
}
