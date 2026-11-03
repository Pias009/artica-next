/*
 * Countries by name, from the runtime's own region names ("Germany" → "DE"), plus what people type ("UK", "USA").
 * Shared by Kai and the business planner.
 */

const REGION = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_CODE: Record<string, string> = { usa: "US", america: "US", "united states of america": "US", uk: "GB", england: "GB", britain: "GB", uae: "AE", emirates: "AE", korea: "KR", holland: "NL" };
/** Every country the runtime knows, A–Z, for pickers. */
export const COUNTRIES: { code: string; name: string }[] = [];
for (let a = 65; a <= 90; a++)
  for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    try {
      const name = REGION.of(code);
      if (name && name !== code && !/unknown/i.test(name)) {
        COUNTRY_CODE[name.toLowerCase()] ??= code;
        if (!["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ"].includes(code)) COUNTRIES.push({ code, name });
      }
    } catch {}
  }
COUNTRIES.sort((x, y) => x.name.localeCompare(y.name));

/** "Germany", "de", "DE" → { code: "DE", name: "Germany" }; null when unknown. */
export function country(input: string | null | undefined) {
  const s = (input ?? "").trim();
  if (!s) return null;
  const code = /^[a-z]{2}$/i.test(s) ? s.toUpperCase() : COUNTRY_CODE[s.toLowerCase()];
  const name = code && REGION.of(code);
  return code && name && name !== code ? { code, name } : null;
}

/** The first country named in free text ("we sell in Germany and…" → Germany), longest names first. */
const COUNTRY_NAMES = Object.keys(COUNTRY_CODE).filter((n) => n.length > 3).sort((a, b) => b.length - a.length);
export function countryIn(text: string) {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\s]/gu, " ")} `;
  const hit = COUNTRY_NAMES.find((n) => t.includes(` ${n} `)) ?? ["usa", "uk", "uae"].find((n) => t.includes(` ${n} `));
  return hit ? country(hit) : null;
}

/** A country's name as it reads in a sentence: "the United States", "the Netherlands", "Germany". */
export const inSentence = (name: string) => (/^(United |Netherlands|Philippines|Czech|Dominican|Central African|Bahamas|Gambia|Maldives)/.test(name) ? `the ${name}` : name);
