import { describe, it, expect } from "vitest";
import { parseLeadPayload, isLeadStatus } from "../leads";
import { validIntakeAnswers, invalidIntakeAnswers } from "@/test/fixtures";

describe("parseLeadPayload", () => {
  describe("valid payloads", () => {
    it("should parse a complete valid payload successfully", () => {
      const result = parseLeadPayload(validIntakeAnswers);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
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
      }
    });

    it("should convert 'Yes' to true for listedWithAgent", () => {
      const payload = { ...validIntakeAnswers, listedWithAgent: "Yes" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.listed_with_agent).toBe(true);
      }
    });

    it("should convert 'No' to false for listedWithAgent", () => {
      const payload = { ...validIntakeAnswers, listedWithAgent: "No" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.listed_with_agent).toBe(false);
      }
    });

    it("should convert 'Yes' to true for ownsLand", () => {
      const payload = { ...validIntakeAnswers, ownsLand: "Yes" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owns_land).toBe(true);
      }
    });

    it("should convert 'No' to false for ownsLand", () => {
      const payload = { ...validIntakeAnswers, ownsLand: "No" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owns_land).toBe(false);
      }
    });

    it("should trim whitespace from string fields", () => {
      const payload = {
        ...validIntakeAnswers,
        fullName: "  John Doe  ",
        city: "  Springfield  ",
        email: "  john@example.com  ",
      };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.full_name).toBe("John Doe");
        expect(result.data.city).toBe("Springfield");
        expect(result.data.email).toBe("john@example.com");
      }
    });
  });

  describe("invalid payloads", () => {
    it("should return error for non-object payload", () => {
      const result = parseLeadPayload(null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Invalid request body.");
      }
    });

    it("should return error for undefined payload", () => {
      const result = parseLeadPayload(undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Invalid request body.");
      }
    });

    it("should return error for missing fullName", () => {
      const result = parseLeadPayload(invalidIntakeAnswers.missingFullName);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("fullName is required.");
      }
    });

    it("should return error for missing email", () => {
      const result = parseLeadPayload(invalidIntakeAnswers.missingEmail);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("A valid email is required.");
      }
    });

    it("should return error for invalid email format", () => {
      const result = parseLeadPayload(invalidIntakeAnswers.invalidEmail);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("A valid email is required.");
      }
    });

    it("should return error when SMS consent is not true", () => {
      const result = parseLeadPayload(invalidIntakeAnswers.missingSmsConsent);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("SMS consent is required.");
      }
    });

    it("should return error for whitespace-only string fields", () => {
      const result = parseLeadPayload(invalidIntakeAnswers.whitespaceOnly);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("city is required.");
      }
    });

    it("should return error for missing property type", () => {
      const payload = { ...validIntakeAnswers, propertyType: "" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("propertyType is required.");
      }
    });

    it("should return error for missing street address", () => {
      const payload = { ...validIntakeAnswers, streetAddress: "" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("streetAddress is required.");
      }
    });

    it("should return error for invalid listedWithAgent value", () => {
      const payload = { ...validIntakeAnswers, listedWithAgent: "Maybe" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("listedWithAgent must be Yes or No.");
      }
    });

    it("should return error for invalid ownsLand value", () => {
      const payload = { ...validIntakeAnswers, ownsLand: "Maybe" };
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("ownsLand must be Yes or No.");
      }
    });

    it("should allow missing ownsLand field", () => {
      const payload = { ...validIntakeAnswers };
      delete (payload as any).ownsLand;
      const result = parseLeadPayload(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.owns_land).toBe(null);
      }
    });
  });
});

describe("isLeadStatus", () => {
  it("should return true for valid status 'new'", () => {
    expect(isLeadStatus("new")).toBe(true);
  });

  it("should return true for valid status 'contacted'", () => {
    expect(isLeadStatus("contacted")).toBe(true);
  });

  it("should return true for valid status 'offer-sent'", () => {
    expect(isLeadStatus("offer-sent")).toBe(true);
  });

  it("should return true for valid status 'under-contract'", () => {
    expect(isLeadStatus("under-contract")).toBe(true);
  });

  it("should return true for valid status 'closed'", () => {
    expect(isLeadStatus("closed")).toBe(true);
  });

  it("should return true for valid status 'archived'", () => {
    expect(isLeadStatus("archived")).toBe(true);
  });

  it("should return false for invalid status", () => {
    expect(isLeadStatus("invalid-status")).toBe(false);
  });

  it("should return false for non-string values", () => {
    expect(isLeadStatus(123)).toBe(false);
    expect(isLeadStatus(null)).toBe(false);
    expect(isLeadStatus(undefined)).toBe(false);
    expect(isLeadStatus({})).toBe(false);
  });
});
