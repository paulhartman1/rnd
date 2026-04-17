import { Suspense } from "react";
import SimpleBookingClient from "./simple-booking-client";

export const metadata = {
  title: "Schedule an Appointment | Rush N Dush",
  description: "Schedule a property visit or consultation with our team.",
};

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-surface)] px-4 py-6">
          <div className="mx-auto max-w-2xl">
            <p className="text-center text-[var(--color-muted)]">Loading...</p>
          </div>
        </main>
      }
    >
      <SimpleBookingClient />
    </Suspense>
  );
}
