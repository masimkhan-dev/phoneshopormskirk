import { createFileRoute } from "@tanstack/react-router";

import { publicSupabase } from "@/lib/supabase-public.server";

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/repairs", priority: "0.9", changefreq: "weekly" },
  { path: "/phone-repair-ormskirk", priority: "0.9", changefreq: "monthly" },
  { path: "/sell-your-phone", priority: "0.9", changefreq: "weekly" },
  { path: "/shop", priority: "0.8", changefreq: "daily" },
  { path: "/unlocking", priority: "0.7", changefreq: "monthly" },
  { path: "/reviews", priority: "0.6", changefreq: "weekly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const reqOrigin = new URL(request.url).origin;
        const origin = reqOrigin.includes("localhost")
          ? reqOrigin
          : "https://www.phonestoreormskirk.co.uk";
        const today = new Date().toISOString().slice(0, 10);

        // Fetch public product slugs — same RLS as the public site.
        // Only include products with a valid slug (non-empty string).
        let productEntries: {
          path: string;
          priority: string;
          changefreq: string;
          lastmod: string;
        }[] = [];
        try {
          const { data: products } = await publicSupabase()
            .from("products")
            .select("slug,updated_at")
            .eq("public_visible", true)
            .eq("active", true)
            .order("sort_order");

          if (products) {
            productEntries = products
              .filter((p) => typeof p.slug === "string" && p.slug.trim().length > 0)
              .map((p) => ({
                path: `/shop/${p.slug}`,
                priority: "0.7",
                changefreq: "weekly",
                // Use real updated_at when available; fall back to today.
                lastmod:
                  typeof p.updated_at === "string" && p.updated_at.length >= 10
                    ? p.updated_at.slice(0, 10)
                    : today,
              }));
          }
        } catch {
          // If the product fetch fails, serve the static sitemap without products.
        }

        const staticUrls = STATIC_PATHS.map(
          (p) =>
            `  <url>\n    <loc>${origin}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
        ).join("\n");

        const productUrls = productEntries
          .map(
            (p) =>
              `  <url>\n    <loc>${origin}${p.path}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
          )
          .join("\n");

        const allUrls = [staticUrls, productUrls].filter(Boolean).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls}\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
