import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { QRCodeStyling } from "qr-code-styling/lib/qr-code-styling.common.js";
import { JSDOM } from "jsdom";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

const DEFAULT_DESTINATION = "https://www.rushndush.com";
const QR_SIZE = 300;
const MARGIN = 5;
const LOGO_SIZE_FACTOR = 0.3;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await isFeatureEnabled("autodialer", user.email);
  if (!hasAccess) {
    return NextResponse.json({ error: "Feature not available" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const rawDestination = body.destination || DEFAULT_DESTINATION;
  const uuid = body.uuid || randomUUID();

  let parsed: URL;
  try {
    parsed = new URL(rawDestination);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid destination URL" }, { status: 400 });
  }

  parsed.searchParams.set("qr", uuid);

  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logo = readFileSync(logoPath);
    const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

    const qr = new QRCodeStyling({
      width: QR_SIZE,
      height: QR_SIZE,
      type: "svg",
      jsdom: JSDOM,
      data: parsed.toString(),
      margin: MARGIN,
      qrOptions: { errorCorrectionLevel: "H" },
      dotsOptions: {
        color: "#cb9b2d",
        type: "rounded"
      },
      backgroundOptions: { color: "#122c3d" },
    });

    const buffer = await qr.getRawData("svg");
    if (!buffer) {
      return NextResponse.json({ error: "Failed to render QR code" }, { status: 500 });
    }
    let svg = buffer.toString();

    const qrSize = Math.min(QR_SIZE, QR_SIZE) - 2 * MARGIN;
    const logoSize = Math.round(qrSize * LOGO_SIZE_FACTOR);
    const x = Math.round((QR_SIZE - logoSize) / 2);
    const y = Math.round((QR_SIZE - logoSize) / 2);
    const pad = 2;
    const mask = `<rect x="${x - pad}" y="${y - pad}" width="${logoSize + 2 * pad}" height="${logoSize + 2 * pad}" rx="12" fill="#ffffff" transform="rotate(0)"/>`;
    const image = `<image href="${logoDataUrl}" xlink:href="${logoDataUrl}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}"/>`;
    svg = svg.replace("</svg>", mask + image + "</svg>");

    const filePath = `qr-codes/${uuid}.svg`;
    const { error: uploadError } = await adminClient.storage
      .from("qr-codes")
      .upload(`${uuid}.svg`, Buffer.from(svg), {
        contentType: "image/svg+xml",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: record, error: dbError } = await adminClient
      .from("qr_codes")
      .insert({ uuid, path: filePath, destination: parsed.toString() })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    const { data: publicUrl } = adminClient.storage.from("qr-codes").getPublicUrl(`${uuid}.svg`);

    return NextResponse.json({ record, url: publicUrl.publicUrl }, { status: 201 });
  } catch (error) {
    console.error("QR code generation failed:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}