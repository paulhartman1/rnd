import { NextResponse } from "next/server";
import { parseLeadPayload } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsedLead = parseLeadPayload(payload);

  if (!parsedLead.ok) {
    return NextResponse.json({ error: parsedLead.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert(parsedLead.data)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Unable to create lead." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
