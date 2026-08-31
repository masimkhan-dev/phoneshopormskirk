import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

import logoImg from "@/assets/logo.png";
import { businessQuery } from "@/lib/queries";
import { directionsUrl, fullAddress, sortedHours, todayName } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { OpenStatus } from "./OpenStatus";

export function Footer() {
  const { data: business } = useQuery(businessQuery());
  const hours = sortedHours(business?.opening_hours);
  const socials = Object.entries(business?.social_links ?? {});
  const payments = business?.payment_methods ?? [];
  const today = todayName();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  // The homepage closes with its own full-width conversion block, so skip this strip there.
  const showCtaStrip = pathname !== "/";

  return (
    <footer className="bg-ink text-white/80">
      {showCtaStrip ? (
      <div className="brand-panel">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-10">
          <div>
            <p className="display-3 font-extrabold">Need a repair?</p>
            <p className="mt-2 text-sm text-on-brand/85">
              Message us with your device and fault and we'll come straight back with a price.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex rounded-full bg-whatsapp px-6 py-3.5 text-sm font-bold text-whatsapp-foreground shadow-lift"
            >
              WhatsApp us
            </a>
            <a
              href={telUrl(business)}
              className="press inline-flex rounded-full bg-background px-6 py-3.5 text-sm font-bold text-primary shadow-lift"
            >
              Call the shop
            </a>
            <a
              href={directionsUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-full border border-on-brand/35 px-6 py-3.5 text-sm font-bold text-on-brand hover:bg-on-brand/10"
            >
              <MapPin className="size-4" aria-hidden />
              Get directions
            </a>
          </div>
        </div>
      </div>
      ) : null}

      <div className="container-page grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Phone Shop Ormskirk logo"
              width={803}
              height={582}
              loading="lazy"
              className="h-14 w-auto rounded-lg bg-white/95 p-1.5"
            />
            <span className="text-lg font-extrabold tracking-tight text-white">
              Phone Shop Ormskirk
            </span>
          </div>

          <p className="mt-3 text-sm">
            {business?.tagline ?? "Repairs, phones and accessories in Ormskirk"}
          </p>
          <div className="mt-4">
            <OpenStatus tone="brand" />
          </div>
          {socials.length > 0 ? (
            <div className="mt-5 flex gap-4 text-sm">
              {socials.map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="capitalize underline-offset-4 hover:text-white hover:underline"
                >
                  {name}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { to: "/repairs", label: "Repair Price Guide" },
              { to: "/shop", label: "Phones & Accessories" },
              { to: "/sell-your-phone", label: "Sell / Trade In" },
              { to: "/unlocking", label: "Phone Unlocking" },
              { to: "/reviews", label: "Reviews" },
              { to: "/faq", label: "FAQs" },
              { to: "/phone-repair-ormskirk", label: "Phone Repair in Ormskirk" },
              { to: "/about", label: "About Us" },
              { to: "/contact", label: "Contact & Find Us" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">
            Opening hours
          </h2>
          <ul className="mt-4 space-y-1.5 text-sm">
            {hours.map((h) => (
              <li
                key={h.day}
                className={`flex justify-between gap-4 ${h.day === today ? "font-bold text-white" : ""}`}
              >
                <span>{h.day}</span>
                <span>{h.open && h.close ? `${h.open} – ${h.close}` : "Closed"}</span>
              </li>
            ))}
            {hours.length === 0 ? <li>Opening hours to be confirmed</li> : null}
          </ul>
          {payments.length > 0 ? (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white">
                <CreditCard className="size-3.5 text-primary" aria-hidden />
                Payments accepted
              </h3>
              <p className="mt-2 text-sm">{payments.join(" · ")}</p>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Get in touch</h2>
          {/* NAP block — keep this wording identical across directories and listings. */}
          <address className="mt-4 not-italic text-sm leading-relaxed">
            <span className="block font-bold text-white">Phone Shop Ormskirk</span>
            <span className="block">4 Aughton St, Ormskirk, Lancashire L39 3BW</span>
            <span className="block">
              Phone:{" "}
              <a href="tel:+447496499992" className="hover:text-white">
                +44 7496 499992
              </a>
            </span>
            <span className="block">
              WhatsApp:{" "}
              <a
                href="https://wa.me/447496499992"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                wa.me/447496499992
              </a>
            </span>
          </address>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a
                href={directionsUrl(business)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Get directions to {fullAddress(business) || "Ormskirk, United Kingdom"}
              </a>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a href={telUrl(business)} className="hover:text-white">
                {business?.phone ?? "Phone number to be confirmed"}
              </a>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <a href={`mailto:${business?.email ?? ""}`} className="hover:text-white">
                {business?.email ?? "Email to be confirmed"}
              </a>
            </li>
          </ul>
          <a
            href={whatsappUrl(business)}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-5 inline-flex rounded-md bg-whatsapp px-4 py-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            Message on WhatsApp
          </a>
          {business?.warranty_policy ? (
            <p className="mt-5 flex gap-2 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{business.warranty_policy}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Phone Shop Ormskirk. All rights reserved.</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/cookies" className="hover:text-white">
              Cookie Policy
            </Link>
            <Link to="/terms" className="hover:text-white">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
