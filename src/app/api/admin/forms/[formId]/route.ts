import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFormUpdate, type FormRow } from "@/lib/forms";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
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

    const { formId } = await params;

    const { data, error } = await adminClient
      .from("forms")
      .select("*")
      .eq("id", formId)
      .single();

    if (error) {
      console.error("Error fetching form:", error);
      return NextResponse.json(
        { error: "Failed to fetch form" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(data as FormRow);
  } catch (error) {
    console.error("Error in GET /api/admin/forms/[formId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
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

    const { formId } = await params;
    const body = await request.json();
    const validation = validateFormUpdate(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("forms")
      .update(validation.data)
      .eq("id", formId)
      .select()
      .single();

    if (error) {
      console.error("Error updating form:", error);
      return NextResponse.json(
        { error: "Failed to update form" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(data as FormRow);
  } catch (error) {
    console.error("Error in PATCH /api/admin/forms/[formId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
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

    const { formId } = await params;

    // Check if form exists and is a draft
    const { data: form, error: fetchError } = await adminClient
      .from("forms")
      .select("status")
      .eq("id", formId)
      .single();

    if (fetchError || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Only allow deleting draft forms
    if (form.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft forms can be deleted" },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("forms")
      .delete()
      .eq("id", formId);

    if (error) {
      console.error("Error deleting form:", error);
      return NextResponse.json(
        { error: "Failed to delete form" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/forms/[formId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
