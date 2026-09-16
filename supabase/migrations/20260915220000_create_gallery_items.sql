-- Migration: Create gallery_items table with RLS (Production Clean - No Hardcoded Seeds)

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  alt_text TEXT NOT NULL,

  category TEXT NOT NULL CHECK (
    category IN (
      'Shop & Storefront',
      'Repairs',
      'Accessories & Stock',
      'Customer Moments'
    )
  ),

  image_url TEXT NOT NULL,
  public_id TEXT,

  featured BOOLEAN NOT NULL DEFAULT true,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;

-- Row Level Security
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible gallery items"
ON public.gallery_items;

CREATE POLICY "Public can read visible gallery items"
ON public.gallery_items
FOR SELECT
TO anon, authenticated
USING (visible = true);

DROP POLICY IF EXISTS "Staff manage gallery items"
ON public.gallery_items;

CREATE POLICY "Staff manage gallery items"
ON public.gallery_items
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Updated_at trigger
DROP TRIGGER IF EXISTS gallery_items_updated
ON public.gallery_items;

CREATE TRIGGER gallery_items_updated
BEFORE UPDATE ON public.gallery_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Performance indexes
CREATE INDEX IF NOT EXISTS gallery_items_visible_sort_idx
ON public.gallery_items (visible, featured, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS gallery_items_category_idx
ON public.gallery_items (category);
