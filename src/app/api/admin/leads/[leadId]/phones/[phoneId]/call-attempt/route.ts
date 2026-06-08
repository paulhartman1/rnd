import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
  phoneId: string;
};

// POST - Increment call attempts and update last_called_at
export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId, phoneId } = await params;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Get current phone
  const { data: phone, error: fetchError } = await supabase
    .from("lead_phones")
    .select("call_attempts")
    .eq("id", phoneId)
    .eq("lead_id", leadId)
    .single();

  if (fetchError || !phone) {
    return NextResponse.json(
      { error: "Phone number not found" },
      { status: 404 },
    );
  }

  // Increment call attempts and update timestamp
  const { data: updatedPhone, error } = await supabase
    .from("lead_phones")
    .update({
      call_attempts: phone.call_attempts + 1,
      last_called_at: new Date().toISOString(),
    })
    .eq("id", phoneId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ phone: updatedPhone });
}
