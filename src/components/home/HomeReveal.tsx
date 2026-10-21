"use client";

import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

const EASE = "expo.out";

/**
 * The home page's entrances. Each one plays as its part comes into view and plays backwards as it leaves, from either
 * direction, so scrolling down, back up, or past it again always shows it arriving. Every heading arrives the same way
 * (the eyebrow slides in, the words rise out of a mask one by one, the line under it follows) and each section's main
 * panel opens with its own move. Sections that run their own scroll motion (the hot deck, the range rows, the ship
 * cards, samples, the journey) keep it and only get the heading. Renders nothing; reduced motion skips it all.
 * Mounted last on the page, so its setup runs after every section's own; it then marks <html data-motion-ready>, which
 * lifts the stylesheet's hold on the moving parts (see globals.css) now that they sit in their starting state.
 */
export function HomeReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const page = document.getElementById("page") ?? document.body;
      const $ = (s: string) => page.querySelector<HTMLElement>(s);
      const $$ = (s: string) => gsap.utils.toArray<HTMLElement>(page.querySelectorAll(s));

      /** Play on the way in, reverse on the way out, both directions, every time. */
      const visit = (trigger: Element, start = "top 85%", end = "bottom top") => ({
        trigger,
        start,
        end,
        toggleActions: "play reverse play reverse",
        fastScrollEnd: true,
      });

      /** Words in their own masks; the masks get a little room so ascenders, descenders and italics are never cut. */
      const words = (el: HTMLElement) => {
        const split = SplitText.create(el, { type: "words", mask: "words" });
        gsap.set(split.masks, { padding: "0.14em 0.1em", margin: "-0.14em -0.1em" });
        return split.words;
      };
      const rise = { yPercent: 125, rotate: 5, duration: 1.05, ease: EASE, stagger: 0.06 };

      // the hero: eyebrow, headline, line, actions; replays whenever you come back up to it
      const hero = $("#hero");
      const title = $("#hero-title");
      if (hero && title)
        gsap
          .timeline({ scrollTrigger: visit(hero, "top bottom", "bottom 30%") })
          .from(hero.querySelectorAll('[data-hero-in="eyebrow"]'), { x: -32, autoAlpha: 0, duration: 0.8, ease: "power3.out" }, 0)
          .from(words(title), { ...rise, stagger: 0.05 }, 0.05)
          .from(hero.querySelectorAll('[data-hero-in="copy"]'), { y: 18, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, 0.35)
          .from(hero.querySelectorAll('[data-hero-in="cta"] > *'), { y: 22, autoAlpha: 0, duration: 0.8, ease: EASE, stagger: 0.08 }, 0.45);

      // every section heading
      for (const h2 of $$("section h2.type-section")) {
        if (h2.closest("#hero, [data-sheet-copy]")) continue;
        const eyebrow = h2.parentElement?.querySelector(":scope > .eyebrow");
        const sub = h2.nextElementSibling?.matches("p") ? h2.nextElementSibling : null;
        const tl = gsap.timeline({ scrollTrigger: visit(h2, "top 90%") });
        if (eyebrow) tl.from(eyebrow, { x: -32, autoAlpha: 0, duration: 0.8, ease: "power3.out" }, 0);
        tl.from(words(h2), rise, 0.05);
        if (sub) tl.from(sub, { y: 18, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, 0.35);
      }

      // new arrivals: the panels grow up from their base, one after another
      const panels = $$('#new [aria-label="New styles"] > li');
      if (panels.length)
        gsap.from(panels, {
          y: 70,
          scaleY: 0.5,
          autoAlpha: 0,
          transformOrigin: "50% 100%",
          duration: 1.1,
          ease: EASE,
          stagger: 0.07,
          scrollTrigger: visit(panels[0].parentElement!),
        });

      // worldwide: the map opens out of an inset frame, then the lanes slide in
      const map = $("#worldwide > .glass");
      if (map)
        gsap
          .timeline({ scrollTrigger: visit(map) })
          .fromTo(
            map,
            { clipPath: "inset(14% 12% 14% 12% round 28px)", autoAlpha: 0.2 },
            { clipPath: "inset(0% 0% 0% 0% round 28px)", autoAlpha: 1, duration: 1.3, ease: "expo.inOut" },
          )
          .from($$("#worldwide .glass ul > li"), { x: 32, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger: 0.06 }, 0.6);

      // buyer types: the panel tips up toward you
      const programs = $("#bt-panel");
      if (programs)
        gsap.from(programs, {
          rotateX: 16,
          y: 80,
          autoAlpha: 0,
          transformPerspective: 1400,
          transformOrigin: "50% 0%",
          duration: 1.3,
          ease: EASE,
          scrollTrigger: visit(programs),
        });

      // up close: the details slide in from the left, the boot's stage from the right
      const close = $("[data-upclose]");
      if (close)
        gsap
          .timeline({ scrollTrigger: visit(close, "top 80%") })
          .from(close.children[0], { x: -70, autoAlpha: 0, duration: 1.1, ease: EASE }, 0)
          .from(close.children[1], { x: 90, rotateY: -14, transformPerspective: 1400, autoAlpha: 0, duration: 1.3, ease: EASE }, 0.1);

      // samples: an iris opens from the middle of the panel
      const samples = $("#samples > .glass");
      if (samples)
        gsap.fromTo(
          samples,
          { clipPath: "circle(12% at 50% 55%)" },
          { clipPath: "circle(120% at 50% 55%)", duration: 1.5, ease: "power3.inOut", scrollTrigger: visit(samples) },
        );

      // order sheet: the panel splits open from the centre line
      const sheet = $("#order-sheet > .glass");
      if (sheet)
        gsap.fromTo(
          sheet,
          { clipPath: "inset(0% 50% 0% 50% round 28px)" },
          { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.2, ease: "expo.inOut", scrollTrigger: visit(sheet) },
        );

      // order journey: a curtain drops from the top
      const journey = $("#journey > .glass");
      if (journey)
        gsap.fromTo(
          journey,
          { clipPath: "inset(0% 0% 100% 0% round 28px)" },
          { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.2, ease: "expo.inOut", scrollTrigger: visit(journey, "top 80%") },
        );

      // private label: a curtain wipes in from the left while the pair settles
      const partner = $("#partner > .glass");
      if (partner)
        gsap
          .timeline({ scrollTrigger: visit(partner) })
          .fromTo(
            partner,
            { clipPath: "inset(0% 100% 0% 0% round 28px)" },
            { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.3, ease: "expo.inOut" },
          )
          .from(partner.querySelectorAll("img"), { scale: 1.2, x: 60, rotate: -6, duration: 1.4, ease: EASE }, 0.25);
    });
    // every section's animation is set up by now (this runs last on the page): let the held-back parts show
    const root = document.documentElement;
    root.dataset.motionReady = "";
    return () => {
      mm.revert();
      delete root.dataset.motionReady;
    };
  });

  return null;
}
