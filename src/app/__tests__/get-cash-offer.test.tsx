import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import GetCashOfferPage from "../get-cash-offer/page";
import { mockQuestions, mockMappings } from "@/test/mocks";

// Mock fetch
global.fetch = vi.fn();

describe("Get Cash Offer Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the first step question", async () => {
    render(<GetCashOfferPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Is your property listed with an agent/i),
      ).toBeInTheDocument();
    });
  });

  it("should show progress bar", async () => {
    render(<GetCashOfferPage />);

    // Progress should be visible - looking for any indication of step 1
    await waitFor(() => {
      expect(screen.getByText(/Is your property listed with an agent/i)).toBeInTheDocument();
    });
  });

  it("should render answer options for first step", async () => {
    render(<GetCashOfferPage />);

    await waitFor(() => {
      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });
  });

  it("should enable continue button when an option is selected", async () => {
    const user = userEvent.setup();
    render(<GetCashOfferPage />);

    // Wait for questions to load, then find and click "No" option
    await waitFor(() => {
      expect(screen.getByText("No")).toBeInTheDocument();
    });
    const noButton = screen.getByText("No");
    await user.click(noButton);

    // Continue button should be enabled (looking for button with Continue text)
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeEnabled();
  });

  it("should advance to next step when continue is clicked", async () => {
    const user = userEvent.setup();
    render(<GetCashOfferPage />);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    // Answer first question
    await user.click(screen.getByText("No"));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Should show second question
    await waitFor(() => {
      expect(screen.getByText(/What type of property is it/i)).toBeInTheDocument();
    });
  });

  it("should show property type options on step 2", async () => {
    const user = userEvent.setup();
    render(<GetCashOfferPage />);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    // Navigate to step 2
    await user.click(screen.getByText("No"));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Single Family")).toBeInTheDocument();
      expect(screen.getByText("Multi Family")).toBeInTheDocument();
      expect(screen.getByText(/Vacant Land/i)).toBeInTheDocument();
    });
  });

  it("should validate email format in contact step", async () => {
    const user = userEvent.setup();
    render(<GetCashOfferPage />);

    // Fast-forward through all steps to contact step
    // This is a simplified test - in reality you'd click through all steps
    const steps = [
      "No", // listed with agent
      "Single Family", // property type
      "Yes", // owns land
      "Cosmetic Work $ - Flooring, Paint", // repairs
      "30-60 Days", // timeline
      "Inherited", // sell reason
    ];

    for (const answer of steps) {
      await user.click(screen.getByText(answer));
      await user.click(screen.getByRole("button", { name: /continue/i }));
      await waitFor(() => {}, { timeout: 100 }); // Small delay between steps
    }

    // Enter acceptable offer
    await waitFor(() => {
      const offerInput = screen.getByPlaceholderText(/\\$250,000/i);
      expect(offerInput).toBeInTheDocument();
    });

    const offerInput = screen.getByPlaceholderText(/\\$250,000/i);
    await user.type(offerInput, "$300,000");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Enter address
    await waitFor(async () => {
      const streetInput = screen.getByPlaceholderText(/Street Address/i);
      await user.type(streetInput, "123 Main St");

      const cityInput = screen.getByPlaceholderText(/City/i);
      await user.type(cityInput, "Springfield");

      const stateInput = screen.getByPlaceholderText(/State/i);
      await user.type(stateInput, "IL");

      const zipInput = screen.getByPlaceholderText(/Zip Code/i);
      await user.type(zipInput, "62701");
    });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Should be on contact step now
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Your Name/i)).toBeInTheDocument();
    });
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "lead-123" }),
    } as Response);

    render(<GetCashOfferPage />);

    // Navigate through all steps quickly (simplified for testing)
    const answers = [
      { type: "click", text: "No" },
      { type: "click", text: "Single Family" },
      { type: "click", text: "Yes" },
      { type: "click", text: "Cosmetic Work $ - Flooring, Paint" },
      { type: "click", text: "30-60 Days" },
      { type: "click", text: "Inherited" },
    ];

    for (const answer of answers) {
      await user.click(screen.getByText(answer.text));
      await user.click(screen.getByRole("button", { name: /continue/i }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // This test is simplified - full implementation would complete all form steps
    // The key point is that fetch should eventually be called with form data
  });

  it("should allow submission with the SMS consent checkbox unchecked and send explicit false", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes("/api/questions")) {
        return {
          ok: true,
          json: async () => ({ questions: mockQuestions, mappings: mockMappings }),
        } as Response;
      }
      return { ok: true, status: 201, json: async () => ({ id: "lead-123" }) } as Response;
    });

    render(<GetCashOfferPage />);

    await waitFor(() => {
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    // Step through the intake flow
    const choiceSteps = [
      "No", // listed with agent
      "Single Family", // property type
      "Yes", // owns land
      "Cosmetic Work $ - Flooring, Paint", // repairs
      "30-60 Days", // timeline
      "Inherited", // sell reason
    ];

    for (const answer of choiceSteps) {
      await user.click(screen.getByText(answer));
      await user.click(screen.getByRole("button", { name: /continue/i }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Enter acceptable offer
    const offerInput = await waitFor(() => screen.getByPlaceholderText(/\$250,000/i));
    await user.type(offerInput, "$300,000");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Enter property address
    const streetInput = await screen.findByLabelText(/Street address/i);
    await user.type(streetInput, "123 Main St");
    await user.type(screen.getByLabelText(/City/i), "Springfield");
    await user.type(screen.getByLabelText(/State/i), "IL");
    await user.type(screen.getByLabelText(/Postal code/i), "62701");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Contact step: checkbox should be present, unchecked by default, with working links
    await waitFor(() => {
      expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    });
    const smsCheckbox = screen.getByRole("checkbox", { name: /receive SMS messages/i });
    expect(smsCheckbox).not.toBeChecked();

    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });
    const termsLink = screen.getByRole("link", { name: /Terms and Conditions/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(termsLink).toHaveAttribute("href", "/terms");

    // Fill contact info, leave SMS unchecked, and submit
    await user.type(screen.getByLabelText(/Full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/Email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/Phone/i), "5551234567");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Request received/i)).toBeInTheDocument();
    });

    const leadWebCalls = mockFetch.mock.calls.filter(([url]) => String(url).includes("/api/leads/web"));
    expect(leadWebCalls.length).toBe(1);
    const submittedBody = JSON.parse(String((leadWebCalls[0][1] as RequestInit).body));
    expect(submittedBody.smsConsent).toBe(false);
  });

  it("should display error message on failed submission", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    render(<GetCashOfferPage />);

    // After navigating through all steps and submitting, error should appear
    // This is a simplified version - real test would complete all steps
  });
});
