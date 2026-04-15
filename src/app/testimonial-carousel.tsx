"use client";

import { useState, useEffect } from "react";
import type { Review } from "@/lib/reviews";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export default function TestimonialCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch reviews from API
  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch("/api/reviews");
        if (!response.ok) throw new Error("Failed to load reviews");
        const data = await response.json();
        const reviews: Testimonial[] = (data.reviews as Review[]).map((r) => ({
          quote: r.quote,
          author: r.author,
          role: r.role,
        }));
        setTestimonials(reviews);
      } catch (error) {
        console.error("Error loading reviews:", error);
        // Fallback to empty array if API fails
        setTestimonials([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadReviews();
  }, []);

  useEffect(() => {
    if (isPaused || testimonials.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, testimonials.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  if (isLoading) {
    return (
      <aside className="rounded-[2rem] bg-[linear-gradient(180deg,#fff_0%,#f8f4ea_100%)] p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          What homeowners say
        </p>
        <div className="mt-5 min-h-[180px] flex items-center justify-center">
          <p className="text-sm text-[var(--color-muted)]">Loading testimonials...</p>
        </div>
      </aside>
    );
  }

  if (testimonials.length === 0) {
    return null; // Don't show the carousel if there are no testimonials
  }

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
