import { createFileRoute } from "@tanstack/react-router";

const PATHS = [
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
        const origin = new URL(request.url).origin;
        const today = new Date().toISOString().slice(0, 10);
        const urls = PATHS.map(
          (p) =>
            `  <url>\n    <loc>${origin}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
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
