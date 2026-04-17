"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { AppointmentTypeRow } from "@/lib/appointment-types";

type TimeSlot = {
  start_time: string;
  end_time: string;
  available: boolean;
};

type Props = {
  leadData?: {
    fullName: string;
    email: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
  };
};

export default function SimpleBookingClient({ leadData: passedLeadData }: Props) {
  const searchParams = useSearchParams();
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeRow[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentTypeRow | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [availableDaysOfWeek, setAvailableDaysOfWeek] = useState<number[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);

  // Get lead data from URL params or props
  const leadData = passedLeadData || {
    fullName: searchParams.get("name") || "",
    email: searchParams.get("email") || "",
    phone: searchParams.get("phone") || "",
    streetAddress: searchParams.get("address") || "",
    city: searchParams.get("city") || "",
    state: searchParams.get("state") || "",
    postalCode: searchParams.get("zip") || "",
  };

  // Load appointment types
  useEffect(() => {
    async function loadTypes() {
      const response = await fetch("/api/appointments/types");
      if (response.ok) {
        const data = await response.json();
        setAppointmentTypes(data.appointmentTypes);
      }
    }
    loadTypes();
  }, []);

  // Load availability windows and blackouts when type is selected
  useEffect(() => {
    if (selectedType) {
      Promise.all([
        fetch("/api/admin/availability").then(r => r.json()),
        fetch("/api/admin/blackouts").then(r => r.json()),
      ]).then(([availData, blackoutData]) => {
        // Get unique days of week that have availability
        const daysWithAvail = [...new Set(
          availData.availabilityWindows?.map((w: any) => w.day_of_week as number) || []
        )] as number[];
        setAvailableDaysOfWeek(daysWithAvail);

        // Get blackout dates
        const blackouts = blackoutData.blackoutPeriods?.map((b: any) => {
          const start = new Date(b.start_time);
          const end = new Date(b.end_time);
          const dates = [];
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split("T")[0]);
          }
          return dates;
        }).flat() || [];
        setBlackoutDates(blackouts);
      });
    }
  }, [selectedType]);

  // Load time slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedType) {
      setLoadingSlots(true);
      fetch(`/api/appointments/available-slots?date=${selectedDate}&typeId=${selectedType.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTimeSlots(data.availableSlots || []);
          setLoadingSlots(false);
        })
        .catch(() => setLoadingSlots(false));
    }
  }, [selectedDate, selectedType]);

  const handleSubmit = async () => {
    if (!selectedType || !selectedSlot || !leadData) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentTypeId: selectedType.id,
          fullName: leadData.fullName,
          email: leadData.email,
          phone: leadData.phone,
          streetAddress: leadData.streetAddress,
          city: leadData.city,
          state: leadData.state,
          postalCode: leadData.postalCode,
          requestedStartTime: selectedSlot.start_time,
          requestedEndTime: selectedSlot.end_time,
          notes: "",
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        alert("Failed to submit appointment request. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Denver",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "America/Denver",
    });
  };

  // Generate available dates for the next 14 days
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "America/Denver",
        }),
      });
    }
    return dates;
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--color-navy)] sm:text-2xl">
              Appointment Requested!
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)] sm:text-base">
              We'll call you shortly to confirm your appointment.
            </p>
            <div className="mb-6 rounded-lg bg-white p-4">
              <p className="text-sm font-bold text-[var(--color-navy)]">
                {selectedType?.name}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {selectedDate && formatDate(selectedDate)} at{" "}
                {selectedSlot && formatTime(selectedSlot.start_time)}
              </p>
            </div>
            <a
              href="/"
              className="inline-block rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
            >
              Return to Home
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-navy)] sm:text-3xl">
            When would you like to meet?
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)] sm:mt-3">
            Choose a time that works best for you. All times shown in Mountain Time (Denver).
          </p>
        </header>

        {/* Step 1: Choose Type */}
        {!selectedType && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              How would you prefer to connect?
            </h2>
            {appointmentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type)}
                className="w-full rounded-xl border border-black/10 bg-white p-4 text-left transition hover:border-[var(--color-primary-gold)] hover:shadow-md sm:p-6"
              >
                <h3 className="text-base font-bold text-[var(--color-navy)] sm:text-lg">
                  {type.name}
                </h3>
                {type.description && (
                  <p className="mt-1 text-sm text-[var(--color-muted)] sm:mt-2">
                    {type.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--color-accent)] sm:text-sm">
                  Duration: {type.default_duration_minutes} minutes
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Choose Date */}
        {selectedType && !selectedDate && (
          <div>
            <button
              onClick={() => setSelectedType(null)}
              className="mb-4 text-sm font-bold text-[var(--color-accent)] hover:underline"
            >
              ← Back
            </button>
            <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              Choose a date
            </h2>
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              Select when you'd like to meet
            </p>
            <div className="space-y-3">
              {getAvailableDates().map((date) => (
                <button
                  key={date.value}
                  onClick={() => setSelectedDate(date.value)}
                  className="w-full rounded-xl border border-black/10 bg-white p-4 text-left transition hover:border-[var(--color-primary-gold)] hover:shadow-md"
                >
                  <p className="font-bold text-[var(--color-navy)]">{date.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Choose Time */}
        {selectedType && selectedDate && !selectedSlot && (
          <div>
            <button
              onClick={() => setSelectedDate("")}
              className="mb-4 text-sm font-bold text-[var(--color-accent)] hover:underline"
            >
              ← Back
            </button>
            <h2 className="mb-2 text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              Choose a time
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              {formatDate(selectedDate)}
            </p>

            {loadingSlots ? (
              <div className="rounded-xl border border-black/10 bg-white p-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">Loading available times...</p>
              </div>
            ) : timeSlots.filter((slot) => slot.available).length === 0 ? (
              <div className="rounded-xl border border-black/10 bg-white p-6">
                <p className="text-sm text-[var(--color-muted)]">
                  No available times on this date. Please select a different date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {timeSlots
                  .filter((slot) => slot.available)
                  .map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      className="rounded-lg border border-black/10 bg-white px-3 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:border-[var(--color-primary-gold)] hover:shadow-md sm:px-4 sm:py-4"
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {selectedSlot && (
          <div>
            <button
              onClick={() => setSelectedSlot(null)}
              className="mb-4 text-sm font-bold text-[var(--color-accent)] hover:underline"
            >
              ← Back
            </button>
            <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              Confirm your appointment
            </h2>
            <div className="mb-6 rounded-lg bg-[var(--color-primary-gold)]/10 p-4">
              <p className="text-sm font-bold text-[var(--color-navy)]">
                {selectedType?.name}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {formatDate(selectedDate)} at {formatTime(selectedSlot.start_time)}
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-lg bg-[var(--color-primary-gold)] px-6 py-4 text-base font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Requesting..." : "Request Appointment"}
            </button>

            <p className="mt-4 text-xs text-[var(--color-muted)] sm:text-sm">
              We'll call you to confirm this appointment time works for both of us.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
