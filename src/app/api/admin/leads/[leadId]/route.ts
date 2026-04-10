import { NextResponse } from "next/server";
import { isLeadStatus } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: nextStatus, owner_notes: ownerNotes })
    .eq("id", leadId);

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) {
    return NextResponse.json({ error: "Unable to remove lead." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
