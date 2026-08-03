import { describe, it, expect } from "vitest";
import { parseLeadPayload, isLeadStatus } from "../leads";
import { validIntakeAnswers, invalidIntakeAnswers } from "@/test/fixtures";
import { isValidEmail } from "../validation";


describe("leads", () => {
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
            sms_consent_at: expect.any(String),
            sms_consent_disclosure_version: "1",
            owner_notes: null,
          });
        }
      });

      it("should parse a REI Lead Pros payload with combined address, negotiability, blank email, and notes", () => {        const result = parseLeadPayload({
          ...validIntakeAnswers,
          acceptableOffer: "",
          negotiability: "Yes",
          streetAddress: "",
          address: "123 Main St, Springfield, IL 62701",
          city: "",
          state: "",
          postalCode: "",
          email: "",
          notes: "Prospect wants a fast close.",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data).toMatchObject({
            acceptable_offer: "Yes",
            street_address: "123 Main St",
            city: "Springfield",
            state: "IL",
            postal_code: "62701",
            email: null,
            owner_notes: "Prospect wants a fast close.",
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

      it("should record consent timestamp and disclosure version when SMS consent is true", () => {
        const result = parseLeadPayload(validIntakeAnswers);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.sms_consent).toBe(true);
          expect(result.data.sms_consent_at).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          );
          expect(result.data.sms_consent_disclosure_version).toBe("1");
        }
      });

      it("should store explicit false and null audit fields when SMS consent is not given", () => {
        const result = parseLeadPayload({ ...validIntakeAnswers, smsConsent: false });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.sms_consent).toBe(false);
          expect(result.data.sms_consent_at).toBeNull();
          expect(result.data.sms_consent_disclosure_version).toBeNull();
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

      it("should allow missing email when phone is provided", () => {
        const result = parseLeadPayload(invalidIntakeAnswers.missingEmail);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.email).toBe(null);
        }
      });


      it("should return error for missing street address", () => {
        const payload = { ...validIntakeAnswers, streetAddress: "" };
        const result = parseLeadPayload(payload);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe("Invalid address format.");
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

  describe("utility functions", () => {

    describe("emailValidation", () => {
      it("should return true for valid email", () => {
        const validEmail = "test@example.com";
        expect(isValidEmail(validEmail)).toBe(true);
      });

      it("should return false for invalid email", () => {
        const invalidEmail = "invalid-email";
        expect(isValidEmail(invalidEmail)).toBe(false);
      });
    });
    describe("address parsing", () => {
      it("should parse combined address into street, city, state, and zip", () => {
        const combinedAddress = "123 Main St, Springfield, IL 62701";
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: "",
          address: combinedAddress,
          city: "",
          state: "",
          postalCode: "",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("123 Main St");
          expect(result.data.city).toBe("Springfield");
          expect(result.data.state).toBe("IL");
          expect(result.data.postal_code).toBe("62701");
        }
      });

      it("should handle cities with spaces in combined address", () => {
        const combinedAddress = "456 Elm St, Los Angeles, CA 90001";
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: "",
          address: combinedAddress,
          city: "",
          state: "",
          postalCode: "",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("456 Elm St");
          expect(result.data.city).toBe("Los Angeles");
          expect(result.data.state).toBe("CA");
          expect(result.data.postal_code).toBe("90001");
        }
      });

      it("should parse with zip in the form xxxxx-xxxx", () => {
        const combinedAddress = "789 Oak St, Smalltown, TX 75001-1234";
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: "",
          address: combinedAddress,
          city: "",
          state: "",
          postalCode: "",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("789 Oak St");
          expect(result.data.city).toBe("Smalltown");
          expect(result.data.state).toBe("TX");
          expect(result.data.postal_code).toBe("75001-1234");
        }
      });

      it("should handle many words in street address", () => {
        const combinedAddress = "789 Long Street Name That Goes On, Smalltown, TX 75001";
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: "",
          address: combinedAddress,
          city: "",
          state: "",
          postalCode: "",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("789 Long Street Name That Goes On");
          expect(result.data.city).toBe("Smalltown");
          expect(result.data.state).toBe("TX");
          expect(result.data.postal_code).toBe("75001");
        }
      });

      it("should handle many words in city name", () => {
        const combinedAddress = "1010 Oak St, San Francisco Bay Area, CA 94102";
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: "",
          address: combinedAddress,
          city: "",
          state: "",
          postalCode: "",
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("1010 Oak St");
          expect(result.data.city).toBe("San Francisco Bay Area");
          expect(result.data.state).toBe("CA");
          expect(result.data.postal_code).toBe("94102");
        }
      });

      it("should handle the most confusing case with many words in street and city", () => {
        const combinedAddress = "E North 123 Long Street Name That Goes On, Los Angeles Downtown Area, CA 90001";
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: "",
          address: combinedAddress,
          city: "",
          state: "",
          postalCode: "",
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("E North 123 Long Street Name That Goes On");
          expect(result.data.city).toBe("Los Angeles Downtown Area");
          expect(result.data.state).toBe("CA");
          expect(result.data.postal_code).toBe("90001");
        }
      });

      it("should handle this address from an error report", () => {
        const result = parseLeadPayload({
          ...validIntakeAnswers,
          streetAddress: '4191 Bays Water Dr, Colorado Springs, CO 80920',
          address: "",
          city: "",
          state: "",
          postalCode: "",
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.street_address).toBe("4191 Bays Water Dr");
          expect(result.data.city).toBe("Colorado Springs");
          expect(result.data.state).toBe("CO");
          expect(result.data.postal_code).toBe("80920");
        }
      });
    });

  });

});