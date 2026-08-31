import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | Phone Shop Ormskirk" },
      {
        name: "description",
        content:
          "What cookies this website sets, why they are used, and how to change your cookie choices for Phone Shop Ormskirk.",
      },
      { property: "og:title", content: "Cookie Policy | Phone Shop Ormskirk" },
      {
        property: "og:description",
        content: "Essential and analytics cookies explained, plus how to change your choice.",
      },
      { property: "og:url", content: "/cookies" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
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
            Cookies are small files stored by your browser. This site keeps them to a minimum and
            nothing non-essential is set until you agree to it.
          </p>

          <div>
            <h2 className="text-base font-bold text-foreground">Essential cookies</h2>
            <p className="mt-2">
              These make the site work — for example remembering your cookie choice so we don't ask
              again on every page. They can't be switched off.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Analytics cookies</h2>
            <p className="mt-2">
              If you choose "Accept all", we may use analytics to understand which pages people find
              useful. This is aggregated and never used to identify you personally. Choosing
              "Essential only" means no analytics cookies are set.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Changing your choice</h2>
            <p className="mt-2">
              Use the button below to clear your stored preference — the cookie banner will then
              appear again so you can choose differently. You can also clear cookies in your browser
              settings at any time.
            </p>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem("pso-cookie-consent");
                window.location.reload();
              }}
              className="press mt-4 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft"
            >
              Reset my cookie choice
            </button>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground">Third-party content</h2>
            <p className="mt-2">
              Our Contact page can embed a Google Map, and links to WhatsApp and Google open on
              those companies' own sites, where their cookie policies apply.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
