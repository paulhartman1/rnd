"use client";

import { useCallback, useRef, useState } from "react";

interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

interface HowItWorksCarouselProps {
  steps: HowItWorksStep[];
}

const CARD_GAP = 16;

export default function HowItWorksCarousel({ steps }: HowItWorksCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getCardWidth = (el: HTMLElement) => el.clientWidth * 0.85;

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const stepWidth = getCardWidth(el) + CARD_GAP;
    const index = Math.round(el.scrollLeft / stepWidth);
    setActiveIndex((previous) =>
      Math.min(Math.max(index, 0), steps.length - 1) === previous
        ? previous
        : Math.min(Math.max(index, 0), steps.length - 1),
    );
  }, [steps.length]);

  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({
      left: index * (getCardWidth(el) + CARD_GAP),
      behavior: "smooth",
    });
  };

  return (
    <div className="mt-10">
      <div className="mx-[-1rem] sm:mx-0">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pl-[7.5vw] pr-[7.5vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:snap-none sm:overflow-visible sm:pb-0 sm:pl-0 sm:pr-0 xl:grid-cols-4"
        >
          {steps.map((step) => (
            <article
              key={step.number}
              className="w-[85vw] flex-shrink-0 snap-center rounded-[1.75rem] border border-white/10 bg-white/6 p-6 sm:w-auto"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-black text-[var(--color-navy)]">
                {step.number}
              </div>
              <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/72">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 sm:hidden" role="group" aria-label="Step navigation">
        {steps.map((step, index) => (
          <button
            key={step.number}
            onClick={() => scrollToIndex(index)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-6 bg-[var(--color-brand)]"
                : "bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to step ${step.number}: ${step.title}`}
            aria-current={index === activeIndex ? "true" : "false"}
          />
        ))}
      </div>
    </div>
  );
}