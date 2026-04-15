"use client";

import { useState } from "react";
import type { Review } from "@/lib/reviews";

interface ReviewsClientProps {
  initialReviews: Review[];
}

export default function ReviewsClient({ initialReviews }: ReviewsClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quote: "",
    author: "",
    role: "",
    display_order: reviews.length + 1,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeReviews = reviews.filter((r) => !r.deleted_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingId) {
        // Update existing review
        const response = await fetch(`/api/admin/reviews/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to update review");

        const { review } = await response.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === editingId ? review : r))
        );
        setEditingId(null);
      } else {
        // Create new review
        const response = await fetch("/api/admin/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to create review");

        const { review } = await response.json();
        setReviews((prev) => [...prev, review]);
        setIsAddingNew(false);
      }

      // Reset form
      setFormData({
        quote: "",
        author: "",
        role: "",
        display_order: reviews.length + 2,
        is_active: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (review: Review) => {
    setFormData({
      quote: review.quote,
      author: review.author,
      role: review.role,
      display_order: review.display_order,
      is_active: review.is_active,
    });
    setEditingId(review.id);
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete review");

      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, deleted_at: new Date().toISOString() } : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted_at: null }),
      });

      if (!response.ok) throw new Error("Failed to restore review");

      const { review } = await response.json();
      setReviews((prev) => prev.map((r) => (r.id === id ? review : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore review");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!response.ok) throw new Error("Failed to update review");

      const { review } = await response.json();
      setReviews((prev) => prev.map((r) => (r.id === id ? review : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update review");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setFormData({
      quote: "",
      author: "",
      role: "",
      display_order: reviews.length + 1,
      is_active: true,
    });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add New Button */}
      {!isAddingNew && !editingId && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-navy)] transition hover:brightness-95"
        >
          + Add New Review
        </button>
      )}

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <form
          onSubmit={handleSubmit}
          className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
        >
          <h2 className="text-xl font-bold text-[var(--color-navy)]">
            {editingId ? "Edit Review" : "Add New Review"}
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-muted)]">
                Quote (you can copy/paste from anywhere)
              </label>
              <textarea
                value={formData.quote}
                onChange={(e) =>
                  setFormData({ ...formData, quote: e.target.value })
                }
                rows={4}
                required
                className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-sm text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                placeholder="Paste or type the testimonial quote here..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-muted)]">
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-sm text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                  placeholder="e.g., Sarah M."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-muted)]">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-sm text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                  placeholder="e.g., Inherited Property"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-muted)]">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-sm text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-muted)]">
                  Status
                </label>
                <select
                  value={formData.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_active: e.target.value === "active",
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-4 py-3 text-sm text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-navy)] transition hover:brightness-95 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update Review" : "Add Review"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-black/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-navy)]">
          All Reviews ({activeReviews.length} active)
        </h2>
        {reviews.length === 0 ? (
          <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 text-center text-sm text-[var(--color-muted)]">
            No reviews yet. Add your first testimonial above.
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={`rounded-[1.4rem] border p-6 ${
                review.deleted_at
                  ? "border-red-200 bg-red-50/50 opacity-60"
                  : "border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                      #{review.display_order}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        review.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {review.is_active ? "Active" : "Inactive"}
                    </span>
                    {review.deleted_at && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        Deleted
                      </span>
                    )}
                  </div>
                  <blockquote className="mt-4 text-base leading-7 text-[var(--color-navy)]">
                    &ldquo;{review.quote}&rdquo;
                  </blockquote>
                  <p className="mt-3 text-sm font-bold text-[var(--color-navy)]">
                    — {review.author}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {review.role}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                {!review.deleted_at ? (
                  <>
                    <button
                      onClick={() => handleEdit(review)}
                      className="text-sm font-semibold text-[var(--color-accent)] underline decoration-[var(--color-accent)] underline-offset-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(review.id, !review.is_active)}
                      className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-4"
                    >
                      {review.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-sm font-semibold text-red-600 underline decoration-red-600 underline-offset-4"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestore(review.id)}
                    className="text-sm font-semibold text-green-600 underline decoration-green-600 underline-offset-4"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
