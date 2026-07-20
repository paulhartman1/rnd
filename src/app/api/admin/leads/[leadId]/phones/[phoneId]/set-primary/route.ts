import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
  phoneId: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { leadId, phoneId } = await params;
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Update the phone to be primary
  // The trigger will automatically unset other primary flags
  const { error } = await supabase
    .from("lead_phones")
    .update({ is_primary: true })
    .eq("id", phoneId)
    .eq("lead_id", leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
