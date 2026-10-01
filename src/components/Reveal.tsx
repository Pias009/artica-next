import type { ComponentPropsWithoutRef, ElementType } from "react";

type Props = ComponentPropsWithoutRef<"section"> & { as?: ElementType };

/**
 * Semantic wrapper for sections whose [data-reveal] children rise into place.
 * The motion itself is CSS (scroll-driven `animation-timeline: view()`, transform only),
 * so content is always visible and nothing runs without support or with reduced motion.
 */
export function Reveal({ as: Tag = "div", ...rest }: Props) {
  return <Tag {...rest} />;
}
