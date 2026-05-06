import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFormInsert, type FormRow } from "@/lib/forms";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not available" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const formType = searchParams.get("formType");
    const status = searchParams.get("status");

    let query = adminClient
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    if (formType) {
      query = query.eq("form_type", formType);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching forms:", error);
      return NextResponse.json(
        { error: "Failed to fetch forms" },
        { status: 500 }
      );
    }

    return NextResponse.json(data as FormRow[]);
  } catch (error) {
    console.error("Error in GET /api/admin/forms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validation = validateFormInsert(body, user.id);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("forms")
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error("Error creating form:", error);
      return NextResponse.json(
        { error: "Failed to create form" },
        { status: 500 }
      );
    }

    return NextResponse.json(data as FormRow, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/forms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
