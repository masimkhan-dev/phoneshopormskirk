import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicSupabase, PRODUCT_SELECT } from "./supabase-public.server";
import type {
  BusinessSettings,
  CustomerReview,
  Faq,
  Product,
  ProductCategory,
  RepairService,
} from "./types";

export const getBusinessSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<BusinessSettings | null> => {
    const { data, error } = await publicSupabase()
      .from("business_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as BusinessSettings | null) ?? null;
  },
);

export const getCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProductCategory[]> => {
    const { data, error } = await publicSupabase()
      .from("product_categories")
      .select("id,name,slug,description,sort_order")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProductCategory[];
  },
);

export const getProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Product[]> => {
    const { data, error } = await publicSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Product[];
  },
);

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }): Promise<Product | null> => {
    const { data: row, error } = await publicSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as unknown as Product | null) ?? null;
  });

export const getRepairServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<RepairService[]> => {
    const { data, error } = await publicSupabase()
      .from("repair_services")
      .select(
        "id,name,slug,category,brand,description,starting_price_pence,icon,featured,sort_order",
      )
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as RepairService[];
  },
);

export const getReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerReview[]> => {
    const { data, error } = await publicSupabase()
      .from("customer_reviews")
      .select("id,author_name,rating,quote,source,reviewed_on,sort_order")
      .eq("public_visible", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomerReview[];
  },
);

export const getFaqs = createServerFn({ method: "GET" }).handler(
  async (): Promise<Faq[]> => {
    const { data, error } = await publicSupabase()
      .from("faqs")
      .select("id,question,answer,topic,sort_order")
      .eq("public_visible", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as Faq[];
  },
);

export const submitEnquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(["REPAIR_QUOTE", "SELL_PHONE", "PRODUCT", "GENERAL"]),
        name: z.string().trim().min(1).max(100),
        phone: z.string().trim().min(5).max(30),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        message: z.string().trim().max(2000).optional().or(z.literal("")),
        metadata: z.record(z.string(), z.string()).optional(),
        website: z.string().max(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };
    const { error } = await publicSupabase()
      .from("website_enquiries")
      .insert({
        type: data.type,
        name: data.name,
        phone: data.phone,
        email: data.email ? data.email : null,
        message: data.message ? data.message : null,
        metadata: data.metadata ?? {},
        status: "NEW",
      });
    if (error) {
      console.error("enquiry insert failed", error.message);
      throw new Error("ENQUIRY_FAILED");
    }
    return { ok: true as const };
  });
