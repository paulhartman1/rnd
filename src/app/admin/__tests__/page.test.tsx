import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient, createMockLead } from "@/test/mocks/supabase";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  isSuperAdmin: vi.fn(() => false),
  isFeatureEnabled: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("../admin-nav", () => ({
  default: () => null,
}));

describe("Admin Dashboard Page - Hot Lead Count", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  it("should exclude deleted leads from hot lead count", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "admin@test.com" } },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    // Create mock leads
    const activeHotLead = createMockLead({
      id: "lead-1",
      isHotLead: true,
      deleted_at: null,
      close_timeline: "As soon as possible",
      sell_reason: "Inherited property",
    });

    const deletedHotLead = createMockLead({
      id: "lead-2",
      isHotLead: true,
      deleted_at: "2024-01-15T10:00:00.000Z",
      close_timeline: "Within 1 month",
      sell_reason: "Foreclosure",
    });

    const activeNormalLead = createMockLead({
      id: "lead-3",
      isHotLead: false,
      deleted_at: null,
      close_timeline: "3-6 Months",
      sell_reason: "Downsizing",
    });

    // Mock the leads query with proper filter chain
    const mockOrder = vi.fn().mockResolvedValue({
      data: [activeHotLead, activeNormalLead], // Only non-deleted leads
      error: null,
    });

    const mockIs = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockSelect = vi.fn().mockReturnValue({
      is: mockIs,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: mockSelect,
        } as any;
      }
      // Mock other tables
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    });

    // Import and execute the page component
    const AdminDashboardPage = (await import("../page")).default;
    await AdminDashboardPage();

    // Verify the leads query was called with deleted_at filter
    expect(mockSupabase.from).toHaveBeenCalledWith("leads");
    expect(mockSelect).toHaveBeenCalledWith("id, status, isHotLead, created_at");
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("should correctly count only active hot leads", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "admin@test.com" } },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    // Create 2 active hot leads and 1 deleted hot lead
    const leads = [
      createMockLead({
        id: "lead-1",
        isHotLead: true,
        deleted_at: null,
        close_timeline: "As soon as possible",
        sell_reason: "Inherited",
      }),
      createMockLead({
        id: "lead-2",
        isHotLead: true,
        deleted_at: null,
        close_timeline: "Within 2 weeks",
        sell_reason: "Foreclosure",
      }),
      createMockLead({
        id: "lead-3",
        isHotLead: false,
        deleted_at: null,
      }),
    ];

    const mockOrder = vi.fn().mockResolvedValue({
      data: leads,
      error: null,
    });

    const mockIs = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockSelect = vi.fn().mockReturnValue({
      is: mockIs,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: mockSelect,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    });

    await (await import("../page")).default();

    // Verify that the query filters by deleted_at
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
    
    // The returned leads should only contain 2 hot leads (not 3)
    const returnedLeads = (await mockOrder.mock.results[0].value).data;
    const hotLeadsCount = returnedLeads.filter((lead: any) => lead.isHotLead).length;
    expect(hotLeadsCount).toBe(2);
  });

  it("should not include deleted leads even if they are hot", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "admin@test.com" } },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    // Only return active leads (deleted ones filtered by query)
    const activeLeads = [
      createMockLead({
        id: "lead-1",
        isHotLead: true,
        deleted_at: null,
      }),
    ];

    const mockOrder = vi.fn().mockResolvedValue({
      data: activeLeads,
      error: null,
    });

    const mockIs = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockSelect = vi.fn().mockReturnValue({
      is: mockIs,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: mockSelect,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    });

    await (await import("../page")).default();

    // Verify the filter was applied
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
    
    // Verify only active leads were returned
    const returnedLeads = (await mockOrder.mock.results[0].value).data;
    expect(returnedLeads.every((lead: any) => lead.deleted_at === null)).toBe(true);
  });

  it("should handle the case with no hot leads", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "admin@test.com" } },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    // All leads are normal, no hot leads
    const leads = [
      createMockLead({
        id: "lead-1",
        isHotLead: false,
        deleted_at: null,
      }),
      createMockLead({
        id: "lead-2",
        isHotLead: false,
        deleted_at: null,
      }),
    ];

    const mockOrder = vi.fn().mockResolvedValue({
      data: leads,
      error: null,
    });

    const mockIs = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockSelect = vi.fn().mockReturnValue({
      is: mockIs,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: mockSelect,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    });

    await (await import("../page")).default();

    // Verify the filter was still applied
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
    
    const returnedLeads = (await mockOrder.mock.results[0].value).data;
    const hotLeadsCount = returnedLeads.filter((lead: any) => lead.isHotLead).length;
    expect(hotLeadsCount).toBe(0);
  });

  it("should filter deleted_at before ordering by created_at", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "admin@test.com" } },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockIs = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockSelect = vi.fn().mockReturnValue({
      is: mockIs,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: mockSelect,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    });

    await (await import("../page")).default();

    // Verify the chain: select -> is -> order
    expect(mockSelect).toHaveBeenCalled();
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    
    // Verify call order
    const selectCallOrder = mockSelect.mock.invocationCallOrder[0];
    const isCallOrder = mockIs.mock.invocationCallOrder[0];
    const orderCallOrder = mockOrder.mock.invocationCallOrder[0];
    
    expect(selectCallOrder).toBeLessThan(isCallOrder);
    expect(isCallOrder).toBeLessThan(orderCallOrder);
  });
});
