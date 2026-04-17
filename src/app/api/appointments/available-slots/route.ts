import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYY-MM-DD format
  const typeId = searchParams.get("typeId");

  if (!date || !typeId) {
    return NextResponse.json(
      { error: "Missing date or typeId parameter" },
      { status: 400 },
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  const requestedDate = new Date(date);
  const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Fetch appointment type to get duration
  const { data: appointmentType } = await supabase
    .from("appointment_types")
    .select("default_duration_minutes")
    .eq("id", typeId)
    .eq("is_active", true)
    .single();

  if (!appointmentType) {
    return NextResponse.json(
      { error: "Appointment type not found" },
      { status: 404 },
    );
  }

  const durationMinutes = appointmentType.default_duration_minutes;

  // Get availability windows for this day of week
  const { data: availabilityWindows } = await supabase
    .from("availability_windows")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  if (!availabilityWindows || availabilityWindows.length === 0) {
    return NextResponse.json({ availableSlots: [] });
  }

  // Get existing appointments for this date
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  const { data: existingAppointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay)
    .in("status", ["scheduled", "completed"]);

  // Get blackout periods that overlap with this date
  const { data: blackoutPeriods } = await supabase
    .from("blackout_periods")
    .select("*")
    .lte("start_time", endOfDay)
    .gte("end_time", startOfDay);

  // Generate time slots
  const slots: Array<{ start_time: string; end_time: string; available: boolean }> = [];
  const slotIncrementMinutes = 30; // Generate slots every 30 minutes

  for (const window of availabilityWindows) {
    // Convert time strings to today's date
    const [startHour, startMin] = window.start_time.split(":").map(Number);
    const [endHour, endMin] = window.end_time.split(":").map(Number);

    let currentTime = new Date(requestedDate);
    currentTime.setHours(startHour, startMin, 0, 0);

    const windowEnd = new Date(requestedDate);
    windowEnd.setHours(endHour, endMin, 0, 0);

    while (currentTime < windowEnd) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);

      // Check if slot end exceeds window end
      if (slotEnd > windowEnd) {
        break;
      }

      const slotStart = currentTime.toISOString();
      const slotEndTime = slotEnd.toISOString();

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments?.some((apt) => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        const slotStartDate = new Date(slotStart);
        const slotEndDate = new Date(slotEndTime);

        // Check for overlap
        return slotStartDate < aptEnd && slotEndDate > aptStart;
      });

      // Check if slot conflicts with blackout periods
      const hasBlackout = blackoutPeriods?.some((blackout) => {
        const blackoutStart = new Date(blackout.start_time);
        const blackoutEnd = new Date(blackout.end_time);
        const slotStartDate = new Date(slotStart);
        const slotEndDate = new Date(slotEndTime);

        return slotStartDate < blackoutEnd && slotEndDate > blackoutStart;
      });

      // Check if slot is in the past
      const now = new Date();
      const isPast = new Date(slotStart) < now;

      const available = !hasConflict && !hasBlackout && !isPast;

      slots.push({
        start_time: slotStart,
        end_time: slotEndTime,
        available,
      });

      // Move to next slot
      currentTime = new Date(currentTime.getTime() + slotIncrementMinutes * 60000);
    }
  }

  return NextResponse.json({ availableSlots: slots });
}
