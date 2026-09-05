-- Add public_id column to public.product_images for Cloudinary asset tracking
ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS public_id text;
