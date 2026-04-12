import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import Home from "../page";

describe("Home Page", () => {
  it("should render the hero section with main heading", () => {
    render(<Home />);

    expect(screen.getByText(/Need to sell your house/i)).toBeInTheDocument();
    expect(screen.getByText(/fast/i)).toBeInTheDocument();
  });

  it("should render the hero subtitle", () => {
    render(<Home />);

    expect(
      screen.getByText(/No repairs, no hidden fees, and no waiting game/i),
    ).toBeInTheDocument();
  });

  it("should render CTA button linking to cash offer page", () => {
    render(<Home />);

    const ctaLinks = screen.getAllByText(/Get Your Cash Offer/i);
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  it("should render navigation links", () => {
    render(<Home />);

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Why Us")).toBeInTheDocument();
    expect(screen.getByText("FAQs")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("should render all four benefit cards", () => {
    render(<Home />);

    expect(screen.getByText("Any Condition")).toBeInTheDocument();
    expect(screen.getByText("Close Fast")).toBeInTheDocument();
    expect(screen.getByText("No Hidden Fees")).toBeInTheDocument();
    expect(screen.getByText("Local & Trusted")).toBeInTheDocument();
  });

  it("should render benefit card descriptions", () => {
    render(<Home />);

    expect(
      screen.getByText(/Inherited homes, dated interiors, repairs/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No commissions, no cleanup crews/i),
    ).toBeInTheDocument();
  });

  it("should render all four steps in How It Works section", () => {
    render(<Home />);

    expect(screen.getByText("Tell Us About the Property")).toBeInTheDocument();
    expect(screen.getByText("Get a Cash Offer")).toBeInTheDocument();
    expect(screen.getByText("Pick a Closing Date")).toBeInTheDocument();
    expect(screen.getByText("Close & Move Forward")).toBeInTheDocument();
  });

  it("should render step descriptions", () => {
    render(<Home />);

    expect(
      screen.getByText(/Submit a quick lead form from your phone/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We review the deal and follow up fast/i),
    ).toBeInTheDocument();
  });

  it("should render FAQ section", () => {
    render(<Home />);

    expect(screen.getByText(/Do you buy houses that need repairs/i)).toBeInTheDocument();
    expect(screen.getByText(/How quickly can we close/i)).toBeInTheDocument();
  });

  it("should render FAQ answers", () => {
    render(<Home />);

    expect(
      screen.getByText(/We are set up for as-is purchases/i),
    ).toBeInTheDocument();
  });
});
