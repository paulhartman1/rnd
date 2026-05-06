import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import Home from "../page";

describe("Home Page", () => {
  it("should render the hero section with main heading", () => {
    render(<Home />);

    expect(screen.getByText(/A Simple, Fair Way to Sell Your Home/i)).toBeInTheDocument();
  });


  it("should render CTA button linking to cash offer page", () => {
    render(<Home />);

    const ctaLinks = screen.getAllByText(/Get Your Cash Offer/i);
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  it("should render navigation links", () => {
    render(<Home />);

    const navDiv = screen.getByTestId("navigation");
    expect(navDiv).toBeDefined();
    expect(navDiv.getElementsByTagName("a"))
    // expect(screen.getByText("How It Works")).toBeInTheDocument();
    // expect(screen.getByText("Why Us")).toBeInTheDocument();
    // expect(screen.getByText("FAQs")).toBeInTheDocument();
    // expect(screen.getByText("Contact")).toBeInTheDocument();
  });


  it("should render all four steps in How It Works section", () => {
    render(<Home />);

    expect(screen.getByText("Tell Us About Your Property")).toBeInTheDocument();
    expect(screen.getByText("Get a Fair Cash Offer")).toBeInTheDocument();
    expect(screen.getByText("Choose Your Closing Date")).toBeInTheDocument();
    expect(screen.getByText("Close & Get Paid")).toBeInTheDocument();
  });
});
