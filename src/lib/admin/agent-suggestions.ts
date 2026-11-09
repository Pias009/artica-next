/*
 * Kai's suggestions in the admin panel (AI agent): what to do next, worked out from the panel's own figures with
 * plain rules, so they cost no tokens and say exactly why. Each one links to the place to act on it. Pure, with no
 * "@/" imports, so `node --test` loads it as is.
 */

export type Suggestion = {
  id: string;
  /** now: costs buyers or money today; idea: worth doing this week; good: nothing to fix. */
  tone: "now" | "idea" | "good";
  title: string;
  why: string;
  action: { label: string; href: string };
};

export type SuggestionInput = {
  overdue: number;
  /** Contact requests ("Talk to the desk") still at "new". */
  contactWaiting: number;
  emailsStuck: number;
  desks: { trade: boolean; plan: boolean; model: boolean };
  aiReady: boolean;
  /** Today's model calls and tokens against the daily limits. */
  usage: { calls: number; tokens: number; rpd: number; tpd: number };
  /** What buyers asked Kai, last 7 days, most asked first. */
  topics: { id: string; label: string; n: number }[];
  /** Answered by the built-in rules vs the model, last 7 days, and messages turned away. */
  sources: { rules: number; model: number; limited: number; closed: number };
  /** Site searches that found nothing, last 7 days. */
  emptySearches: { q: string; n: number }[];
  /** Live styles with no private price yet, and how many live styles there are. */
  unpriced: number;
  live: number;
  /** Styles whose inquiries are rising, by name. */
  rising: string[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** The suggestions, most urgent first, at most `max`. Always at least one (an all-clear when nothing needs doing). */
export function suggestions(d: SuggestionInput, max = 6): Suggestion[] {
  const out: Suggestion[] = [];
  const asked = d.topics.reduce((a, t) => a + t.n, 0);
  const topic = (id: string) => d.topics.find((t) => t.id === id)?.n ?? 0;

  if (d.overdue)
    out.push({
      id: "overdue",
      tone: "now",
      title: `Reply to ${plural(d.overdue, "inquiry", "inquiries")} past 20 hours`,
      why: "The site promises tier pricing within 24 hours. Kai can draft each reply for you to check and send.",
      action: { label: "Open overdue inquiries", href: "/admin/inquiries/all?status=overdue" },
    });
  if (d.contactWaiting)
    out.push({
      id: "contact",
      tone: "now",
      title: `${plural(d.contactWaiting, "buyer")} asked the desk to contact them`,
      why: "They left an email in \"Talk to the desk\" and were told a trade assistant writes within one working day.",
      action: { label: "See contact requests", href: "/admin/inquiries/all?intent=contact&status=new" },
    });
  if (d.emailsStuck)
    out.push({
      id: "emails",
      tone: "now",
      title: `${plural(d.emailsStuck, "email")} to buyers or the desk didn't go out`,
      why: "Usually the email settings. Retrying from Inquiries sends them again.",
      action: { label: "Open Inquiries", href: "/admin/inquiries" },
    });
  if (!d.desks.trade || !d.desks.plan) {
    const off = [!d.desks.trade && "trade help", !d.desks.plan && "the planning desk"].filter(Boolean).join(" and ");
    out.push({
      id: "desk-off",
      tone: d.sources.closed ? "now" : "idea",
      title: `Kai's ${off} ${!d.desks.trade && !d.desks.plan ? "are" : "is"} switched off`,
      why: d.sources.closed
        ? `${plural(d.sources.closed, "message")} this week reached a closed desk and got no answer.`
        : "Buyers who open the chat see it closed and are sent to the inquiry form.",
      action: { label: "Switch on below", href: "#jobs" },
    });
  }
  if (d.aiReady && d.desks.model) {
    const share = Math.max(d.usage.calls / d.usage.rpd, d.usage.tokens / d.usage.tpd);
    if (share >= 0.8)
      out.push({
        id: "limit",
        tone: "now",
        title: `Kai has used ${Math.round(share * 100)}% of today's AI limit`,
        why: "Past the limit it answers from its built-in rules until midnight (UTC): English only, no open questions.",
        action: { label: "See today's use", href: "#limits" },
      });
  } else if (asked >= 10)
    out.push({
      id: "model-off",
      tone: "idea",
      title: d.aiReady ? "The AI model is off" : "No AI key is set",
      why: `${plural(asked, "message")} this week were answered by the built-in rules only: no follow-ups, no other languages.`,
      action: d.aiReady ? { label: "Switch it on below", href: "#jobs" } : { label: "See Settings", href: "/admin/settings" },
    });
  if (d.sources.limited >= 5)
    out.push({
      id: "limited",
      tone: "idea",
      title: `${plural(d.sources.limited, "message")} were turned away as too many`,
      why: "One address sent many messages in a few minutes. If they were real buyers, raise ASSISTANT_RPM.",
      action: { label: "See the limits", href: "#limits" },
    });
  if (d.emptySearches.length) {
    const top = d.emptySearches.slice(0, 3).map((s) => `"${s.q}"`).join(", ");
    out.push({
      id: "searches",
      tone: "idea",
      title: `Buyers searched for ${top} and found nothing`,
      why: "Add those words to matching styles' tags or names, so the search and Kai find them.",
      action: { label: "Open Products", href: "/admin/products" },
    });
  }
  const price = topic("price");
  if (price >= 3 && price / Math.max(asked, 1) >= 0.15)
    out.push({
      id: "price-asks",
      tone: "idea",
      title: `${plural(price, "question")} to Kai were about prices`,
      why: "Kai never quotes prices and sends them to an inquiry. Make sure every live style has its private prices, so replies go out fast.",
      action: { label: "Styles with no price", href: "/admin/products?status=noprice" },
    });
  else if (d.unpriced && d.live && d.unpriced / d.live >= 0.25)
    out.push({
      id: "unpriced",
      tone: "idea",
      title: `${plural(d.unpriced, "live style")} have no private price yet`,
      why: "Inquiry pages and Kai's reply drafts show a [tier price] gap for them.",
      action: { label: "Styles with no price", href: "/admin/products?status=noprice" },
    });
  const shipping = topic("shipping");
  if (shipping >= 3 && shipping === d.topics[0]?.n)
    out.push({
      id: "shipping-asks",
      tone: "idea",
      title: "Shipping is what buyers ask Kai about most",
      why: `${plural(shipping, "question")} this week. Check the shipping page and FAQ answer transit, duties and ports plainly.`,
      action: { label: "Edit the pages", href: "/admin/pages" },
    });
  if (topic("contact") >= 3)
    out.push({
      id: "people",
      tone: "idea",
      title: `${plural(topic("contact"), "buyer")} asked Kai for a person`,
      why: "Kai points them to \"Talk to the desk\". Fast replies to contact requests win these buyers.",
      action: { label: "See contact requests", href: "/admin/inquiries/all?intent=contact" },
    });
  if (d.rising.length)
    out.push({
      id: "rising",
      tone: "idea",
      title: `Interest in ${d.rising.slice(0, 2).join(" and ")}${d.rising.length > 2 ? ` and ${d.rising.length - 2} more` : ""} is rising`,
      why: "More inquiries this month than last. Featuring them puts them first across the site and in Kai's picks.",
      action: { label: "See rising styles", href: "/admin/products?status=rising" },
    });

  if (!out.length)
    out.push({
      id: "clear",
      tone: "good",
      title: "Nothing needs you right now",
      why: "No overdue inquiries, no waiting contact requests, and Kai is answering within its limits.",
      action: { label: "Ask Kai for ideas", href: "#ask" },
    });
  const rank = { now: 0, idea: 1, good: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, max);
}
