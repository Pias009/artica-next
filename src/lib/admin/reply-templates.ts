import { LEAD, MOQ_CASES, PACK } from "@/lib/products";

/** LEAD keeps short codes ("10d", "24h"); buyers read them as words. */
const span = (s: string) => s.replace(/^(\d+)d$/, "$1 days").replace(/^(\d+)h$/, "$1 hours");

/**
 * Canned replies for the desk's most common answers, shown as chips above the reply box (the dashboard's inquiry sheet
 * and the full inquiry page). Plain data so client components can import it; the wholesale terms come from the
 * product constants so a template never quotes an MOQ or lead time the site no longer states. Each one is a starting
 * point: the desk edits it before sending, and anything in [brackets] is for them to fill in.
 */
export type ReplyTemplate = { id: string; label: string; subject: string; body: string };

/** Limits on a desk reply, checked by the send action and mirrored on the form fields. */
export const REPLY_SUBJECT_MAX = 200;
export const REPLY_BODY_MAX = 8000;

const SIGN = `Best regards,\nChime Long trade desk`;

export const REPLY_TEMPLATES: readonly ReplyTemplate[] = [
  {
    id: "samples",
    label: "Samples on the way",
    subject: "Your samples are on the way ({ref})",
    body: `Hello,

Thank you for your interest. Your samples for inquiry {ref} are packed and leave our Guangzhou warehouse [date], by [courier], tracking number [tracking].

They usually arrive in ${span(LEAD.samples)}. Once you have tried them, tell us which styles and size runs you would like and we will confirm prices and the bulk lead time.

${SIGN}`,
  },
  {
    id: "moq",
    label: "MOQ and case pack",
    subject: "Minimum order and case pack ({ref})",
    body: `Hello,

Thank you for your inquiry {ref}. Our minimum order is ${MOQ_CASES} cases per style (${MOQ_CASES * PACK} pairs), and each case holds ${PACK} pairs in a mixed size run, so you can start small and still cover the full size curve.

Bulk orders ship in about ${span(LEAD.bulk)} from confirmation. Tell us the styles and quantities you have in mind and we will send a quote within ${span(LEAD.quote)}.

${SIGN}`,
  },
  {
    id: "alternatives",
    label: "Out of stock: alternatives",
    subject: "About the styles in your inquiry ({ref})",
    body: `Hello,

Thank you for your inquiry {ref}. Unfortunately [style] is out of stock for this season.

Close alternatives we can offer at a similar price:
- [style], [colour]
- [style], [colour]

Would you like samples or a quote for either of these?

${SIGN}`,
  },
  {
    id: "price-list",
    label: "Price list attached",
    subject: "Our wholesale price list ({ref})",
    body: `Hello,

Thank you for your interest. As requested for inquiry {ref}, here is our current wholesale price list: [link to price list].

Prices are per pair, FOB Guangzhou, in USD; volume tiers apply from ${MOQ_CASES * PACK} pairs per style. Reply with the styles you like and we will confirm availability and lead times.

${SIGN}`,
  },
  {
    id: "confirm",
    label: "Thanks, confirming your order",
    subject: "Order confirmed ({ref})",
    body: `Hello,

Thank you for your order. We confirm inquiry {ref} as follows:
[styles, colours, cases]

Payment: [terms]
Production and shipping: about ${span(LEAD.bulk)} from your deposit.

We will send the proforma invoice shortly. Please check the details and tell us if anything needs changing.

${SIGN}`,
  },
];

/** A template with its placeholders filled for one inquiry. */
export function fillTemplate(t: ReplyTemplate, ref: string): { subject: string; body: string } {
  const fill = (s: string) => s.replaceAll("{ref}", ref);
  return { subject: fill(t.subject), body: fill(t.body) };
}
