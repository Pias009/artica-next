"use client";

import { Txt } from "../ui/Txt";
import { seasonCopyOf } from "@/lib/content/live";
import { merged } from "@/lib/season-copy";
import { campaignLive, controlOn } from "@/lib/content/live";
import clsx from "clsx";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { usePickSeason } from "../season/pickSeason";
import { useSeason } from "../season/SeasonContext";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { getProduct, type Product } from "@/lib/products";
import { isSeason, SEASON_IDS, type SeasonId } from "@/lib/season";
import { useUI } from "@/lib/store";

export type SeasonCampaignConfig = {
  id: SeasonId;
  label: string;
  seasonTag: string;
  icon: "snow" | "leaf" | "flower" | "sun" | "rain" | "gift";
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  accentColor: string;
  description: string;
  image: string;
  alt: string;
  wornSlugs: string[];
};

export const CAMPAIGNS: Record<SeasonId, SeasonCampaignConfig> = {
  winter: {
    id: "winter",
    label: "Winter",
    seasonTag: "FW26 Winter",
    icon: "snow",
    eyebrow: "FW26 campaign · Winter edit",
    headlineLead: "Built for sub-zero. ",
    headlineAccent: "Styled for the shelf.",
    accentColor: "#f2c9ea",
    description: "Insulated snow boots, shearling collars, and ice-grip lugs tested down to −25°C.",
    image: "/images/models/campaign-banner-winter.jpg",
    alt: "A couple walking through a snowy mountain pavilion, he in black leather lace-up boots, she in tall suede boots",
    wornSlugs: ["nord", "mira-tall"],
  },
  autumn: {
    id: "autumn",
    label: "Autumn",
    seasonTag: "FW26 Fall",
    icon: "leaf",
    eyebrow: "Autumn 2026 campaign · Fall edit",
    headlineLead: "Crisp mornings. ",
    headlineAccent: "Built for the first cold snap.",
    accentColor: "#f6d39c",
    description: "Full-grain leather Chelsea boots, rich suede ankle boots, and weather-treated soles.",
    image: "/images/models/campaign-banner-autumn.jpg",
    alt: "A stylish couple walking down a sun-dappled European boulevard with golden autumn leaves, wearing toffee suede and leather boots",
    wornSlugs: ["toffee", "cedar"],
  },
  spring: {
    id: "spring",
    label: "Spring",
    seasonTag: "SS26 Spring",
    icon: "flower",
    eyebrow: "Spring 2026 campaign · Spring edit",
    headlineLead: "Light steps. ",
    headlineAccent: "Crafted for the first warm days.",
    accentColor: "#d9ecc7",
    description: "Lightweight leather sneakers, cushioned flats, and breathable soft-lined loafers.",
    image: "/images/models/campaign-banner-spring.jpg",
    alt: "Models in light trench coats wearing minimalist leather sneakers and loafers along a sunlit blossoming urban street",
    wornSlugs: ["zinnia", "nova"],
  },
  summer: {
    id: "summer",
    label: "Summer",
    seasonTag: "High Summer",
    icon: "sun",
    eyebrow: "Summer 2026 campaign · Summer edit",
    headlineLead: "Open-air silhouettes. ",
    headlineAccent: "Made for the warm rush.",
    accentColor: "#fce59f",
    description: "Ergonomic cork-footbed slides and water-resistant strap sandals packed by the master case.",
    image: "/images/models/campaign-banner-summer.jpg",
    alt: "Models walking along a sunny Mediterranean stone promenade wearing leather slides and ergonomic cork sandals",
    wornSlugs: ["sol", "capri"],
  },
  rainy: {
    id: "rainy",
    label: "Monsoon",
    seasonTag: "Storm Edit",
    icon: "rain",
    eyebrow: "Monsoon campaign · Storm edit",
    headlineLead: "Storm-tested waterproofs. ",
    headlineAccent: "Built for wet city streets.",
    accentColor: "#bfe6ea",
    description: "Seam-sealed hydrophobic leathers, water-deflecting gussets, and high-drainage wet treads.",
    image: "/images/models/campaign-banner-rainy.jpg",
    alt: "Models with black umbrellas on a rain-slicked reflective European street wearing waterproof high-traction boots",
    wornSlugs: ["storm", "splash"],
  },
  holiday: {
    id: "holiday",
    label: "Holiday",
    seasonTag: "Holiday Edit",
    icon: "gift",
    eyebrow: "Holiday 2026 campaign · Party edit",
    headlineLead: "Gift-ready statement pairs. ",
    headlineAccent: "Made for party season.",
    accentColor: "#f7b3c6",
    description: "Patent combat boots, glossy pumps, and plush-cuff boots for seasonal store window displays.",
    image: "/images/models/campaign-banner-holiday.jpg",
    alt: "Models walking along a festive holiday city avenue under warm twinkling lights wearing patent combat and evening boots",
    wornSlugs: ["pop", "scarlet"],
  },
};

/** A season's campaign with the admin's edits (Seasons) over the built-in one. */
export const campaignFor = (id: SeasonId): SeasonCampaignConfig => merged(CAMPAIGNS[id] ?? CAMPAIGNS.winter, seasonCopyOf(id)?.campaign);

/**
 * EditorialCampaignBanner:
 * Renders season-based UGC editorial campaign banners with models wearing in-season footwear.
 * Seamlessly responds to the visitor's detected season (or manual season pick), and includes
 * quick season preview pills directly on the banner to explore all 6 seasonal campaigns.
 */
export function EditorialCampaignBanner() {
  const globalSeason = useSeason();
  const [pickSeason] = usePickSeason();
  const openQuickView = useUI((s) => s.openQuickView);
  const ref = useRef<HTMLElement>(null);

  const [activeSeason, setActiveSeason] = useState<SeasonId>(() =>
    isSeason(globalSeason) ? globalSeason : "winter"
  );

  // Keep local banner in sync if the global season changes
  const [syncedSeason, setSyncedSeason] = useState(globalSeason);
  if (globalSeason !== syncedSeason) {
    setSyncedSeason(globalSeason);
    if (isSeason(globalSeason)) setActiveSeason(globalSeason);
  }

  // Photos load only once their season is picked, and the outgoing one stays up until the incoming one has loaded,
  // so the cross-fade never shows an empty frame and visitors who never switch download one photo, not six.
  const [mounted, setMounted] = useState<SeasonId[]>(() => [activeSeason]);
  const [loaded, setLoaded] = useState<ReadonlySet<SeasonId>>(() => new Set());
  const [shown, setShown] = useState<SeasonId>(activeSeason);
  if (!mounted.includes(activeSeason)) setMounted([...mounted, activeSeason]);
  if (loaded.has(activeSeason) && shown !== activeSeason) setShown(activeSeason);

  const campaign = campaignFor(activeSeason);

  const wornProducts = useMemo(() => {
    return campaign.wornSlugs.map(getProduct).filter((p): p is Product => !!p);
  }, [campaign.wornSlugs]);

  const handleSelectSeason = (id: SeasonId) => {
    setActiveSeason(id);
    pickSeason(id);
  };

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const frame = "[data-campaign]";
        gsap
          .timeline({ scrollTrigger: { trigger: frame, start: "top bottom", end: "top 12%", scrub: 1.2 } })
          .fromTo(frame, { scale: 0.8 }, { scale: 1, ease: "power2.out" }, 0)
          .fromTo("[data-campaign-img]", { scale: 1.28 }, { scale: 1.06, ease: "power2.out" }, 0)
          .from("[data-chip]", { y: 40, autoAlpha: 0, stagger: 0.15, ease: "power3.out" }, 0.45);
        gsap.fromTo(
          "[data-campaign-drift]",
          { yPercent: 0 },
          { yPercent: 6, ease: "none", scrollTrigger: { trigger: frame, start: "top 12%", end: "bottom top", scrub: 1.2 } },
        );
      });
    },
    { scope: ref },
  );

  // off in the admin panel: all campaigns (Dashboard → Site controls) or this season's (Seasons)
  if (!controlOn("campaign") || !campaignLive(activeSeason)) return null;
  return (
    <section ref={ref} id="campaign" aria-labelledby="h-campaign" className="mt-sec scroll-mt-24">
      <div
        data-campaign
        className="relative isolate h-[min(165vw,680px)] overflow-hidden rounded-shell bg-photo sm:h-[clamp(520px,78vh,760px)] shadow-float"
      >
        {/* All season banner background images with silky smooth cross-fade */}
        <span data-campaign-drift className="absolute -inset-y-[6%] inset-x-0 block pointer-events-none">
          {/* the scroll zoom sits on this wrapper, so a photo swapped in later is zoomed the same as the first */}
          <span data-campaign-img className="absolute inset-0 block">
            {mounted.map((id) => {
              const c = campaignFor(id);
              const isShown = id === shown;
              return (
                <Image
                  key={id}
                  src={c.image}
                  alt={isShown ? c.alt : ""}
                  aria-hidden={isShown ? undefined : true}
                  fill
                  sizes="(min-width: 80rem) 1280px, 100vw"
                  onLoad={() => setLoaded((s) => new Set(s).add(id))}
                  className={clsx(
                    "object-cover object-[44%_50%] transition-opacity duration-700 ease-in-out",
                    isShown ? "opacity-100" : "opacity-0"
                  )}
                />
              );
            })}
          </span>
        </span>

        {/* Ambient shade overlays so copy and interactive elements stay crisp across all lighting */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgb(12_13_14/.82),rgb(12_13_14/.25)_45%,transparent_75%)] sm:bg-[linear-gradient(0deg,rgb(12_13_14/.75),transparent_55%),linear-gradient(90deg,rgb(12_13_14/.55),transparent_60%)]"
        />

        {/* Top Floating Bar: Season Switcher & Campaign Badges */}
        <div className="absolute inset-x-4 top-4 z-20 flex flex-wrap items-center justify-between gap-3 sm:inset-x-8 sm:top-7 lg:inset-x-12">
          {/* Active campaign indicator */}
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur-sm ring-1 ring-white/20">
            <span className="size-2 rounded-full bg-brand animate-pulse" />
            <span className=" text-[13px] font-bold text-white/90">
              {campaign.seasonTag} · Model UGC Lookbook
            </span>
          </div>

          {/* Quick Season Navigation Pills */}
          <nav aria-label="Seasonal campaign switcher" className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-full bg-black/45 backdrop-blur-sm ring-1 ring-white/20 max-w-full">
            {SEASON_IDS.map((id) => {
              const c = campaignFor(id);
              const isSelected = id === activeSeason;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectSeason(id)}
                  aria-pressed={isSelected}
                  className={clsx(
                    "group flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-200",
                    isSelected
                      ? "bg-white text-ink shadow-sm"
                      : "text-white/80 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <Icon name={c.icon} className={clsx("size-3.5 transition-transform group-hover:scale-110", isSelected ? "text-brand" : "text-white/70")} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Content: Headline, Actions & Worn Shoes */}
        <div className="absolute inset-x-5 bottom-5 z-20 flex flex-col gap-6 sm:inset-x-8 sm:bottom-8 lg:inset-x-12 lg:bottom-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[580px] text-white">
            <h2 id="h-campaign" className="type-section mt-2.5 text-white!">
              {campaign.headlineLead}
              <em
                style={{ color: campaign.accentColor }}
                className="not-italic transition-colors duration-500 font-serif"
              >
                {campaign.headlineAccent}
              </em>
            </h2>
            <p className="mt-2 text-sm text-white/85 max-w-md leading-relaxed hidden sm:block">
              {campaign.description}
            </p>

            <OpenInquiryButton
              buyerType="Retailer"
              className="group mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-brand hover:text-white"
            >
              <Txt k="button" label="Button">Get wholesale pricing</Txt>{" "}
              <Icon
                name="arrow"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </OpenInquiryButton>
          </div>

          {/* Season pairs worn in this shot */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-boldr text-white/75 sm:text-right">
              Modeled in this {campaign.label.toLowerCase()} shot
            </span>
            <ul aria-label="Worn in this shot" className="flex flex-wrap gap-2.5">
              {wornProducts.map((p) => (
                <li key={p.id} data-chip>
                  <button
                    type="button"
                    onClick={() => openQuickView(p.id)}
                    aria-label={`Chime Long ${p.name}: view details`}
                    className="group flex items-center gap-3 rounded-full bg-white/15 py-1.5 pr-4 pl-1.5 text-left text-white ring-1 ring-white/35 backdrop-blur-sm transition-all hover:bg-white/25 hover:ring-white/50"
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-white/90">
                      <Image
                        src={p.outer.src}
                        alt=""
                        fill
                        sizes="48px"
                        className="-scale-x-100 object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                      />
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[15px] leading-tight font-semibold">{p.name}</b>
                      <span className="block text-[13px] text-white/80">{p.sizes}</span>
                    </span>
                    <Icon
                      name="arrow"
                      className="ml-1 size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
