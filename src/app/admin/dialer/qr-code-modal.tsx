"use client";

import { useMemo, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";

type Props = {
  onClose: () => void;
};

const DEFAULT_DESTINATION = "https://www.rushndush.com";

export default function QRCodeModal({ onClose }: Props) {
  const [destination, setDestination] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generatedUuidRef = useRef<string | null>(null);

  const defaultUuid = useMemo(() => crypto.randomUUID(), []);

  const handleGenerate = async () => {
    setError(null);
    setPreviewUrl(null);
    setIsGenerating(true);

    try {
      const uuid = generatedUuidRef.current ?? defaultUuid;
      generatedUuidRef.current = uuid;

      const dest = destination || DEFAULT_DESTINATION;
      let parsed: URL;
      try {
        parsed = new URL(dest);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Invalid destination URL");
        return;
      }
      parsed.searchParams.set("qr", uuid);

      const logoResponse = await fetch("/logo.png");
      if (!logoResponse.ok) {
        throw new Error("Could not load logo image");
      }
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await blobToDataUrl(logoBlob);

      const qr = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: parsed.toString(),
        image: logoDataUrl,
        margin: 5,
        qrOptions: { errorCorrectionLevel: "H" },
        dotsOptions: { color: "#cb9b2d", type: "rounded" },
        backgroundOptions: { color: "#122c3d" },
        imageOptions: {
          imageSize: 0.3,
          margin: 2,
          hideBackgroundDots: true,
          saveAsBlob: true,
        },
      });

      const raw = await qr.getRawData("svg");
      if (!raw) {
        throw new Error("Failed to render QR code");
      }
      const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);
      setPreviewUrl(URL.createObjectURL(blob));

      const svgText = await blob.text();
      const response = await fetch("/api/admin/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid, destination: parsed.toString(), svg: svgText }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to save QR code");
        return;
      }
    } catch (e) {
      console.error("QR generation error:", e);
      setError("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) return;

    try {
      const response = await fetch(previewUrl);
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
              placeholder={DEFAULT_DESTINATION}
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

          {previewUrl && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="QR code"
                className="w-48 h-48 rounded border"
              />
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full"
              >
                Download SVG
              </button>
            </div>
          )}

          {!previewUrl && (
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

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}