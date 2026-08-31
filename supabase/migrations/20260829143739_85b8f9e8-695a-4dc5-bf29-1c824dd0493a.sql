ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS warranty_policy TEXT,
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offer_banner_text TEXT,
  ADD COLUMN IF NOT EXISTS offer_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS offer_banner_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS google_review_write_url TEXT,
  ADD COLUMN IF NOT EXISTS storefront_image_url TEXT,
  ADD COLUMN IF NOT EXISTS storefront_interior_image_url TEXT;

CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL,
  rating SMALLINT,
  quote TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'GOOGLE',
  reviewed_on DATE,
  public_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_reviews TO anon;
GRANT SELECT ON public.customer_reviews TO authenticated;
GRANT ALL ON public.customer_reviews TO service_role;

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible reviews" ON public.customer_reviews;
CREATE POLICY "Public can read visible reviews"
  ON public.customer_reviews FOR SELECT
  TO anon, authenticated
  USING (public_visible = true);

CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'GENERAL',
  public_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faqs TO anon;
GRANT SELECT ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible faqs" ON public.faqs;
CREATE POLICY "Public can read visible faqs"
  ON public.faqs FOR SELECT
  TO anon, authenticated
  USING (public_visible = true);

INSERT INTO public.faqs (question, answer, topic, sort_order) VALUES
('How do I get a repair price?', 'Send us your device model and what has gone wrong on WhatsApp, or call the shop. We will give you a price based on the parts needed. If the fault needs a closer look, we confirm the final price once we have inspected the device in store.', 'REPAIRS', 10),
('Are the prices on the site final?', 'The prices shown are guide prices and start from the amounts listed. The exact price depends on the model, the parts required and what we find on inspection. We always confirm the price with you before starting any work.', 'QUOTES', 20),
('How long does a repair take?', 'It depends on the repair and whether the part is in stock. Common repairs are usually quicker than board-level work. Message us with your model first and we will tell you realistically how long yours will take and whether the part is available.', 'REPAIRS', 30),
('Do I need an appointment?', 'No, you are welcome to walk in during opening hours. It helps to message or call first so we can check we have the right part for your device before you travel.', 'REPAIRS', 40),
('Is my data safe during a repair?', 'We only access what is needed to test the device and confirm the repair worked. We recommend backing up your phone before any repair, and removing your screen lock is not required unless testing needs it. If you are selling or trading in a device, we can wipe it in front of you.', 'DATA', 50),
('How do I pay?', 'Payment is taken in store when you collect your device or buy a product. Ask us which payment methods we currently accept when you visit or message us.', 'PAYMENT', 60),
('Do repairs come with a guarantee?', 'Ask us directly about the guarantee that applies to your specific repair before you book it in. Cover varies by repair type and by part, so we would rather tell you exactly what applies to your device than make a blanket promise.', 'WARRANTY', 70),
('Can you unlock my phone to another network?', 'In many cases yes. Send us the make, model and current network on WhatsApp and we will tell you whether it can be done, what it costs and what we need from you.', 'UNLOCKING', 80),
('Do you buy phones that are broken?', 'We look at working and faulty handsets. Send the model, storage, condition and network and we will give you an estimate before you travel in.', 'SELLING', 90),
('What if the phone I want is out of stock?', 'Message us. Stock changes weekly, and we can tell you when something similar is coming in or source it for you where possible.', 'PRODUCTS', 100)
ON CONFLICT DO NOTHING;