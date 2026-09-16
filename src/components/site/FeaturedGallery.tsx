import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Reveal } from "@/components/site/Reveal";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";
import { GALLERY_CATEGORIES, galleryItemsQuery, type GalleryItem } from "@/lib/gallery";

/**
 * Calculates circular distance from current center slide (-2, -1, 0, 1, 2)
 */
function getSlideOffset(index: number, current: number, total: number): number {
  if (total <= 1) return 0;
  let diff = (index - current) % total;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

export function FeaturedGallery() {
  const { data: allItems = [] } = useQuery(galleryItemsQuery());
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Lightbox state for active center image click
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic category filter list
  const availableCategories = useMemo(() => {
    const categoriesWithItems = new Set<string>();
    for (const item of allItems) {
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
  }, [allItems]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return allItems;
    return allItems.filter((item) => item.category === selectedCategory);
  }, [allItems, selectedCategory]);

  // Sync total count and current index
  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // Category switch: reset to first slide smoothly
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    api?.scrollTo(0);
  };

  // 5.5s Autoplay with hover & tab pause
  useEffect(() => {
    if (!api || filteredItems.length <= 1) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    if (isHovered || isFocused || lightboxIndex !== null) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      api.scrollNext();
    }, 5500);

    return () => clearInterval(interval);
  }, [api, isHovered, isFocused, lightboxIndex, filteredItems.length]);

  const handlePrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const handleNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // Lightbox keyboard controls
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setLightboxIndex(null);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLightboxIndex((prev) =>
          prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1,
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLightboxIndex((prev) =>
          prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, filteredItems.length]);

  if (!filteredItems || filteredItems.length === 0) {
    return null;
  }

  const activeLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <section
      className="section-home border-b border-border/80 bg-[#FAF9F6] relative overflow-hidden"
      aria-labelledby="featured-gallery-heading"
    >
      {/* Subtle warm red corner radial glows matching reference aesthetic */}
      <div
        className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-primary/4 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 size-[28rem] rounded-full bg-primary/4 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="container-page max-w-7xl relative z-10">
        {/* 1. Centered Editorial Header */}
        <Reveal className="text-center max-w-2xl mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-9 bg-primary/45" aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-[0.24em] text-primary">
              GALLERY
            </span>
            <span className="h-px w-9 bg-primary/45" aria-hidden="true" />
          </div>

          {/* Heading */}
          <h2
            id="featured-gallery-heading"
            className="mt-4 text-[clamp(2.1rem,4.5vw,3.4rem)] font-black tracking-[-0.03em] leading-tight text-foreground"
          >
            Inside Phone Store Ormskirk
          </h2>

          {/* Subheading & Supporting Copy */}
          <p className="mt-3 text-base sm:text-lg font-bold text-foreground/90">
            Real repairs. Real products. Real people.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Take a look inside our Ormskirk store and see what makes us different.
          </p>

          {/* Category Filter Pills (Horizontal scroll on small screens) */}
          {availableCategories.length > 1 && (
            <div className="mt-7 sm:mt-8 overflow-x-auto no-scrollbar py-1">
              <div
                className="flex items-center justify-center gap-2 sm:gap-2.5 min-w-max px-2"
                role="tablist"
                aria-label="Gallery category filters"
              >
                {availableCategories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleCategoryChange(cat)}
                      className={`press inline-flex items-center rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lift border border-primary scale-[1.02]"
                          : "border border-border/80 bg-white text-foreground/80 hover:border-primary/40 hover:text-foreground shadow-2xs"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Reveal>

        {/* 2. Wide Overlapping 5-Card Slideshow Composition */}
        <div className="mt-9 sm:mt-12 relative w-full max-w-[1400px] mx-auto">
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: filteredItems.length > 2,
              duration: 40,
            }}
            className="w-full select-none"
            aria-label="Inside Phone Store Ormskirk visual gallery"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocusCapture={() => setIsFocused(true)}
            onBlurCapture={() => setIsFocused(false)}
          >
            <CarouselContent className="py-4">
              {filteredItems.map((item: GalleryItem, index: number) => {
                const offset = getSlideOffset(index, current, filteredItems.length);
                const isCenter = offset === 0;

                // Precision 5-card overlapping styles matching reference
                let visualClasses = "";
                if (isCenter) {
                  // CENTER: Dominant, scale 1, opacity 1, z-30, elevated shadow, zoom cursor
                  visualClasses =
                    "z-30 scale-100 opacity-100 shadow-[0_20px_50px_rgba(0,0,0,0.16)] translate-x-0 cursor-zoom-in ring-1 ring-black/5";
                } else if (offset === 1) {
                  // IMMEDIATE RIGHT: scale 0.90, opacity 0.82, z-20, tucked behind center
                  visualClasses =
                    "z-20 scale-[0.90] opacity-[0.82] shadow-md -translate-x-6 sm:-translate-x-12 lg:-translate-x-18 cursor-pointer hover:opacity-95";
                } else if (offset === -1) {
                  // IMMEDIATE LEFT: scale 0.90, opacity 0.82, z-20, tucked behind center
                  visualClasses =
                    "z-20 scale-[0.90] opacity-[0.82] shadow-md translate-x-6 sm:translate-x-12 lg:translate-x-18 cursor-pointer hover:opacity-95";
                } else if (offset === 2) {
                  // OUTER RIGHT: scale 0.78, opacity 0.60, z-10, outer tuck
                  visualClasses =
                    "z-10 scale-[0.78] opacity-[0.60] shadow-sm -translate-x-12 sm:-translate-x-24 lg:-translate-x-36 cursor-pointer hidden sm:flex hover:opacity-80";
                } else if (offset === -2) {
                  // OUTER LEFT: scale 0.78, opacity 0.60, z-10, outer tuck
                  visualClasses =
                    "z-10 scale-[0.78] opacity-[0.60] shadow-sm translate-x-12 sm:translate-x-24 lg:translate-x-36 cursor-pointer hidden sm:flex hover:opacity-80";
                } else {
                  // OFF-SCREEN CARDS IN LOOP
                  visualClasses = "z-0 scale-[0.65] opacity-0 pointer-events-none hidden";
                }

                return (
                  <CarouselItem
                    key={item.id}
                    className="basis-[82%] sm:basis-[62%] lg:basis-[52%] xl:basis-[50%] shrink-0 px-1 sm:px-2"
                  >
                    <div
                      role="button"
                      tabIndex={isCenter ? 0 : -1}
                      ref={isCenter ? triggerRef : undefined}
                      onClick={() => {
                        if (isCenter) {
                          setLightboxIndex(index);
                        } else {
                          api?.scrollTo(index);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (isCenter && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setLightboxIndex(index);
                        }
                      }}
                      className={`relative aspect-[16/10] w-full overflow-hidden rounded-[22px] sm:rounded-[26px] bg-card transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${visualClasses}`}
                      aria-label={
                        isCenter
                          ? `Active photo: ${item.title}. Click to enlarge.`
                          : `View photo: ${item.title}`
                      }
                    >
                      {/* Clean photo without badges or overlays */}
                      <img
                        src={getCloudinaryImageUrl(item.image_url, "GALLERY")}
                        alt={item.alt_text}
                        width={900}
                        height={560}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover object-center"
                      />
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          {/* 3. Centered Controls: [ Previous ]  dots  [ Next ] */}
          {count > 1 && (
            <div className="mt-8 sm:mt-10 flex items-center justify-center gap-5 sm:gap-6">
              {/* Previous Button (~44px circular) */}
              <button
                type="button"
                onClick={handlePrev}
                className="press inline-flex size-11 items-center justify-center rounded-full border border-border/85 bg-white text-foreground shadow-2xs hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
                aria-label="Previous photo slide"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>

              {/* Dots Indicator */}
              <div
                className="flex items-center gap-2"
                role="tablist"
                aria-label="Gallery slide navigation dots"
              >
                {Array.from({ length: count }).map((_, idx) => {
                  const isActive = current === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Go to slide ${idx + 1} of ${count}`}
                      onClick={() => api?.scrollTo(idx)}
                      className={`size-2.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isActive
                          ? "bg-primary scale-125"
                          : "bg-border/90 hover:bg-muted-foreground/40"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Next Button (~44px circular) */}
              <button
                type="button"
                onClick={handleNext}
                className="press inline-flex size-11 items-center justify-center rounded-full border border-border/85 bg-white text-foreground shadow-2xs hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
                aria-label="Next photo slide"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* 4. Secondary Outlined Pill CTA */}
          <div className="mt-7 flex justify-center">
            <Link
              to="/gallery"
              className="press inline-flex items-center gap-2 rounded-full border border-border/85 bg-white px-7 py-2.5 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:border-primary hover:text-primary transition-colors"
            >
              <span>View Full Gallery</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Accessible Fullscreen Lightbox Modal (opens only when active center photo is clicked) */}
      {activeLightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo preview: ${activeLightboxItem.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 transition-all"
        >
          {/* Top Bar: Counter & Close Button */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-xs">
                {lightboxIndex! + 1} / {filteredItems.length}
              </span>
              <span className="hidden sm:inline-block text-xs font-medium text-white/70">
                {activeLightboxItem.category}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              aria-label="Close photo preview"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Left Arrow Button */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setLightboxIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1,
                );
              }}
              className="press absolute left-3 sm:left-6 z-10 hidden sm:flex size-12 items-center justify-center rounded-full bg-white/15 text-white shadow-lift hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
          )}

          {/* Center Image Container */}
          <div className="relative flex max-h-[85vh] max-w-4xl flex-col items-center justify-center overflow-hidden rounded-2xl">
            <img
              src={getCloudinaryImageUrl(activeLightboxItem.image_url, "DETAIL")}
              alt={activeLightboxItem.alt_text}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lift"
              loading="eager"
              decoding="async"
            />
            <div className="mt-3 text-center px-4">
              <p className="text-base font-extrabold text-white">{activeLightboxItem.title}</p>
              <p className="mt-1 text-xs text-white/75 max-w-xl">{activeLightboxItem.alt_text}</p>
            </div>
          </div>

          {/* Right Arrow Button */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setLightboxIndex((prev) =>
                  prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0,
                );
              }}
              className="press absolute right-3 sm:right-6 z-10 hidden sm:flex size-12 items-center justify-center rounded-full bg-white/15 text-white shadow-lift hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              aria-label="Next photo"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
