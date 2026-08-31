import { createClient } from "@supabase/supabase-js";

/**
 * Read-only Supabase client for public website data.
 * Uses the publishable key, so RLS applies as the anonymous role.
 */
export function publicSupabase() {
  return createClient(
    process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

export const PRODUCT_SELECT =
  "id,name,slug,category_id,short_description,description,price_pence,brand,model,condition,storage,colour,availability,specs,featured,sort_order,product_images(id,url,alt_text,sort_order),product_categories(name,slug)";
