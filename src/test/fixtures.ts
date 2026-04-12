import type { IntakeAnswers } from "@/lib/leads";

export const validIntakeAnswers: IntakeAnswers = {
  listedWithAgent: "No",
  propertyType: "Single Family",
  ownsLand: "Yes",
  repairsNeeded: "Minor Renovations $$ - Kitchen, Bathroom, Roof",
  closeTimeline: "30-60 Days",
  sellReason: "Inherited",
  acceptableOffer: "$250,000",
  streetAddress: "123 Main St",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
  fullName: "John Doe",
  email: "john@example.com",
  phone: "555-1234",
  smsConsent: true,
};

export const invalidIntakeAnswers = {
  missingEmail: {
    ...validIntakeAnswers,
    email: "",
  },
  invalidEmail: {
    ...validIntakeAnswers,
    email: "not-an-email",
  },
  missingSmsConsent: {
    ...validIntakeAnswers,
    smsConsent: false,
  },
  missingFullName: {
    ...validIntakeAnswers,
    fullName: "",
  },
  whitespaceOnly: {
    ...validIntakeAnswers,
    city: "   ",
  },
};
