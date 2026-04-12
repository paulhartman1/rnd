import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { renderWithProviders as render };
