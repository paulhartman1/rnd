import { NextResponse } from "next/server";
import { isLeadStatus } from "@/lib/leads";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId } = await params;
  const body = (await request.json()) as { status?: unknown; ownerNotes?: unknown };
  const nextStatus = body.status;

  if (!isLeadStatus(nextStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const ownerNotes =
    typeof body.ownerNotes === "string" ? body.ownerNotes.trim() : null;

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: nextStatus, owner_notes: ownerNotes })
    .eq("id", leadId)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: "Unable to update lead." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId } = await params;

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Unable to mark lead as deleted." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
