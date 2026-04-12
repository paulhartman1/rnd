import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../admin/leads/[leadId]/route";
import { createMockSupabaseClient } from "@/test/mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

describe("PATCH /api/admin/leads/[leadId]", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  it("should update lead status successfully", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    mockSupabase.is.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "PATCH",
      body: JSON.stringify({ status: "contacted" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockSupabase.from).toHaveBeenCalledWith("leads");
    expect(mockSupabase.update).toHaveBeenCalledWith({
      status: "contacted",
      owner_notes: null,
    });
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "lead-123");
  });

  it("should update lead with owner notes", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    mockSupabase.is.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "PATCH",
      body: JSON.stringify({
        status: "offer-sent",
        ownerNotes: "  Follow up next week  ",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockSupabase.update).toHaveBeenCalledWith({
      status: "offer-sent",
      owner_notes: "Follow up next week",
    });
  });

  it("should return 400 for invalid status", async () => {
    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "PATCH",
      body: JSON.stringify({ status: "invalid-status" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid status.");
  });

  it("should return 500 when admin client is not configured", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(null);

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "PATCH",
      body: JSON.stringify({ status: "contacted" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
  });

  it("should handle Supabase update errors", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    mockSupabase.is.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "PATCH",
      body: JSON.stringify({ status: "contacted" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Unable to update lead.");
  });
});

describe("DELETE /api/admin/leads/[leadId]", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  it("should soft delete a lead successfully", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "lead-123" },
      error: null,
    });

    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      maybeSingle: mockMaybeSingle,
    } as any);

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockSupabase.from).toHaveBeenCalledWith("leads");
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "lead-123");
    expect(mockSupabase.update).toHaveBeenCalled();
  });

  it("should return 404 when lead is not found", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      maybeSingle: mockMaybeSingle,
    } as any);

    const request = new Request("http://localhost:3000/api/admin/leads/lead-999", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ leadId: "lead-999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Lead not found.");
  });

  it("should return 500 when admin client is not configured", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(null);

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
  });

  it("should handle Supabase delete errors", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    mockSupabase.select.mockReturnValue({
      ...mockSupabase,
      maybeSingle: mockMaybeSingle,
    } as any);

    const request = new Request("http://localhost:3000/api/admin/leads/lead-123", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ leadId: "lead-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Unable to mark lead as deleted.");
  });
});
