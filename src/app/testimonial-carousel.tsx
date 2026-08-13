"use client";

import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
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

    // Calculate duration based on word count: 1 second per 3 words
    const currentTestimonial = testimonials[currentIndex];
    const wordCount = currentTestimonial.quote.split(/\s+/).length;
    const duration = Math.max(3000, Math.ceil(wordCount / 3) * 1000); // Minimum 3 seconds

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, duration);

    return () => clearInterval(interval);
  }, [isPaused, testimonials, currentIndex]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToPrev = () => {
    goToSlide((currentIndex - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % testimonials.length);
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
      className="group relative rounded-[2rem] bg-[linear-gradient(180deg,#fff_0%,#f8f4ea_100%)] p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <button
        type="button"
        onClick={goToPrev}
        className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2.5 text-[var(--color-navy)] shadow-md transition hover:bg-white lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
        aria-label="Previous testimonial"
      >
        <FaChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={goToNext}
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2.5 text-[var(--color-navy)] shadow-md transition hover:bg-white lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
        aria-label="Next testimonial"
      >
        <FaChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
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
                ? "w-6 bg-[var(--color-accent)]"
                : "bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)]/70"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
            aria-current={index === currentIndex ? "true" : "false"}
          />
        ))}
      </div>
    </aside>
  );
}
