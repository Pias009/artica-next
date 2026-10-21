"use client";

import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

const EASE = "expo.out";
const CLEAR = "transform,opacity,visibility,clipPath";

/**
 * The home page's entrances, played once as each part scrolls into view. Every section heading arrives the same way
 * (the eyebrow slides in, the words rise out of a mask one by one, the line under it follows), and each section's main
 * panel opens with its own move. Sections that run their own scroll motion (the hero, the hot deck, the range rows,
 * up close, the line sheet) keep it and only get the heading. Renders nothing; reduced motion skips it all.
 */
export function HomeReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const page = document.getElementById("page") ?? document.body;
      const $ = (s: string) => page.querySelector<HTMLElement>(s);
      const $$ = (s: string) => gsap.utils.toArray<HTMLElement>(page.querySelectorAll(s));
      const once = (trigger: Element, start = "top 85%") => ({ trigger, start, once: true });

      // every heading: eyebrow, masked words, the line under it
      for (const h2 of $$("section h2.type-section")) {
        if (h2.closest("#hero, [data-sheet-copy]")) continue;
        const split = SplitText.create(h2, { type: "words", mask: "words" });
        const eyebrow = h2.parentElement?.querySelector(":scope > .eyebrow");
        const sub = h2.nextElementSibling?.matches("p") ? h2.nextElementSibling : null;
        const tl = gsap.timeline({ scrollTrigger: once(h2, "top 90%"), onComplete: () => split.revert() });
        if (eyebrow) tl.from(eyebrow, { x: -32, autoAlpha: 0, duration: 0.8, ease: "power3.out" }, 0);
        tl.from(split.words, { yPercent: 118, rotate: 5, duration: 1.05, ease: EASE, stagger: 0.06 }, 0.05);
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
          clearProps: CLEAR,
          scrollTrigger: once(panels[0]),
        });

      // worldwide: the map opens out of an inset frame, then the lanes slide in
      const map = $("#worldwide > .glass");
      if (map)
        gsap
          .timeline({ scrollTrigger: once(map) })
          .fromTo(
            map,
            { clipPath: "inset(14% 12% 14% 12% round 28px)", autoAlpha: 0.2 },
            { clipPath: "inset(0% 0% 0% 0% round 28px)", autoAlpha: 1, duration: 1.3, ease: "expo.inOut", clearProps: CLEAR },
          )
          .from($$("#worldwide .glass ul > li"), { x: 32, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger: 0.06, clearProps: CLEAR }, 0.6);

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
          clearProps: CLEAR,
          scrollTrigger: once(programs),
        });

      // how it ships: the four cards rise in alternate tilts
      const ships = $$("#packing [data-ship]");
      if (ships.length)
        gsap.from(ships, {
          y: 90,
          rotate: (i) => (i % 2 ? 4 : -4),
          autoAlpha: 0,
          duration: 1.1,
          ease: EASE,
          stagger: 0.1,
          clearProps: CLEAR,
          scrollTrigger: once(ships[0]),
        });

      // samples: an iris opens from the middle of the panel
      const samples = $("#samples > .glass");
      if (samples)
        gsap.fromTo(
          samples,
          { clipPath: "circle(12% at 50% 55%)" },
          { clipPath: "circle(120% at 50% 55%)", duration: 1.5, ease: "power3.inOut", clearProps: CLEAR, scrollTrigger: once(samples) },
        );

      // order sheet: the panel splits open from the centre line
      const sheet = $("#order-sheet > .glass");
      if (sheet)
        gsap.fromTo(
          sheet,
          { clipPath: "inset(0% 50% 0% 50% round 28px)" },
          { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.2, ease: "expo.inOut", clearProps: CLEAR, scrollTrigger: once(sheet) },
        );

      // order journey: a curtain drops from the top
      const journey = $("#journey > .glass");
      if (journey)
        gsap.fromTo(
          journey,
          { clipPath: "inset(0% 0% 100% 0% round 28px)" },
          { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.2, ease: "expo.inOut", clearProps: CLEAR, scrollTrigger: once(journey, "top 80%") },
        );

      // private label: a curtain wipes in from the left while the pair settles
      const partner = $("#partner > .glass");
      if (partner)
        gsap
          .timeline({ scrollTrigger: once(partner) })
          .fromTo(
            partner,
            { clipPath: "inset(0% 100% 0% 0% round 28px)" },
            { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.3, ease: "expo.inOut", clearProps: CLEAR },
          )
          .from(partner.querySelectorAll("img"), { scale: 1.2, x: 60, rotate: -6, duration: 1.4, ease: EASE, clearProps: CLEAR }, 0.25);
    });
    return () => mm.revert();
  });

  return null;
}
