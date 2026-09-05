import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "What cookies this website uses for Phone Shop Ormskirk. We only use essential cookies and zero tracking cookies.",
      },
      { property: "og:title", content: "Cookie Policy | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Essential cookies explained for Phone Shop Ormskirk.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/cookies" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/cookies" }],
  }),
  component: CookiePage,
});

function CookiePage() {
  return (
    <>
      <section className="brand-panel">
        <div className="container-page py-12 md:py-16">
          <div className="flex items-center gap-2">
            <span className="eyebrow-on-brand">Transparency</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-on-brand backdrop-blur-sm">
              Zero Ad Tracking
            </span>
          </div>
          <h1 className="display-1 mt-4 text-balance">Cookie Policy</h1>
          <p className="mt-3 max-w-xl text-sm text-on-brand/85 sm:text-base">
            What cookies and storage items are used on phonestoreormskirk.co.uk and why.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-background">
        <div className="container-page max-w-3xl">
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-soft space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              Cookies and local storage items are small pieces of data saved by your browser. Phone
              Shop Ormskirk uses them strictly to make our website work securely and reliably.
            </p>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">
                Essential cookies &amp; storage
              </h2>
              <p className="mt-2">
                These are necessary for core functionality — such as remembering that you have
                dismissed the cookie notice, storing secure authentication sessions for authorised
                staff, and maintaining layout preferences. Because they are essential to provide the
                service, they cannot be switched off.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">
                No tracking or advertising cookies
              </h2>
              <p className="mt-2">
                We do not use third-party analytics trackers, marketing pixels, or advertising
                cookies. We do not track your activity across other websites or sell your browsing
                data.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-base font-bold text-foreground">Third-party content</h2>
              <p className="mt-2">
                Our Contact page can display a Google Map, and links to WhatsApp or Google open
                directly on those third-party services, where their own privacy and cookie policies
                apply.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
