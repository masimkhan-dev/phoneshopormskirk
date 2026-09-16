-- Migration: 20260916090000_optimize_critical_query_indexes.sql
-- Description: Indexes proven critical query paths for free-tier performance:
-- 1. product_images(product_id, sort_order) - speeds up gallery and product cards ordered image joins
-- 2. repair_invoices(customer_id, created_at DESC) - speeds up customer history lookups in admin

CREATE INDEX IF NOT EXISTS idx_product_images_product_sort
  ON public.product_images (product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_repair_invoices_customer_created
  ON public.repair_invoices (customer_id, created_at DESC);
