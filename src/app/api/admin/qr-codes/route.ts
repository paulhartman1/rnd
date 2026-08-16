import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

const DEFAULT_DESTINATION = "https://www.rushndush.com";

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
  const svg = body.svg;

  if (!svg || typeof svg !== "string" || !svg.includes("<svg")) {
    return NextResponse.json({ error: "Missing QR code SVG" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawDestination);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid destination URL" }, { status: 400 });
  }

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
}