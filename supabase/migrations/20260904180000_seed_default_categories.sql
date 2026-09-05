-- Seed default product categories for Phone Store Ormskirk
INSERT INTO public.product_categories (name, slug, description, sort_order)
VALUES
  ('Mobile Phones', 'mobile-phones', 'New, used, and refurbished smartphones', 1),
  ('Phone Cases', 'phone-cases', 'Protective cases, silicone covers, and flip cases', 2),
  ('Screen Protectors', 'screen-protectors', 'Tempered glass and film screen protectors', 3),
  ('Chargers & Cables', 'chargers-cables', 'Fast wall chargers, USB-C, Lightning, and wireless pads', 4),
  ('Audio & Earbuds', 'audio', 'Bluetooth earphones, wired headphones, and speakers', 5),
  ('Holders & Mounts', 'holders-mounts', 'Car mounts, desk stands, and ring holders', 6),
  ('Power Banks', 'power-banks', 'Portable battery packs and external chargers', 7),
  ('General Accessories', 'accessories', 'Adapters, SIM tools, and everyday accessories', 8)
ON CONFLICT (slug) DO NOTHING;
