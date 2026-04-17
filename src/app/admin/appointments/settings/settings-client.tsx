"use client";

import type {
  AppointmentTypeRow,
  AvailabilityWindowRow,
  BlackoutPeriodRow,
  AppointmentRequestRow,
} from "@/lib/appointment-types";

type Props = {
  initialTypes: AppointmentTypeRow[];
  initialAvailability: AvailabilityWindowRow[];
  initialBlackouts: BlackoutPeriodRow[];
  initialRequests: AppointmentRequestRow[];
};

export default function AppointmentSettingsClient({
  initialTypes,
  initialAvailability,
  initialBlackouts,
  initialRequests,
}: Props) {
  return (
    <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <h2 className="text-xl font-bold text-[var(--color-navy)]">Settings Coming Soon</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Appointment settings management interface will be available here.
      </p>
      
      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-navy)]">Appointment Types</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {initialTypes.length} type(s) configured
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-bold text-[var(--color-navy)]">Availability Windows</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {initialAvailability.length} window(s) configured
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-bold text-[var(--color-navy)]">Blackout Periods</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {initialBlackouts.length} period(s) configured
          </p>
        </div>
      </div>
    </div>
  );
}
