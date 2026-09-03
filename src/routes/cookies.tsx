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
        <div className="container-page py-14 md:py-16">
          <span className="eyebrow-on-brand">Legal</span>
          <h1 className="display-1 mt-4">Cookie Policy</h1>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page max-w-3xl space-y-8 text-sm leading-relaxed text-muted-foreground">
          <p>
            Cookies and local storage items are small pieces of data saved by your browser. Phone
            Shop Ormskirk uses them strictly to make our website work securely and reliably.
          </p>

          <div>
            <h2 className="text-base font-bold text-foreground">Essential cookies & storage</h2>
            <p className="mt-2">
              These are necessary for core functionality — such as remembering that you have
              dismissed the cookie notice, storing secure authentication sessions for authorised
              staff, and maintaining layout preferences. Because they are essential to provide the
              service, they cannot be switched off.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">No tracking or advertising cookies</h2>
            <p className="mt-2">
              We do not use third-party analytics trackers, marketing pixels, or advertising
              cookies. We do not track your activity across other websites or sell your browsing data.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Third-party content</h2>
            <p className="mt-2">
              Our Contact page can display a Google Map, and links to WhatsApp or Google open
              directly on those third-party services, where their own privacy and cookie policies
              apply.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
