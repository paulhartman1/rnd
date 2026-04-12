import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../leads/route";
import { validIntakeAnswers } from "@/test/fixtures";
import { createMockSupabaseClient } from "@/test/mocks/supabase";

// Mock the Supabase modules
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/leads", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  it("should create a lead with valid payload and return 201", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    mockSupabase.single.mockResolvedValue({
      data: { id: "lead-123" },
      error: null,
    });

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(validIntakeAnswers),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ id: "lead-123" });
    expect(mockSupabase.from).toHaveBeenCalledWith("leads");
    expect(mockSupabase.insert).toHaveBeenCalledWith({
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
    });
  });

  it("should return 400 for missing required fields", async () => {
    const invalidPayload = { ...validIntakeAnswers, email: "" };

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("A valid email is required.");
  });

  it("should return 400 for invalid email format", async () => {
    const invalidPayload = { ...validIntakeAnswers, email: "not-an-email" };

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("A valid email is required.");
  });

  it("should return 400 when SMS consent is not true", async () => {
    const invalidPayload = { ...validIntakeAnswers, smsConsent: false };

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("SMS consent is required.");
  });

  it("should handle Supabase insert errors", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        details: "Key already exists",
        hint: null,
      },
    });

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(validIntakeAnswers),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeTruthy();
  });

  it("should handle JWT authentication errors with specific message in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST301",
        message: "JWT expired",
        details: null,
        hint: null,
      },
    });

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(validIntakeAnswers),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("authentication");

    process.env.NODE_ENV = originalEnv;
  });

  it("should handle malformed JSON request body", async () => {
    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: "{ invalid json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeTruthy();
  });

  it("should use server client when admin client is not available", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { createClient } = await import("@/lib/supabase/server");

    vi.mocked(createAdminClient).mockReturnValue(null);
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    mockSupabase.single.mockResolvedValue({
      data: { id: "lead-456" },
      error: null,
    });

    const request = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(validIntakeAnswers),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("lead-456");
    expect(createClient).toHaveBeenCalled();
  });
});
