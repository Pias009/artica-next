import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { backOff, modelAllowed, record, spend } from "./budget";
import { aiReady, kaiModel } from "./model";
import { productDetails } from "./skills";
import { COMPANY } from "../company";

/*
 * The admin panel's AI helpers: a listing description for a style, headline ideas for a home-page section, and
 * answers about the panel's own figures. Each uses the AI model while the day's budget allows (budget.ts) and falls
 * back to a written-out answer from the same facts, so the buttons always do something useful.
 */

async function ask<T extends z.ZodType>(instructions: string, prompt: string, schema: T, maxOutputTokens = 500): Promise<z.infer<T> | null> {
  if (!aiReady() || !(await modelAllowed())) return null;
  try {
    const { model, providerOptions } = kaiModel();
    spend();
    const { output, steps, totalUsage } = await generateText({
      model,
      instructions,
      prompt,
      output: Output.object({ schema }),
      maxOutputTokens,
      providerOptions,
      maxRetries: 0,
    });
    await record(steps.length, (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0));
    return output as z.infer<T>;
  } catch (e) {
    backOff(e);
    console.error("[admin-ai] fell back to the written answer", e);
    return null;
  }
}

/** A catalogue description for a style, from its real materials and spec. */
export async function describeStyle(id: string, name: string) {
  const d = productDetails({ style: id });
  if (!d.found) return "";
  const facts = {
    name,
    type: d.type,
    line: d.line,
    colour: d.color,
    materials: d.materials,
    sizes: d.sizeRange,
    rating: d.rating ?? null,
    casePack: d.casePack,
    current: d.description,
  };
  const out = await ask(
    `You write product descriptions for ${COMPANY.name}'s wholesale footwear catalogue. Audience: shop buyers. 2–3 sentences, under 60 words, concrete: what it is, what it's made of, why it sells. Use only the facts given; no prices, no claims of certification, no exclamation marks.`,
    JSON.stringify(facts),
    z.object({ description: z.string() }),
    300,
  );
  if (out?.description) return out.description.trim();
  const mats = d.materials
    .slice(0, 2)
    .map((m) => m.split(": ")[1] ?? m)
    .join(" and ");
  return `The ${name} is a ${d.type.toLowerCase()} in ${d.color.toLowerCase()}${mats ? `, made with ${mats.toLowerCase()}` : ""}${d.rating ? ` and rated to ${d.rating}` : ""}. Sizes ${d.sizeRange}, packed in mixed-size cases of 12, from 300 pairs per style.`;
}

export type CopyIdea = { tone: string; title: string; sub: string };

/** Three headline and supporting-line ideas for a home-page section. */
export async function sectionIdeas(label: string, title: string, sub: string): Promise<CopyIdea[]> {
  const out = await ask(
    `You write headlines for a B2B wholesale footwear website (factory in Guangzhou; buyers are shops, distributors and brands). Give three options for a home-page section: "Shorter", "Bolder", "Benefit first". Headline under 9 words, sentence case; wrap the closing words in *asterisks* for the italic accent. Supporting line under 18 words. No exclamation marks, no prices.`,
    JSON.stringify({
      section: label,
      currentHeadline: title || null,
      currentLine: sub || null,
    }),
    z.object({
      ideas: z.array(z.object({ tone: z.string(), title: z.string(), sub: z.string() })).length(3),
    }),
    400,
  );
  if (out?.ideas?.length) return out.ideas;
  const base = (title || label).replace(/[.*]/g, "").trim();
  return [
    {
      tone: "Shorter",
      title: `${base.split(/[,:–]/)[0]}.`,
      sub: sub.split(/[,.]/)[0] ? `${sub.split(/[,.]/)[0]}.` : "From 300 pairs per style.",
    },
    {
      tone: "Bolder",
      title: `${base.split(/[,:–]/)[0]}, *built to sell through.*`,
      sub: "Factory-direct, samples in 10 days.",
    },
    {
      tone: "Benefit first",
      title: "Fuller shelves, *fewer returns.*",
      sub: sub || "Proven styles, packed by the case for your market.",
    },
  ];
}

/** An answer about the panel's figures, from a compact summary of them. */
export async function answerAdmin(question: string, facts: object) {
  const out = await ask(
    `You are the admin assistant for the Chime Long wholesale footwear trade desk. Answer the admin's question from the JSON facts only (real figures from the site's database). Be brief: 2–5 sentences or a few bullets. Name companies, styles and numbers exactly as given. If the facts don't cover it, say what you can't see. When asked for a reply draft, write one under 150 words with [tier price] placeholders and no invented dates or prices.`,
    `Question: ${question}\n\nFacts: ${JSON.stringify(facts)}`,
    z.object({ answer: z.string() }),
    600,
  );
  return out?.answer?.trim() ?? null;
}
