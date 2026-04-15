export interface Review {
  id: string;
  quote: string;
  author: string;
  role: string;
  is_active: boolean;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewInsert = Omit<Review, "id" | "created_at" | "updated_at" | "deleted_at"> & {
  deleted_at?: string | null;
};

export type ReviewUpdate = Partial<ReviewInsert>;
