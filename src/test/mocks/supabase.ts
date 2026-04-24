import { vi } from "vitest";
import type { LeadRow, LeadInsert } from "@/lib/leads";
import type { AppointmentRow } from "@/lib/appointments";

export function createMockLead(overrides?: Partial<LeadRow>): LeadRow {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    listed_with_agent: false,
    property_type: "Single Family",
    owns_land: true,
    repairs_needed: "Minor Renovations $$ - Kitchen, Bathroom, Roof",
    close_timeline: "30-60 Days",
    sell_reason: "Inherited",
    acceptable_offer: "$250,000",
    street_address: "123 Main St",
    city: "Springfield",
    state: "IL",
    postal_code: "62701",
    full_name: "John Doe",
    email: "john@example.com",
    phone: "555-1234",
    sms_consent: true,
    source_id: "web-source-id",
    status: "new",
    owner_notes: null,
    deleted_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createMockAppointment(overrides?: Partial<AppointmentRow>): AppointmentRow {
  return {
    id: "223e4567-e89b-12d3-a456-426614174000",
    lead_id: "123e4567-e89b-12d3-a456-426614174000",
    user_id: null,
    title: "Property Viewing",
    description: "Initial property inspection",
    start_time: "2024-01-15T10:00:00.000Z",
    end_time: "2024-01-15T11:00:00.000Z",
    status: "scheduled",
    location: "123 Main St, Springfield, IL",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createMockSupabaseClient() {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockIs = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    is: mockIs,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  return {
    from: mockFrom,
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    // For chaining
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    is: mockIs,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  };
}
