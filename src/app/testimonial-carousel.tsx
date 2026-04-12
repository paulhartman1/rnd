"use client";

import { useState, useEffect } from "react";

const testimonials = [
  {
    quote:
      "Rush N Dush made a stressful sale feel straightforward. The process was fast, the offer was clear, and communication stayed simple the entire way.",
    author: "Sarah M.",
    role: "Inherited Property",
  },
  {
    quote:
      "After dealing with multiple agents and countless showings, Rush N Dush gave us an offer in 24 hours and closed in two weeks. Exactly what we needed during a difficult time.",
    author: "James & Patricia R.",
    role: "Downsizing Homeowners",
  },
  {
    quote:
      "I was worried about selling my house with all the repairs it needed. They took it as-is, no questions asked. The whole process was incredibly simple.",
    author: "Michael T.",
    role: "As-Is Sale",
  },
  {
    quote:
      "We were facing foreclosure and didn't know what to do. Rush N Dush helped us close quickly and move on with our lives. Forever grateful for their professionalism.",
    author: "Linda K.",
    role: "Time-Sensitive Sale",
  },
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <aside
      className="rounded-[2rem] bg-[linear-gradient(180deg,#fff_0%,#f8f4ea_100%)] p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
        What homeowners say
      </p>
      <blockquote className="mt-5 text-lg leading-8 text-[var(--color-navy)] min-h-[180px] flex items-center">
        &ldquo;{currentTestimonial.quote}&rdquo;
      </blockquote>
      <p className="mt-5 text-sm font-bold text-[var(--color-navy)]">
        — {currentTestimonial.author}
      </p>
      <p className="text-xs text-[var(--color-muted)] mt-1">
        {currentTestimonial.role}
      </p>
      <div className="mt-8 flex items-center gap-2">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "bg-[var(--color-accent)] w-6"
                : "bg-black/10 hover:bg-black/20"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
            aria-current={index === currentIndex ? "true" : "false"}
          />
        ))}
      </div>
    </aside>
  );
}
