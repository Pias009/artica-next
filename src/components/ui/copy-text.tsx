import { Fragment, isValidElement, type ReactNode } from "react";

/*
 * Page text the admin panel can rewrite (Pages). Headlines are written with the closing words in *asterisks* for the
 * plum italic accent, the same way the site's own headlines put them in <em>.
 */

/** "Buy for the season *you can still catch.*" → the words, with the starred part in <em>. */
export const accent = (t: string) => t.split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>));

/** A heading as plain text, its <em> accent written as *asterisks*: what the admin panel shows as the current words. */
export function plain(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plain).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const inner = plain(node.props.children);
    if (node.type === "em") return `*${inner}*`;
    if (node.type === "br") return " ";
    return inner;
  }
  return "";
}
