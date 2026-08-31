export type OpeningHour = {
  day: string;
  open: string | null;
  close: string | null;
};

export type BusinessSettings = {
  id: string;
  business_name: string;
  tagline: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  opening_hours: OpeningHour[];
  google_maps_url: string | null;
  google_maps_embed_url: string | null;
  google_reviews_url: string | null;
  google_review_write_url: string | null;
  google_directions_url: string | null;
  social_links: Record<string, string>;
  warranty_policy: string | null;
  payment_methods: string[];
  offer_banner_text: string | null;
  offer_banner_url: string | null;
  offer_banner_active: boolean;
  latitude: number | null;
  longitude: number | null;
  storefront_image_url: string | null;
  storefront_interior_image_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  logo_url: string | null;
  timezone: string | null;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  price_pence: number | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  storage: string | null;
  colour: string | null;
  availability: string;
  specs: Record<string, string>;
  featured: boolean;
  sort_order: number;
  created_at?: string;
  product_images: ProductImage[];
  product_categories: { name: string; slug: string } | null;
};

export type RepairService = {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string | null;
  description: string | null;
  starting_price_pence: number | null;
  icon: string | null;
  featured: boolean;
  sort_order: number;
};

export type CustomerReview = {
  id: string;
  author_name: string;
  rating: number | null;
  quote: string;
  source: string;
  reviewed_on: string | null;
  sort_order: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  topic: string;
  sort_order: number;
};

export type EnquiryType = "REPAIR_QUOTE" | "SELL_PHONE" | "PRODUCT" | "GENERAL";
