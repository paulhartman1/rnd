import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentRequestNotification } from "@/lib/appointment-notifications";

export async function POST(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const {
    appointmentTypeId,
    fullName,
    email,
    phone,
    streetAddress,
    city,
    state,
    postalCode,
    requestedStartTime,
    requestedEndTime,
    notes,
  } = body;

  // Validation
  if (
    !appointmentTypeId ||
    !fullName ||
    !email ||
    !phone ||
    !streetAddress ||
    !city ||
    !state ||
    !postalCode ||
    !requestedStartTime ||
    !requestedEndTime
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Fetch appointment type to get name
  const { data: appointmentType } = await supabase
    .from("appointment_types")
    .select("name")
    .eq("id", appointmentTypeId)
    .single();

  // Check if a lead already exists with the same email and address
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .eq("street_address", streetAddress)
    .is("deleted_at", null)
    .single();

  // Create a lead only if one doesn't exist
  if (!existingLead) {
    const { error: leadError } = await supabase
      .from("leads")
      .insert({
        full_name: fullName,
        email,
        phone,
        street_address: streetAddress,
        city,
        state,
        postal_code: postalCode,
        listed_with_agent: false,
        property_type: "Unknown",
        repairs_needed: notes || "Appointment requested",
        close_timeline: "Flexible",
        sell_reason: `Appointment request: ${appointmentType?.name || "Consultation"}`,
        acceptable_offer: "To be discussed",
        sms_consent: false,
        status: "new",
        owner_notes: `Appointment request: ${appointmentType?.name || ""} on ${new Date(requestedStartTime).toLocaleString()}. Notes: ${notes || "None"}`,
      });

    if (leadError) {
      console.error("Failed to create lead from appointment:", leadError);
      // Continue anyway - appointment request is more important
    }
  }

  // Insert appointment request
  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      appointment_type_id: appointmentTypeId,
      full_name: fullName,
      email,
      phone,
      street_address: streetAddress,
      city,
      state,
      postal_code: postalCode,
      requested_start_time: requestedStartTime,
      requested_end_time: requestedEndTime,
      notes: notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create appointment request:", error);
    return NextResponse.json(
      { error: "Failed to submit appointment request" },
      { status: 500 },
    );
  }

  // Send notification to admin
  await sendAppointmentRequestNotification({
    fullName,
    email,
    phone,
    appointmentType: appointmentType?.name || "Appointment",
    requestedTime: requestedStartTime,
    address: `${streetAddress}, ${city}, ${state} ${postalCode}`,
    requestId: data.id,
  });

  return NextResponse.json({
    success: true,
    appointmentRequest: data,
  });
}
