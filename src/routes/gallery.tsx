import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, Maximize2, MapPin, X, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Reveal } from "@/components/site/Reveal";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";
import {
  GALLERY_CATEGORIES,
  galleryItemsQuery,
  type GalleryCategory,
  type GalleryItem,
} from "@/lib/gallery";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Phone Shop Ormskirk Gallery | Repairs & Store" },
      {
        name: "description",
        content:
          "See photos from Phone Store Ormskirk including repairs accessories products and our shop at 4 Aughton St.",
      },
      {
        property: "og:title",
        content: "Phone Shop Ormskirk Gallery | Repairs & Store",
      },
      {
        property: "og:description",
        content:
          "See photos from Phone Store Ormskirk including repairs accessories products and our shop at 4 Aughton St.",
      },
      { property: "og:url", content: "https://www.phonestoreormskirk.co.uk/gallery" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phonestoreormskirk.co.uk/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { data: items = [] } = useQuery(galleryItemsQuery());
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  // Focus management references
  const triggerRefMap = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveTriggerId = useRef<string | null>(null);

  // Touch swipe coordinates for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Compute available categories: only include categories that have at least 1 visible item
  const availableCategories = useMemo(() => {
    const categoriesWithItems = new Set<string>();
    for (const item of items) {
      if (item.category) {
        categoriesWithItems.add(item.category);
      }
    }
    const list: string[] = ["All"];
    for (const cat of GALLERY_CATEGORIES) {
      if (categoriesWithItems.has(cat)) {
        list.push(cat);
      }
    }
    return list;
  }, [items]);

  // Filter items according to active tab
  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const activeItem = activeLightboxIndex !== null ? filteredItems[activeLightboxIndex] : null;

  // Open Lightbox
  const openLightbox = (index: number, itemId: string) => {
    lastActiveTriggerId.current = itemId;
    setActiveLightboxIndex(index);
  };

  // Close Lightbox & restore focus
  const closeLightbox = useCallback(() => {
    setActiveLightboxIndex(null);
    if (lastActiveTriggerId.current) {
      const el = triggerRefMap.current.get(lastActiveTriggerId.current);
      if (el) {
        setTimeout(() => el.focus(), 50);
      }
    }
  }, []);

  const showPrev = useCallback(() => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : filteredItems.length - 1));
  }, [activeLightboxIndex, filteredItems.length]);

  const showNext = useCallback(() => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((prev) => (prev! < filteredItems.length - 1 ? prev! + 1 : 0));
  }, [activeLightboxIndex, filteredItems.length]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (activeLightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        showNext();
      } else if (e.key === "Tab") {
        // Focus trap inside lightbox
        if (!lightboxRef.current) return;
        const focusableElements = lightboxRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!firstElement || !lastElement) return;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    // Auto-focus close button
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeLightboxIndex, closeLightbox, showPrev, showNext]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) touchStartX.current = touch.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) touchEndX.current = touch.clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(distance) > 50;

    if (isSwipe) {
      if (distance > 0) {
        // Swiped left -> show next
        showNext();
      } else {
        // Swiped right -> show prev
        showPrev();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <>
      {/* Editorial Header */}
      <section className="brand-panel relative isolate overflow-hidden">
        <span className="deco-lines" aria-hidden />
        <span className="deco-arc -right-40 -top-52 size-[34rem] md:-right-24" aria-hidden />
        <div className="container-page relative py-12 md:py-16">
          <div className="max-w-2xl">
            <span className="eyebrow-on-brand flex items-center gap-2">
              <MapPin className="size-3.5 text-on-brand/90" aria-hidden />4 Aughton St · Ormskirk
            </span>
            <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold tracking-[-0.03em] leading-tight text-on-brand">
              Inside Phone Store Ormskirk
            </h1>
            <p className="lede mt-4 max-w-xl text-on-brand/85 leading-relaxed">
              Take a look inside our Ormskirk shop. From our Aughton Street storefront and customer
              service counter to repair benches and hundreds of accessories in stock.
            </p>
          </div>
        </div>
      </section>

      {/* Main Gallery Section */}
      <section className="section-home bg-surface/30 min-h-[60vh]">
        <div className="container-page">
          {/* Dynamic Category Filter Pills */}
          {availableCategories.length > 1 && (
            <Reveal className="flex flex-wrap items-center gap-2 pb-6 md:pb-8 border-b border-border/70">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
                Filter:
              </span>
              {availableCategories.map((category) => {
                const isActive = selectedCategory === category;
                const count =
                  category === "All"
                    ? items.length
                    : items.filter((i) => i.category === category).length;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`press inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border/80 bg-card text-foreground hover:border-primary/50"
                    }`}
                    aria-pressed={isActive}
                  >
                    <span>{category}</span>
                    <span
                      className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </Reveal>
          )}

          {/* Grid of Images */}
          {filteredItems.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item, index) => (
                <Reveal key={item.id} delay={index * 50} className="h-full">
                  <button
                    ref={(el) => {
                      if (el) triggerRefMap.current.set(item.id, el);
                      else triggerRefMap.current.delete(item.id);
                    }}
                    type="button"
                    onClick={() => openLightbox(index, item.id)}
                    className="card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/85 bg-card text-left shadow-2xs transition-all hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none w-full"
                    aria-label={`Open photo in lightbox: ${item.title}`}
                  >
                    {/* Image Aspect Box */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                      <img
                        src={getCloudinaryImageUrl(item.image_url, "GALLERY")}
                        alt={item.alt_text}
                        width={600}
                        height={750}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />

                      {/* Category Badge */}
                      <div className="absolute top-3.5 left-3.5">
                        <span className="inline-flex rounded-md bg-background/90 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground shadow-2xs backdrop-blur-xs">
                          {item.category}
                        </span>
                      </div>

                      {/* Fullscreen Hint Icon */}
                      <div className="absolute bottom-3.5 right-3.5 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-2xs backdrop-blur-xs transition-opacity group-hover:opacity-100">
                        <Maximize2 className="size-4" aria-hidden />
                      </div>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-4 sm:p-5">
                      <h2 className="text-base font-extrabold text-foreground tracking-[-0.01em] line-clamp-1 group-hover:text-primary transition-colors">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.alt_text}
                      </p>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-2xl border border-dashed border-border/80 bg-card p-10 text-center max-w-md mx-auto">
              <Camera className="mx-auto size-10 text-muted-foreground/60" aria-hidden />
              <h3 className="mt-4 text-base font-extrabold text-foreground">
                No photos in this category yet
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Please select another category or check back soon.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className="press mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-2xs"
              >
                View all photos
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Accessible Fullscreen Lightbox Modal */}
      {activeItem && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo details: ${activeItem.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all p-4 sm:p-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar: Counter & Close Button */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-xs">
                {activeLightboxIndex! + 1} / {filteredItems.length}
              </span>
              <span className="hidden sm:inline-block text-xs font-medium text-white/70">
                {activeItem.category}
              </span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              aria-label="Close photo preview"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {/* Left Arrow Button */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={showPrev}
              className="press absolute left-3 sm:left-6 z-10 hidden sm:flex size-12 items-center justify-center rounded-full bg-white/15 text-white shadow-lift hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
          )}

          {/* Center Image Container */}
          <div className="relative flex max-h-[85vh] max-w-4xl flex-col items-center justify-center overflow-hidden rounded-2xl">
            <img
              src={getCloudinaryImageUrl(activeItem.image_url, "DETAIL")}
              alt={activeItem.alt_text}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lift"
              loading="eager"
              decoding="async"
            />
            {/* Caption bar */}
            <div className="mt-3 text-center px-4">
              <p className="text-base font-extrabold text-white">{activeItem.title}</p>
              <p className="mt-1 text-xs text-white/75 max-w-xl">{activeItem.alt_text}</p>
            </div>
          </div>

          {/* Right Arrow Button */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={showNext}
              className="press absolute right-3 sm:right-6 z-10 hidden sm:flex size-12 items-center justify-center rounded-full bg-white/15 text-white shadow-lift hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              aria-label="Next photo"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          )}

          {/* Mobile bottom navigation bar */}
          {filteredItems.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex sm:hidden items-center justify-center gap-4">
              <button
                type="button"
                onClick={showPrev}
                className="press flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <span className="text-xs font-semibold text-white">
                {activeLightboxIndex! + 1} of {filteredItems.length}
              </span>
              <button
                type="button"
                onClick={showNext}
                className="press flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
                aria-label="Next photo"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
