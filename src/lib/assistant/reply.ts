import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { backOff, modelAllowed, record, spend } from "./budget";
import { aiReady, kaiModel } from "./model";
import { ASSISTANT } from "./persona";
import { productDetails, shippingInfo } from "./skills";
import type { InquiryDoc } from "../leads/db";
import { INTENT_LABEL } from "../leads/mail";
import { quote, usd, type PriceList } from "../admin/prices";
import { readContent } from "../content/store";
import { LEAD, MOQ_PAIRS, PRIVATE_LABEL_MIN } from "../products";

export type ReplyDraft = {
  subject: string;
  body: string;
  /** For the desk, not the buyer: what they want and what to do next. */
  summary: string[];
  source: "ai" | "template";
};

const SCHEMA = z.object({
  subject: z.string().describe("Email subject, including the inquiry reference"),
  body: z.string().describe("The reply email, plain text, signed by the Chime Long trade desk"),
  summary: z.array(z.string()).min(2).max(5).describe("Short notes for the desk: what the buyer wants, gaps to ask about, next action"),
});

/** The facts a reply may use, gathered once for both the AI and the template. */
const VIA_KAI = /\n?Prepared with Kai, the site assistant\.?/;

function facts(i: InquiryDoc, prices: PriceList = {}) {
  const q = quote(i.lines, prices);
  const styles = i.lines.map((l, k) => {
    const d = productDetails({ style: l.productId });
    const r = q.rows[k];
    return {
      name: l.name,
      colour: l.color,
      sizes: l.sizes,
      cases: l.cases,
      pairs: l.pairs,
      ...(r.price !== null && { pricePerPairFOB: usd(r.price), lineTotalFOB: usd(r.total!) }),
      ...(d.found && { casePack: d.casePack, materials: d.materials, url: d.url }),
    };
  });
  return {
    ref: i.ref,
    company: i.company,
    buyerType: i.buyerType,
    wants: INTENT_LABEL[i.intent],
    shipTo: i.country,
    note: i.note.replace(VIA_KAI, "").trim(),
    sentFromChat: VIA_KAI.test(i.note),
    styles,
    totalPairs: i.pairs,
    /** The desk's own prices, where set (admin Products): FOB, USD. */
    quoteTotalFOB: q.rows.length && q.complete ? usd(q.total) : null,
    unpricedStyles: q.missing,
    shipping: shippingInfo({ country: i.country }),
    terms: {
      moq: `${MOQ_PAIRS} pairs per style and colour`,
      tierPricing: "from 1,000 pairs per style",
      privateLabel: `from ${PRIVATE_LABEL_MIN} pairs`,
      samples: `about ${LEAD.samples.replace("d", "")} days`,
      bulk: `about ${LEAD.bulk.replace("d", "")} days`,
      payment: "30% deposit on confirmation, 70% against the bill of lading",
    },
  };
}

/**
 * A first draft of the desk's reply to an inquiry, for a person to check, price and send. The AI version writes it
 * from the facts above; without a model, a template does. Prices come from the desk's own price list (admin Products),
 * where it has them; styles without a price keep a [tier price] placeholder.
 */
export async function draftReply(i: InquiryDoc): Promise<ReplyDraft> {
  const f = facts(i, (await readContent()).prices);
  // the template is free; the model is used only while the day's budget allows (budget.ts)
  if (aiReady() && (await modelAllowed())) {
    try {
      const { model, providerOptions } = kaiModel();
      spend();
      const { output, steps, totalUsage } = await generateText({
        model,
        instructions: `You draft replies for the Chime Long wholesale footwear trade desk (Guangzhou). Write to the buyer in the language of their note if it isn't English, else English. Warm, concise, businesslike: under 200 words. Use only the facts given. Prices: where a style has pricePerPairFOB, quote exactly that per pair (FOB, USD), with its line total and quoteTotalFOB if given; never change, round or discount them. For styles without a price, and for anything else not given, put a [tier price] or [date] placeholder for the desk to fill in. Never invent a price, discount or delivery date. Confirm the styles and quantities, answer what the note asks, offer samples, and ask at most two clarifying questions that would let the desk quote (e.g. trade terms DDP/FOB, target delivery month, size curve). Sign off as "Chime Long trade desk". The summary is for the desk, not the buyer. You are ${ASSISTANT.name}.`,
        prompt: JSON.stringify(f),
        output: Output.object({ schema: SCHEMA }),
        maxOutputTokens: 700,
        providerOptions,
        maxRetries: 0,
      });
      await record(steps.length, (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0));
      return { ...output, source: "ai" };
    } catch (e) {
      backOff(e);
      console.error("[assistant] reply draft fell back to the template", e);
    }
  }
  return template(f);
}

function template(f: ReturnType<typeof facts>): ReplyDraft {
  const n = (x: number) => x.toLocaleString("en-US");
  const first = f.company;
  const lines = f.styles.length
    ? f.styles.map((s) => `- ${s.name} (${s.colour}, ${s.sizes}): ${s.cases} cases, ${n(s.pairs)} pairs, ${"pricePerPairFOB" in s ? `${s.pricePerPairFOB} per pair FOB (${s.lineTotalFOB})` : "[tier price] per pair"}`)
    : ["- Full line sheet attached, with tier pricing per style."];
  const ship = f.shipping.market
    ? `We ship to ${f.shipTo} via ${f.shipping.port} (about ${f.shipping.transit}) on ${f.shipping.terms!.join(", ")} terms.`
    : `We'll quote shipping to ${f.shipTo} with the order.`;
  const body = [
    `Dear ${first} team,`,
    ``,
    `Thank you for your inquiry (${f.ref}). Here is what you asked about:`,
    ...lines,
    ...(f.quoteTotalFOB ? [`Order total: ${f.quoteTotalFOB} FOB Guangzhou.`] : []),
    ``,
    f.totalPairs >= 1000 ? `At ${n(f.totalPairs)} pairs your order reaches our tier pricing.` : `Our MOQ is ${f.terms.moq}; tier pricing starts ${f.terms.tierPricing}.`,
    `Samples reach you in ${f.terms.samples}; bulk production takes ${f.terms.bulk} after you approve them. Payment is ${f.terms.payment}.`,
    ship,
    ``,
    `To finalise the quote, could you confirm your preferred trade terms (DDP or FOB) and the month you need the goods on your shelves?`,
    ``,
    `Best regards,`,
    `Chime Long trade desk`,
  ].join("\n");
  return {
    subject: `Re: your wholesale inquiry ${f.ref} - line sheet and pricing`,
    body,
    summary: [
      `${f.wants} from a ${f.buyerType.toLowerCase()} shipping to ${f.shipTo}: ${f.styles.length ? `${f.styles.length} style(s), ${n(f.totalPairs)} pairs` : "full line sheet"}.`,
      f.note ? `Their note: "${f.note.slice(0, 160)}${f.note.length > 160 ? "…" : ""}"` : "No note: ask what they're stocking for.",
      ...(f.sentFromChat ? ["Sent from the chat with Kai on the site."] : []),
      f.unpricedStyles.length
        ? `No price yet for ${f.unpricedStyles.join(", ")}: fill in the [tier price] placeholders, or set prices in Products.`
        : "Prices are from your price list (FOB); check them before sending.",
      "Confirm trade terms and delivery month.",
    ],
    source: "template",
  };
}
