import { ASSISTANT } from "./persona";
import { aboutCompany } from "./skills";
import { COMPANY } from "../company";

/*
 * How Kai answers questions about itself, and how it stays professional whatever it's sent, when it answers without
 * an AI model (local.ts). The AI model follows the same rules from its instructions (persona.ts). Checked first, in
 * order: anything risky or rude never reaches the product search. Every reply is calm, brief and never repeats the
 * buyer's words back. `redirect` replies decline: they stay to one short sentence and the chat shows ways back to
 * buying under them (the offTopic options in skills.ts).
 */

type Rule = { test: RegExp; reply: () => string; redirect: boolean };

const RULES: Rule[] = [
  // card, bank or ID numbers and passwords: never wanted, never repeated
  {
    test: /\b(?:\d[ -]?){13,19}\b|\b(password|passcode|cvv|cvc|pin code|iban|swift code|bank account|card number|credit card|passport number)\b/,
    reply: () => "Please don't share passwords, card, bank or ID details here; I don't need them. Payment is arranged later, on a proforma invoice from the trade desk.",
    redirect: true,
  },
  // sexual, hateful, threatening or violent messages: no engagement with the content
  {
    test: /\b(sex|sexy|porn\w*|nude|naked|horny|boobs?|penis|vagina|slut|whore|rape|nazi|kill (you|u|yourself)|i('ll| will) (kill|hurt|find) (you|u)|bomb|terroris\w*)\b/,
    reply: () => "Sorry, I can only help with wholesale footwear.",
    redirect: true,
  },
  // swearing, insults and frustration: acknowledge, don't repeat, offer help or a person
  // strong profanity always; mild words only when aimed at Kai ("you're useless"), not "stupid question, but…"
  {
    test: /\b(f+u+c+k+\w*|f\*+k\w*|fck\w*|fuk\w*|wtf|stfu|sh[i1*]t\w*|bullshit|bitch\w*|bastard|asshole|a\*+hole|dickhead|cunt|motherf\w*|piss(ed)? off|shut up|you suck|go to hell)\b|\b(you('re| are)?|u r|ur|this (bot|chat|assistant|thing|site)|kai|bot)\b.{0,20}\b(stupid|dumb|idiot\w*|useless|moron|retard\w*|crap|rubbish|garbage|trash|worthless)\b|\b(stupid|dumb|useless|idiot\w*|moron|worthless)\s+(bot|ai|assistant|machine|thing|chat)\b/,
    reply: () => `I'm sorry this hasn't been helpful. You can also reach the trade desk at ${COMPANY.email.general}.`,
    redirect: true,
  },
  // attempts to change the rules, the role or to see the instructions
  {
    test: /\b(ignore (all |any |your |the |previous |prior )*(instructions|rules|prompts?)|system prompt|(show|reveal|tell me|print|repeat) (me )?(your )?(instructions|prompt|rules)|developer mode|jailbreak|dan mode|pretend (to be|you are|you're)|act as|role ?-?play|from now on you are)\b/,
    reply: () => "Sorry, I can't change how I work or share my instructions.",
    redirect: true,
  },
  // which AI is behind it
  {
    test: /\b((which|what) (ai|model|llm|language model|engine)|chat ?gpt|gpt-?\d|openai|grok|claude|gemini|llama|deepseek|who (made|built|created|developed|programmed|trained) you|are you (chat ?gpt|grok|claude|gemini))\b/,
    reply: () =>
      "I'm an AI assistant built for Chime Long on a large language model. I answer from Chime Long's own catalogue and terms, and the trade desk team confirms every price and order. How can I help with your order?",
    redirect: false,
  },
  // who are you / are you a bot
  {
    test: /\b(who are (you|u)|who r u|what are you|what('s| is) your name|your name|introduce yourself|are (you|u) (a |an )?(bot|robot|ai|human|real|person|machine|chatbot|computer)|am i (talking|speaking|chatting) (to|with))\b/,
    reply: () => {
      const a = aboutCompany();
      return `I'm ${ASSISTANT.name}, an AI trade assistant for ${a.brand}, a wholesale footwear manufacturer and exporter based in ${a.basedIn}. I'm not a person: I help buyers choose styles, understand our terms and send inquiries, and the trade desk team confirms every price and order. How can I help you today?`;
    },
    redirect: false,
  },
  // where are you from
  {
    test: /\b(where (are|r) (you|u)( guys)?( from| based| located)?|where('s| is| are) (chime long|the company|your (company|factory|office|business|team))|which country (are|is)|where do you (operate|ship from|make))\b/,
    reply: () => {
      const a = aboutCompany();
      return `${a.brand} is based in ${a.basedIn} and exports worldwide, including ${a.markets.slice(0, 4).join(", ")} and more. As an AI assistant I don't live anywhere: I work on this website for the Guangzhou trade desk. You can [verify us](/verify) or book a video tour of the factory on [meet us](/meet).`;
    },
    redirect: false,
  },
  // what do you sell / who do you sell to
  {
    test: /\b(what (do|does) (you|u|your company|chime long|the company|you guys) (sell|do|make|offer|produce|supply|manufacture)|what (products|kind of (products|shoes|footwear))|what is chime long|about (the |your )?company|tell me about (you|chime long|the company)|who (are|is) your (customers|clients|buyers)|(do|can) (you|i) (sell|buy|order) (to individuals|to consumers|retail|(a |just )?(single|one|1) pairs?|a pair))\b/,
    reply: () => {
      const a = aboutCompany();
      const lines = a.range.filter((r) => r.styles);
      const total = lines.reduce((n, r) => n + r.styles, 0);
      return `${a.brand} makes and exports footwear wholesale: ${total} styles for ${lines.map((r) => `${r.line.toLowerCase()} (${r.styles})`).join(", ")}, including ${a.categories.slice(0, 8).join(", ").toLowerCase()}. We sell to businesses only, retailers, distributors and private-label brands, from ${a.minimumOrder}; not single pairs to consumers. ${a.services[2]} and we ship worldwide. Browse the [catalog](/catalog), or tell me your market and I'll suggest styles.`;
    },
    redirect: false,
  },
  // personal questions to an AI
  {
    test: /\b(how old are (you|u)|your age|are (you|u) (married|single|happy|sad|lonely|alive|conscious)|do (you|u) (have )?(feelings|emotions|a family|love me|like me)|(boy|girl)friend|date me|marry me)\b/,
    reply: () => "I'm an AI assistant, so I don't have a personal life.",
    redirect: true,
  },
];

/** Small talk that closes a conversation. */
const THANKS = /^((thanks?|thank (you|u)|thx|ty|cheers|great|perfect|ok(ay)?|cool|got it|bye|goodbye|see (you|ya)|that'?s all)[\s,!.]*)+$/;

/** Clearly not about footwear, buying or the company: declined, with ways back. */
// words that never come up in a footwear order; ones that can ("news on new arrivals", "cookies", "a business
// relationship") are left out on purpose, so real buyers aren't turned away
const OFF_TOPIC = /\b(jokes?|weather|politic\w*|elections?|religio\w*|recipes?|cooking|homework|essays?|coding|programming|python|javascript|math(s|ematics)?|bitcoin|crypto\w*|stock market|football|soccer|cricket|movies?|films?|music|songs?|poems?|horoscope|lottery|dating|medical advice|doctor|lawyer|legal advice|tax advice|investment advice|hotel|flights?|video games?|celebrit\w*)\b/;

export const OFF_TOPIC_REPLY = "Sorry, that's outside what I can help with. I'm here for wholesale footwear.";

export type Conduct = { text: string; redirect: boolean };

/** Kai's answer when the message is about Kai, the company, or out of bounds; null to let the sales engine answer. */
export function conductReply(message: string, shoeWords: RegExp): Conduct | null {
  const t = message.toLowerCase().replace(/\s+/g, " ").trim();
  for (const r of RULES) if (r.test.test(t)) return { text: r.reply(), redirect: r.redirect };
  if (THANKS.test(t)) return { text: "You're welcome. I'm here if you need anything else, and the trade desk replies to inquiries within 24 hours.", redirect: false };
  if (OFF_TOPIC.test(t) && !shoeWords.test(t)) return { text: OFF_TOPIC_REPLY, redirect: true };
  return null;
}
