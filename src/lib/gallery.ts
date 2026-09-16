import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type GalleryItem = Database["public"]["Tables"]["gallery_items"]["Row"];
export type GalleryItemInsert = Database["public"]["Tables"]["gallery_items"]["Insert"];
export type GalleryItemUpdate = Database["public"]["Tables"]["gallery_items"]["Update"];

export const GALLERY_CATEGORIES = [
  "Shop & Storefront",
  "Repairs",
  "Accessories & Stock",
  "Customer Moments",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

/**
 * Hardcoded initial real shop photos for public fallback when the remote migration is not yet applied.
 * This ensures public uptime and zero layout shift while maintaining Cloudinary + Supabase as authoritative.
 */
export const INITIAL_SEED_GALLERY: GalleryItem[] = [
  {
    id: "seed-1",
    title: "Phone Store Ormskirk Storefront",
    alt_text: "Phone Store Ormskirk storefront at 4 Aughton Street",
    category: "Shop & Storefront",
    image_url: "/gallery/storefront-outside.jpg",
    public_id: null,
    featured: true,
    visible: true,
    sort_order: 1,
    created_by: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
  },
  {
    id: "seed-2",
    title: "Welcome Counter & Service Area",
    alt_text: "Service counter inside Phone Store Ormskirk",
    category: "Shop & Storefront",
    image_url: "/gallery/store-interior-counter.jpg",
    public_id: null,
    featured: true,
    visible: true,
    sort_order: 2,
    created_by: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
  },
  {
    id: "seed-3",
    title: "Phone Cases Wall Collection",
    alt_text: "Phone cases displayed inside Phone Store Ormskirk",
    category: "Accessories & Stock",
    image_url: "/gallery/phone-cases-wall.jpg",
    public_id: null,
    featured: true,
    visible: true,
    sort_order: 3,
    created_by: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
  },
  {
    id: "seed-4",
    title: "Smart & Fashion Watches",
    alt_text: "Smartwatch display inside Phone Store Ormskirk",
    category: "Accessories & Stock",
    image_url: "/gallery/smart-watches-display.jpg",
    public_id: null,
    featured: true,
    visible: true,
    sort_order: 4,
    created_by: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
  },
  {
    id: "seed-5",
    title: "Network SIM Cards & Top-Ups",
    alt_text: "SIM card display inside Phone Store Ormskirk",
    category: "Accessories & Stock",
    image_url: "/gallery/sim-cards-display.jpg",
    public_id: null,
    featured: true,
    visible: true,
    sort_order: 5,
    created_by: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
  },
];

/**
 * Public Query: Visible gallery items with graceful DB migration fallback
 */
export function galleryItemsQuery() {
  return queryOptions({
    queryKey: ["gallery", "public", "items"],
    queryFn: async (): Promise<GalleryItem[]> => {
      try {
        const { data, error } = await supabase
          .from("gallery_items")
          .select("*")
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) {
          console.warn(
            "[Gallery] Remote database query failed, using public fallback:",
            error.message,
          );
          return INITIAL_SEED_GALLERY.filter((item) => item.visible);
        }

        if (!data || data.length === 0) {
          return INITIAL_SEED_GALLERY.filter((item) => item.visible);
        }

        return data as GalleryItem[];
      } catch (err) {
        console.warn("[Gallery] Unexpected error during fetch, using public fallback:", err);
        return INITIAL_SEED_GALLERY.filter((item) => item.visible);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Public Query: Featured homepage items (max 8)
 */
export function featuredGalleryQuery() {
  return queryOptions({
    queryKey: ["gallery", "public", "featured"],
    queryFn: async (): Promise<GalleryItem[]> => {
      try {
        const { data, error } = await supabase
          .from("gallery_items")
          .select("*")
          .eq("visible", true)
          .eq("featured", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) {
          console.warn(
            "[FeaturedGallery] Remote database query failed, using public fallback:",
            error.message,
          );
          return INITIAL_SEED_GALLERY.filter((item) => item.visible && item.featured).slice(0, 8);
        }

        if (!data || data.length === 0) {
          return INITIAL_SEED_GALLERY.filter((item) => item.visible && item.featured).slice(0, 8);
        }

        return data.slice(0, 8) as GalleryItem[];
      } catch (err) {
        console.warn("[FeaturedGallery] Error during fetch, using public fallback:", err);
        return INITIAL_SEED_GALLERY.filter((item) => item.visible && item.featured).slice(0, 8);
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Admin Query: All gallery items for website content management.
 * Throws on error so admin interface surfaces the DB setup warning instead of faking success.
 */
export function adminGalleryQuery() {
  return queryOptions({
    queryKey: ["admin", "gallery", "all"],
    queryFn: async (): Promise<GalleryItem[]> => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as GalleryItem[];
    },
  });
}
