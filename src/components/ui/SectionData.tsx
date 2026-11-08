"use client";

import Image, { type ImageProps } from "next/image";
import { useSectionScope } from "./SectionScope";
import { pageCopy } from "@/lib/content/live";

/*
 * The rest of a home-page section the admin panel can change, beside its words (Txt): its photos and the styles it
 * names. Like Txt, each section lists these itself (DataCatalog) with what shows as built, so the panel reads every
 * field from the page with no list to keep up to date. The admin's choices are stored with the page's words, under
 * "<section>.img-<k>" (a photo's address) and "<section>.style-<k>" (a style's address, its slug).
 */

export type DataKind = "image" | "style";
const PREFIX: Record<DataKind, string> = { image: "img-", style: "style-" };
/** A style field set to name no style. */
export const NONE = "none";

/** The admin's photos, styles and value text for this section, falling back to the section's own. */
export function useSectionData() {
  const scope = useSectionScope();
  const get = (k: string) => (scope ? pageCopy("/", `${scope}.${k}`) : undefined);
  return {
    img: (k: string, fallback: string) => get(PREFIX.image + k) || fallback,
    /** A style's slug; "none" (the admin took the built-in style off) gives undefined. */
    style: (k: string, fallback?: string) => {
      const own = get(PREFIX.style + k) || fallback;
      return own === NONE ? undefined : own;
    },
    /** Text used as a value (alt text, a label in an attribute); list it with TxtCatalog so the panel shows it. */
    text: (k: string, fallback: string) => get(k) || fallback,
  };
}

/** A photo the admin can replace, for server components: next/image with the admin's address, else `src`. */
export function SectionImage({ k, src, alt, ...rest }: ImageProps & { k: string; src: string }) {
  return <Image src={useSectionData().img(k, src)} alt={alt} {...rest} />;
}

/** The section's photos and styles as built, listed for the admin panel. Nothing shows on the page. */
export function DataCatalog({ items }: { items: { k: string; label: string; kind: DataKind; value: string }[] }) {
  const scope = useSectionScope();
  if (!scope) return null;
  return (
    <div hidden aria-hidden="true">
      {items.map((i) => (
        <i key={i.kind + i.k} data-copy={`${scope}.${PREFIX[i.kind]}${i.k}`} data-default={i.value} data-label={i.label} data-kind={i.kind} />
      ))}
    </div>
  );
}

/** The styles the section shows right now (ids, in order), so the panel can list and edit them. Nothing shows. */
export function ProductsShown({ ids }: { ids: string[] }) {
  const scope = useSectionScope();
  if (!scope) return null;
  return <i hidden aria-hidden="true" data-products={scope} data-ids={[...new Set(ids)].join(",")} />;
}
