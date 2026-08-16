"use client";

import { useMemo, useState } from "react";

type Props = {
  onClose: () => void;
};

export default function QRCodeModal({ onClose }: Props) {
  const [qrUuid, setQrUuid] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const defaultUuid = useMemo(() => crypto.randomUUID(), []);

  const handleGenerate = async () => {
    setError(null);
    setQrUrl(null);
    setIsGenerating(true);

    try {
      const uuid = qrUuid ?? defaultUuid;
      setQrUuid(uuid);
      const dest = destination || "https://www.rushndush.com";

      const response = await fetch("/api/admin/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, uuid }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to generate QR code");
        return;
      }

      setQrUrl(data.url);
    } catch (e) {
      console.error("QR generation error:", e);
      setError("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!qrUrl) return;

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rushndush-qr-code.svg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download error:", e);
      setError("Failed to download QR code");
    }
  };

  const defaultDestination = "https://www.rushndush.com";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination URL
            </label>
            <input
              type="url"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={defaultDestination}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <p className="text-xs text-gray-500">
            The QR id will be appended to your URL for tracking
          </p>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {qrUrl && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR code"
                className="w-48 h-48 rounded border bg-white"
              />
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full"
              >
                Download SVG
              </button>
            </div>
          )}

          {!qrUrl && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate QR Code"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}