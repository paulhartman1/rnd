import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { requestId } = await params;
  const body = await request.json();
  const { action } = body; // 'approve' or 'reject'

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Fetch the appointment request
  const { data: appointmentRequest, error: fetchError } = await supabase
    .from("appointment_requests")
    .select("*, appointment_type:appointment_types!appointment_type_id(*)")
    .eq("id", requestId)
    .single();

  if (fetchError || !appointmentRequest) {
    return NextResponse.json(
      { error: "Appointment request not found" },
      { status: 404 },
    );
  }

  if (action === "reject") {
    // Simply update status to rejected
    const { error: updateError } = await supabase
      .from("appointment_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to reject appointment request" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  // Approve: Create appointment and link it
  const appointmentType = Array.isArray(appointmentRequest.appointment_type)
    ? appointmentRequest.appointment_type[0]
    : appointmentRequest.appointment_type;

  const { data: newAppointment, error: createError } = await supabase
    .from("appointments")
    .insert({
      title: `${appointmentType?.name || "Appointment"} - ${appointmentRequest.full_name}`,
      description: appointmentRequest.notes || null,
      start_time: appointmentRequest.requested_start_time,
      end_time: appointmentRequest.requested_end_time,
      status: "scheduled",
      location: `${appointmentRequest.street_address}, ${appointmentRequest.city}, ${appointmentRequest.state} ${appointmentRequest.postal_code}`,
      appointment_type_id: appointmentRequest.appointment_type_id,
      lead_id: null, // Could be linked to a lead if needed
    })
    .select()
    .single();

  if (createError || !newAppointment) {
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }

  // Update request status and link to appointment
  const { error: updateError } = await supabase
    .from("appointment_requests")
    .update({
      status: "approved",
      approved_appointment_id: newAppointment.id,
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update appointment request" },
      { status: 500 },
    );
  }

  // Note: User will be contacted by phone for confirmation
  // No email notification sent to user

  return NextResponse.json({ success: true, appointment: newAppointment });
}
