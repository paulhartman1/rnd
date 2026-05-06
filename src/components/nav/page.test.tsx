import { render, screen } from "@/test/test-utils";
import { describe, it, expect } from "vitest";
import Nav from "./page";

describe("Navigation", () => {
 it("should render navigation with four primary links", () => {
   render(<Nav />);
   const navElement = screen.getByRole("navigation");
   const primaryLinks = navElement.querySelectorAll("a");
   expect(primaryLinks).toHaveLength(4);
 });

 it("should export the primary links", () => {
  
 })
});
