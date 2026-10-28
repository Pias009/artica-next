/**
 * The visitor's season: which of six the site dresses for, from the country they browse from and today's date.
 * proxy.ts reads the country from the host's IP header and serves the home page built for that season; the inline
 * script in the root layout paints the matching theme before first paint. Both run `seasonOf` below, so they agree.
 * No imports: the proxy and the inline script both carry this file's logic, so it must stand alone.
 */

export const SEASON_IDS = ["spring", "summer", "rainy", "autumn", "winter", "holiday"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];
export const isSeason = (v: unknown): v is SeasonId => (SEASON_IDS as readonly unknown[]).includes(v);

/** Shown while nothing is known about the visitor (and on the plain "/" fallback). */
export const DEFAULT_SEASON: SeasonId = "winter";

/** The floating "Preview seasons" button, for checking the themes. Set NEXT_PUBLIC_SEASON_PREVIEW=off to hide it. */
export const SEASON_PREVIEW = process.env.NEXT_PUBLIC_SEASON_PREVIEW !== "off";

/** Cookies: the country we detected, the season it gives, and a season the visitor picked by hand (wins over both). */
export const SEASON_COOKIE = { country: "cl-country", season: "cl-season", pick: "cl-season-pick" } as const;

type Climate = "north" | "south" | "monsoon" | "equatorial" | "arid";
const s = (x: string) => x.split(" ") as SeasonId[];

/** Everything `seasonOf` needs, as plain data so the inline script can carry it as JSON. */
export const SEASON_DATA = {
  /** The season for each month, January first, by climate. */
  months: {
    north: s("winter winter spring spring spring summer summer summer autumn autumn autumn winter"),
    south: s("summer summer autumn autumn autumn winter winter winter spring spring spring summer"),
    monsoon: s("winter spring spring summer summer rainy rainy rainy rainy autumn autumn winter"),
    equatorial: s("rainy rainy rainy summer summer summer summer summer summer summer rainy rainy"),
    arid: s("winter winter spring spring summer summer summer summer summer autumn autumn winter"),
  } as Record<Climate, SeasonId[]>,
  /** Climates where the Nov 20 – Dec 31 gifting rush takes over. */
  holiday: ["north", "south"] as Climate[],
  /** Countries outside the default northern temperate climate (ISO 3166 alpha-2). */
  countries: {
    AU: "south", NZ: "south", AR: "south", CL: "south", UY: "south", PY: "south", ZA: "south", BR: "south", NA: "south", BW: "south", LS: "south",
    BD: "monsoon", IN: "monsoon", PK: "monsoon", NP: "monsoon", BT: "monsoon", LK: "monsoon", MM: "monsoon", TH: "monsoon", VN: "monsoon", KH: "monsoon", LA: "monsoon", PH: "monsoon",
    MY: "equatorial", SG: "equatorial", ID: "equatorial", BN: "equatorial",
    AE: "arid", SA: "arid", QA: "arid", KW: "arid", BH: "arid", OM: "arid", EG: "arid",
  } as Record<string, Climate>,
  /** Browser time zones to countries, for visitors the IP header didn't reach (local dev, other hosts). */
  zones: {
    "Asia/Dhaka": "BD", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Karachi": "PK", "Asia/Kathmandu": "NP", "Asia/Colombo": "LK",
    "Asia/Yangon": "MM", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY",
    "Asia/Singapore": "SG", "Asia/Jakarta": "ID", "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
    "Africa/Cairo": "EG", "Africa/Johannesburg": "ZA", "America/Sao_Paulo": "BR", "America/Santiago": "CL", "America/Montevideo": "UY",
    "Pacific/Auckland": "NZ",
  } as Record<string, string>,
  /** Time-zone prefixes that settle the country on their own. */
  zonePrefixes: { "Australia/": "AU", "America/Argentina/": "AR" } as Record<string, string>,
};
export type SeasonData = typeof SEASON_DATA;

/** The season in `country` on `date`. Unknown countries get the northern temperate calendar. Self-contained. */
export function seasonOf(country: string, date: Date, data: SeasonData): SeasonId {
  const climate = data.countries[country] ?? "north";
  const m = date.getMonth();
  if (data.holiday.includes(climate) && ((m === 10 && date.getDate() >= 20) || m === 11)) return "holiday";
  return data.months[climate][m];
}

/**
 * Runs in the page <head> before first paint: sets <html data-season> from the visitor's pick, else the proxy's
 * season cookie, else works it out from the browser's time zone. Self-contained (it is printed into the page).
 */
export function paintSeason(data: SeasonData, ids: readonly string[], cookies: typeof SEASON_COOKIE, of: typeof seasonOf) {
  try {
    const read = (name: string) => document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"))?.[1];
    let season = read(cookies.pick) || read(cookies.season);
    if (!season || !ids.includes(season)) {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const prefix = Object.keys(data.zonePrefixes).find((p) => zone.startsWith(p));
      const country = read(cookies.country) || data.zones[zone] || (prefix ? data.zonePrefixes[prefix] : "");
      season = of(country, new Date(), data);
    }
    document.documentElement.dataset.season = season;
    // the visitor switched the season animations off (components/season/effects.ts)
    if (localStorage.getItem("cl-effects") === "off") document.documentElement.dataset.effects = "off";
  } catch {
    // no cookies or Intl: the default theme stays
  }
}

/**
 * The script tag's body: paintSeason called with its data. Built once in next.config.ts and read back from
 * process.env.SEASON_SCRIPT (see paintScript), so every bundle carries the same bytes.
 */
export const seasonScript = () =>
  `(${paintSeason.toString()})(${JSON.stringify(SEASON_DATA)},${JSON.stringify(SEASON_IDS)},${JSON.stringify(SEASON_COOKIE)},${seasonOf.toString()})`;

/** What the layout prints and /admin's CSP allows by hash; the fallback is for code running outside Next (tests). */
export const paintScript = () => process.env.SEASON_SCRIPT ?? seasonScript();

/* ---- How each season presents itself ---- */

export type SeasonTheme = {
  id: SeasonId;
  name: string;
  /** The edit's name in the hero eyebrow and the showcase. */
  edit: string;
  /** Showcase headline, with the closing words set in the italic accent. */
  title: [lead: string, accent: string];
  line: string;
  icon: "flower" | "sun" | "rain" | "leaf" | "snow" | "gift";
  /** Glow tints for the hero spotlight, one per pair on show. */
  tints: string[];
};

export const SEASONS: Record<SeasonId, SeasonTheme> = {
  spring: {
    id: "spring",
    name: "Spring",
    edit: "Spring edit",
    title: ["Light steps for ", "the first warm days."],
    line: "Sneakers, flats and loafers your customers reach for when the coats come off.",
    icon: "flower",
    tints: ["#b9d4a8", "#f2c4cf", "#cfe0b8", "#f5d9c4", "#c9d9ec"],
  },
  summer: {
    id: "summer",
    name: "Summer",
    edit: "Summer edit",
    title: ["Open-air pairs ", "for long, hot days."],
    line: "Cork sandals, slides and sport sandals, packed by the case for the warm-weather rush.",
    icon: "sun",
    tints: ["#f2c27a", "#e9a76b", "#f5d79c", "#d9b48a", "#9fd0d4"],
  },
  rainy: {
    id: "rainy",
    name: "Rainy season",
    edit: "Monsoon edit",
    title: ["Built for wet streets ", "and sudden showers."],
    line: "Water-resistant boots and closed-toe sport sandals that shrug off the monsoon.",
    icon: "rain",
    tints: ["#9cc3c6", "#b8ccd6", "#8fb5ad", "#c5d3dc", "#a9c7c9"],
  },
  autumn: {
    id: "autumn",
    name: "Autumn",
    edit: "Autumn edit",
    title: ["Boots for crisp ", "mornings and falling leaves."],
    line: "Chelsea, ankle and lace-up boots in leather and suede, ready for the first cold snap.",
    icon: "leaf",
    tints: ["#c98b52", "#b86b3c", "#d9a066", "#a0745a", "#c7a27a"],
  },
  winter: {
    id: "winter",
    name: "Winter",
    edit: "Winter edit",
    title: ["Warm, dry feet ", "down to −25°C."],
    line: "Snow boots, shearling and insulated hikers for the coldest weeks of the year.",
    icon: "snow",
    tints: ["#c98b52", "#b9a38c", "#8a7a6c", "#d9d1c4", "#c3a6d6"],
  },
  holiday: {
    id: "holiday",
    name: "Holiday",
    edit: "Holiday edit",
    title: ["Gift-ready pairs ", "for the busiest weeks."],
    line: "Patent, pumps, Mary Janes and fur-cuff boots for party season and gifting.",
    icon: "gift",
    tints: ["#c25a6e", "#d8b36a", "#a8324a", "#e3c48f", "#b3485c"],
  },
};
