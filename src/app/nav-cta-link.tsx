"use client";

import { useEffect, useState } from "react";

export default function NavCtaLink() {
  const [useWhiteText, setUseWhiteText] = useState(true);

  useEffect(() => {
    const nav = document.getElementById("site-nav");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-section]"));

    if (!nav || sections.length === 0) {
      return;
    }

    const updateColor = () => {
      const navBottom = nav.getBoundingClientRect().bottom;
      const sectionIndex = sections.findIndex((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= navBottom && rect.bottom > navBottom;
      });
      const normalizedIndex = sectionIndex === -1 ? 0 : sectionIndex;
      const nextUseWhiteText = normalizedIndex % 2 === 0;

      setUseWhiteText((previous) =>
        previous === nextUseWhiteText ? previous : nextUseWhiteText,
      );
    };

    updateColor();
    window.addEventListener("scroll", updateColor, { passive: true });
    window.addEventListener("resize", updateColor);

    return () => {
      window.removeEventListener("scroll", updateColor);
      window.removeEventListener("resize", updateColor);
    };
  }, []);

  return (
    <a
      href="/get-cash-offer"
      className={`inline-flex items-center justify-center rounded-lg bg-[var(--color-brand)] px-5 py-3 text-sm font-bold transition hover:brightness-95 sm:px-6 ${
        useWhiteText ? "text-white" : "text-[var(--color-navy)]"
      }`}
    >
      Get Cash Offer
    </a>
  );
}
