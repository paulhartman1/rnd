"use client";

import { useState, useEffect } from "react";
import type { AppointmentTypeRow } from "@/lib/appointment-types";

type Step = "type" | "date" | "time" | "contact" | "success";

type TimeSlot = {
  start_time: string;
  end_time: string;
  available: boolean;
};

export default function AppointmentBookingClient() {
  const [step, setStep] = useState<Step>("type");
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeRow[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentTypeRow | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Contact form data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");

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

  const handleTypeSelect = (type: AppointmentTypeRow) => {
    setSelectedType(type);
    setStep("date");
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("contact");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !selectedSlot) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentTypeId: selectedType.id,
          fullName,
          email,
          phone,
          streetAddress,
          city,
          state,
          postalCode,
          requestedStartTime: selectedSlot.start_time,
          requestedEndTime: selectedSlot.end_time,
          notes,
        }),
      });

      if (response.ok) {
        setStep("success");
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
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get maximum date (90 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split("T")[0];
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-accent)] sm:text-sm">
            Schedule Appointment
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-navy)] sm:text-3xl">
            Book Your Visit
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)] sm:mt-3">
            Choose a time that works for you and we'll be in touch to confirm.
          </p>
        </header>

        {/* Progress indicator */}
        {step !== "success" && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className={step === "type" ? "font-bold text-[var(--color-navy)]" : "text-[var(--color-muted)]"}>
                1. Type
              </span>
              <span className={step === "date" ? "font-bold text-[var(--color-navy)]" : "text-[var(--color-muted)]"}>
                2. Date
              </span>
              <span className={step === "time" ? "font-bold text-[var(--color-navy)]" : "text-[var(--color-muted)]"}>
                3. Time
              </span>
              <span className={step === "contact" ? "font-bold text-[var(--color-navy)]" : "text-[var(--color-muted)]"}>
                4. Contact
              </span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[var(--color-primary-gold)] transition-all duration-300"
                style={{
                  width:
                    step === "type"
                      ? "25%"
                      : step === "date"
                        ? "50%"
                        : step === "time"
                          ? "75%"
                          : "100%",
                }}
              />
            </div>
          </div>
        )}

        {/* Step 1: Select Appointment Type */}
        {step === "type" && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              What type of appointment do you need?
            </h2>
            {appointmentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type)}
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

        {/* Step 2: Select Date */}
        {step === "date" && (
          <div>
            <button
              onClick={() => setStep("type")}
              className="mb-4 text-sm font-bold text-[var(--color-accent)] hover:underline"
            >
              ← Back to appointment types
            </button>
            <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              Choose a date
            </h2>
            <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
              <input
                type="date"
                min={getMinDate()}
                max={getMaxDate()}
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === "time" && (
          <div>
            <button
              onClick={() => setStep("date")}
              className="mb-4 text-sm font-bold text-[var(--color-accent)] hover:underline"
            >
              ← Back to date selection
            </button>
            <h2 className="mb-2 text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              Choose a time
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              {selectedDate && formatDate(selectedDate)}
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
                      onClick={() => handleTimeSelect(slot)}
                      className="rounded-lg border border-black/10 bg-white px-3 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:border-[var(--color-primary-gold)] hover:shadow-md sm:px-4 sm:py-4"
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Contact Information */}
        {step === "contact" && (
          <div>
            <button
              onClick={() => setStep("time")}
              className="mb-4 text-sm font-bold text-[var(--color-accent)] hover:underline"
            >
              ← Back to time selection
            </button>
            <h2 className="mb-2 text-lg font-bold text-[var(--color-navy)] sm:text-xl">
              Your contact information
            </h2>
            <div className="mb-4 rounded-lg bg-[var(--color-primary-gold)]/10 p-3 sm:p-4">
              <p className="text-sm font-bold text-[var(--color-navy)]">
                {selectedType?.name}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {selectedDate && formatDate(selectedDate)} at{" "}
                {selectedSlot && formatTime(selectedSlot.start_time)}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--color-navy)]">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-navy)]">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-navy)]">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-navy)]">
                  Property Address *
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-[var(--color-navy)]">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="Denver"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--color-navy)]">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="CO"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--color-navy)]">
                    ZIP *
                  </label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="80001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--color-navy)]">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Any special requests or information we should know?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[var(--color-primary-gold)] px-6 py-4 text-base font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Request Appointment"}
              </button>

              <p className="text-xs text-[var(--color-muted)] sm:text-sm">
                By submitting this request, you agree to be contacted by our team to
                confirm your appointment.
              </p>
            </form>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--color-navy)] sm:text-2xl">
              Request Received!
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)] sm:text-base">
              Thank you for your appointment request. We'll call you shortly to confirm
              your appointment details.
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
        )}
      </div>
    </main>
  );
}
