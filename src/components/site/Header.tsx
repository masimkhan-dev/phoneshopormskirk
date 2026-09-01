import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";

import logoImg from "@/assets/logo.png";
import { businessQuery } from "@/lib/queries";
import { telUrl, whatsappUrl } from "@/lib/whatsapp";
import { directionsUrl } from "@/lib/format";
import { OpenStatus } from "./OpenStatus";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/repairs", label: "Repairs" },
  { to: "/shop", label: "Shop" },
  { to: "/sell-your-phone", label: "Sell Your Phone" },
  { to: "/unlocking", label: "Unlocking" },
  { to: "/reviews", label: "Reviews" },
  { to: "/contact", label: "Contact" },
] as const;

const TICKER_MESSAGES = [
  "Same-day phone repairs available",
  "Screen repairs while you wait",
  "Buy & sell phones in Ormskirk",
  "Free repair quote on WhatsApp",
  "Accessories available in store",
  "Find us opposite Costa Coffee",
] as const;

const MOBILE_MESSAGES = [
  "Same-day repairs in Ormskirk",
  "Opposite Costa Coffee · Aughton St",
  "Screen repairs while you wait",
  "Free repair quote on WhatsApp",
] as const;

export function Header() {
  const { data: business } = useQuery(businessQuery());
  const [open, setOpen] = useState(false);
  const [mobileIdx, setMobileIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMobileIdx((prev) => (prev + 1) % MOBILE_MESSAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="brand-panel-deep border-b border-white/10 text-on-brand">
        {/* MOBILE (< sm): Clean, single marketing/location highlight — no status badge */}
        <div className="container-page flex items-center justify-center py-1.5 text-center sm:hidden">
          <span className="truncate text-[0.75rem] font-semibold text-on-brand/95">
            {MOBILE_MESSAGES[mobileIdx]}
          </span>
        </div>

        {/* DESKTOP & TABLET (sm:flex): 3-zone layout with Open Status, Ticker, and Address */}
        <div className="container-page hidden items-center justify-between gap-4 py-1.5 text-xs font-medium sm:flex">
          {/* ZONE 1 (LEFT): Opening Status */}
          <div className="shrink-0">
            <OpenStatus tone="brand" />
          </div>

          {/* ZONE 2 (CENTER): Scrolling Promotional Ticker */}
          <div
            className="ticker-fade-mask relative flex-1 min-w-0 overflow-hidden"
            aria-label="Shop highlights and promotions"
          >
            <div className="animate-header-ticker select-none">
              <div className="flex items-center gap-6 pr-6">
                {TICKER_MESSAGES.map((msg, i) => (
                  <span key={i} className="inline-flex items-center gap-6 whitespace-nowrap text-xs font-semibold text-on-brand/90">
                    <span>{msg}</span>
                    <span className="text-on-brand/40 select-none" aria-hidden="true">·</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-6 pr-6" aria-hidden="true">
                {TICKER_MESSAGES.map((msg, i) => (
                  <span key={`dup-${i}`} className="inline-flex items-center gap-6 whitespace-nowrap text-xs font-semibold text-on-brand/90">
                    <span>{msg}</span>
                    <span className="text-on-brand/40 select-none">·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ZONE 3 (RIGHT): Address */}
          <div className="hidden shrink-0 lg:flex items-center">
            <a
              href={directionsUrl(business)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-on-brand hover:underline"
            >
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span>4 Aughton St, Ormskirk L39 3BW</span>
            </a>
          </div>
        </div>
      </div>

      <div className="container-page flex items-center justify-between gap-5 py-4">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <img
            src={logoImg}
            alt="Phone Shop Ormskirk logo"
            width={803}
            height={582}
            className="h-13 w-auto shrink-0 md:h-14"
          />
          <span className="hidden min-w-0 flex-col leading-tight sm:flex lg:hidden xl:flex">
            <span className="truncate text-base font-extrabold tracking-[-0.03em] text-foreground">
              Phone Shop Ormskirk
            </span>
            <span className="hidden truncate text-[0.62rem] font-bold uppercase tracking-[0.2em] text-primary xl:block">
              Repairs · Phones
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary after:scale-x-100" }}
              className="relative whitespace-nowrap px-3 py-2 text-[0.9rem] font-bold tracking-[-0.01em] text-foreground transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[2.5px] after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl(business)}
            target="_blank"
            rel="noopener noreferrer"
            className="press hidden items-center gap-2 whitespace-nowrap rounded-full bg-whatsapp px-5 py-2.5 text-sm font-bold text-whatsapp-foreground shadow-soft sm:inline-flex"
          >
            WhatsApp us
          </a>
          <a
            href={telUrl(business)}
            className="press inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
          >
            <Phone className="size-4" aria-hidden />
            <span className="hidden sm:inline">Call now</span>
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="press inline-flex size-10 items-center justify-center rounded-md border border-input lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="rise-in border-t border-border bg-background lg:hidden"
        >
          <div className="container-page flex flex-col py-2">
            <div className="py-3">
              <OpenStatus />
            </div>
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-primary" }}
                className="border-b border-border/60 py-3 text-sm font-semibold last:border-0"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/faq"
              onClick={() => setOpen(false)}
              activeProps={{ className: "text-primary" }}
              className="border-t border-border/60 py-3 text-sm font-semibold"
            >
              FAQs
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
