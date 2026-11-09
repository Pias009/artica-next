/*
 * Vela's operating teams: the admin's AI chief of staff leads 11 teams in 3 departments, each watching one part of
 * the trade desk from the site's own data (insights.ts). Shared by the HQ view and the server (chat, team switches),
 * so nothing here may import server-only code.
 */

export type TeamId =
  | "marketing"
  | "conversion"
  | "markets"
  | "trending"
  | "catalogue"
  | "showcase"
  | "seasons"
  | "web"
  | "desk"
  | "care"
  | "engineering";

export type DepartmentId = "growth" | "merchandising" | "operations";

export type TeamMember = { role: string; does: string };

export type TeamConfig = {
  id: TeamId;
  /** Shown on the team card, e.g. G-01. */
  code: string;
  name: string;
  short: string;
  department: DepartmentId;
  mission: string;
  members: TeamMember[];
  questions: string[];
  /** Words that send a question to this team (lower-case, whole words). */
  keywords: RegExp;
};

export const AGENT = { name: "Vela", title: "Chief of staff" } as const;

export const DEPARTMENTS: { id: DepartmentId; name: string; purpose: string }[] = [
  { id: "growth", name: "Growth & marketing", purpose: "Bring the right buyers in and turn visits into inquiries" },
  { id: "merchandising", name: "Catalogue & merchandising", purpose: "The right styles, shown well, ready for each season" },
  { id: "operations", name: "Trade desk & engineering", purpose: "Fast replies, a smooth site, nothing broken" },
];

export const TEAMS: TeamConfig[] = [
  {
    id: "marketing",
    code: "G-01",
    name: "Marketing & channels",
    short: "Marketing",
    department: "growth",
    mission: "Find which channels bring buyers who actually inquire, and where to push next.",
    members: [
      { role: "Campaign lead", does: "Decides which channel to push next" },
      { role: "Channel analyst", does: "Tracks visits and inquiries by Google, LinkedIn, Instagram…" },
      { role: "Lead-magnet manager", does: "Watches line-sheet signups" },
    ],
    questions: ["Which channels brought buyers who sent inquiries this month?", "Where should we spend our marketing effort next?"],
    keywords: /\b(marketing|social|linkedin|instagram|facebook|tiktok|google|seo|channels?|campaigns?|ads?|sources?|referr\w*|signups?|line[- ]?sheet)\b/,
  },
  {
    id: "conversion",
    code: "G-02",
    name: "Conversion",
    short: "Conversion",
    department: "growth",
    mission: "Turn visits into inquiries: follow the funnel and remove friction from the inquiry form.",
    members: [
      { role: "Funnel lead", does: "Follows visit → catalog → style → form → sent" },
      { role: "Form specialist", does: "Finds where inquiry forms are abandoned" },
      { role: "Exit analyst", does: "Spots the pages where visits end" },
    ],
    questions: ["Walk me through the inquiry funnel for the last 7 days.", "Where do buyers drop off before sending an inquiry?"],
    keywords: /\b(conver\w*|funnel|drop[- ]?off|abandon\w*|forms?|exits?|bounce\w*)\b/,
  },
  {
    id: "markets",
    code: "G-03",
    name: "Markets",
    short: "Markets",
    department: "growth",
    mission: "Know which countries buy, which only browse, and which new markets are opening up.",
    members: [
      { role: "Market lead", does: "Ranks countries by inquiries" },
      { role: "Demand mapper", does: "Finds countries that visit but don't inquire" },
      { role: "New-market scout", does: "Flags first inquiries from new countries" },
    ],
    questions: ["Which countries send the most inquiries?", "Which markets visit a lot but never inquire?"],
    keywords: /\b(markets?|countr\w*|regions?|international|export\w*|europe|usa|uk|germany|where are)\b/,
  },
  {
    id: "trending",
    code: "G-04",
    name: "Trending styles",
    short: "Trending",
    department: "growth",
    mission: "Spot which styles are heating up or cooling down before the next order cycle.",
    members: [
      { role: "Trend lead", does: "Compares this month's interest with last month" },
      { role: "List watcher", does: "Tracks styles added to inquiry lists" },
      { role: "Badge curator", does: "Suggests Trending and Top reorder badges" },
    ],
    questions: ["Which styles are trending up right now?", "Which styles are losing interest?"],
    keywords: /\b(trend\w*|rising|hot|popular|heating|cooling|falling|momentum)\b/,
  },
  {
    id: "catalogue",
    code: "M-01",
    name: "Catalogue research",
    short: "Catalogue",
    department: "merchandising",
    mission: "Know which styles buyers ask for, which they ignore, and what to add or retire.",
    members: [
      { role: "Research lead", does: "Ranks the most and least asked-for styles" },
      { role: "Catalogue analyst", does: "Finds live styles nobody asks about" },
      { role: "Page reviewer", does: "Flags style pages people view but don't inquire on" },
    ],
    questions: ["Which styles do buyers ask for most, and which never?", "Which style pages get views but no inquiries?"],
    keywords: /\b(catalog\w*|styles?|products?|range|best[- ]?sell\w*|retire|drop|add new|shoes?|boots?|sneakers?|sandals?)\b/,
  },
  {
    id: "showcase",
    code: "M-02",
    name: "Showcase & featuring",
    short: "Showcase",
    department: "merchandising",
    mission: "Put the styles buyers want first: featured spots, badges and the home page showcases.",
    members: [
      { role: "Merchandising lead", does: "Owns what the site shows first" },
      { role: "Feature auditor", does: "Checks featured styles against real demand" },
      { role: "Home curator", does: "Keeps Hot products and New arrivals fresh" },
    ],
    questions: ["Are we featuring the right styles?", "What should go in Hot products on the home page?"],
    keywords: /\b(featur\w*|showcase\w*|badges?|home ?page|hot products?|arrivals?|merchandis\w*|highlight\w*)\b/,
  },
  {
    id: "seasons",
    code: "M-03",
    name: "Seasons & campaigns",
    short: "Seasons",
    department: "merchandising",
    mission: "Have every season's campaign, words and styles ready before buyers start ordering for it.",
    members: [
      { role: "Season lead", does: "Plans the season calendar by market" },
      { role: "Campaign editor", does: "Checks each season has its hero and campaign words" },
      { role: "Season buyer", does: "Pins the right styles to each season" },
    ],
    questions: ["Is our next season ready on the site?", "Which seasons do inquiries come in for?"],
    keywords: /\b(seasons?|seasonal|winter|summer|spring|autumn|fall|rainy|holiday|christmas)\b/,
  },
  {
    id: "web",
    code: "O-01",
    name: "Website & search",
    short: "Web",
    department: "operations",
    mission: "Make the site easy to browse, backed by how buyers actually use it and what they search for.",
    members: [
      { role: "UX lead", does: "Reviews how visits move through the site" },
      { role: "Search analyst", does: "Finds searches that return nothing" },
      { role: "Content keeper", does: "Watches unpublished and top pages" },
    ],
    questions: ["How are buyers using the website this week?", "Which searches find nothing, and what should we add?"],
    keywords: /\b(website|site|pages?|traffic|visit\w*|search\w*|mobile|desktop|devices?|navigation|ux|ui)\b/,
  },
  {
    id: "desk",
    code: "O-02",
    name: "Trade desk",
    short: "Desk",
    department: "operations",
    mission: "Answer every inquiry fast, quote it, and win the order.",
    members: [
      { role: "Desk lead", does: "Owns the inquiry pipeline" },
      { role: "Reply desk", does: "Clears new inquiries before they go overdue" },
      { role: "Deal tracker", does: "Follows quotes to won or lost" },
    ],
    questions: ["How many inquiries are waiting for a reply right now?", "What is our win rate and how fast are we replying?"],
    keywords: /\b(inquir\w*|enquir\w*|leads?|repl\w*|respon\w*|overdue|waiting|pipeline|quotes?|quoted|won|win|lost|deals?|orders?|moq|pairs)\b/,
  },
  {
    id: "care",
    code: "O-03",
    name: "Buyer care & follow-up",
    short: "Care",
    department: "operations",
    mission: "Keep buyers coming back: follow up quotes that went quiet and look after repeat buyers.",
    members: [
      { role: "Care lead", does: "Owns buyer relationships" },
      { role: "Follow-up desk", does: "Chases quotes and replies that went quiet" },
      { role: "Retention analyst", does: "Tracks repeat buyers and lost deals" },
    ],
    questions: ["Which quotes need a follow-up?", "How many buyers come back with a second inquiry?"],
    keywords: /\b(follow[- ]?ups?|chase|quiet|stale|repeat|returning|loyal\w*|retention|care|relationship\w*|emails?)\b/,
  },
  {
    id: "engineering",
    code: "O-04",
    name: "Engineering & performance",
    short: "Engineering",
    department: "operations",
    mission: "Keep the site fast and bug-free: real-visitor speed, JavaScript errors, email delivery and the AI budget.",
    members: [
      { role: "Engineering lead", does: "Owns reliability and what to fix first" },
      { role: "Performance engineer", does: "Tracks real-visitor speed (LCP, INP, CLS, TTFB)" },
      { role: "Bug hunter", does: "Collects JavaScript errors from visitors' browsers" },
      { role: "Platform keeper", does: "Watches email delivery, the database and AI limits" },
    ],
    questions: ["Are there any bugs or errors on the website right now?", "How fast is the site for real visitors, and which pages are slowest?"],
    keywords: /\b(bugs?|errors?|crash\w*|broken|exceptions?|engineer\w*|dev|developers?|speed|slow\w*|fast|performance|lcp|inp|cls|ttfb|vitals|load\w*|uptime|database|budget|tokens?)\b/,
  },
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t])) as Record<TeamId, TeamConfig>;

export const isTeamId = (v: unknown): v is TeamId => TEAMS.some((t) => t.id === v);

/** The team best suited to a question: the first whose words match, most specific first. */
export function routeQuestion(text: string): TeamId {
  const q = text.toLowerCase();
  const priority: TeamId[] = ["engineering", "seasons", "showcase", "trending", "markets", "conversion", "care", "marketing", "desk", "web", "catalogue"];
  return priority.find((id) => TEAM_BY_ID[id].keywords.test(q)) ?? "desk";
}

/** How an admin names each team ("pause the marketing team"). */
const ALIASES: Record<TeamId, RegExp> = {
  marketing: /\bmarketing\b|\bchannels?\b/,
  conversion: /\bconversions?\b|\bfunnel\b/,
  markets: /\bmarkets?\b/,
  trending: /\btrend(ing|s)?\b/,
  catalogue: /\bcatalog(ue)?\b|\bresearch\b/,
  showcase: /\bshowcase\b|\bfeatur(e|ing)\b/,
  seasons: /\bseasons?\b|\bcampaigns?\b/,
  web: /\bweb(site)?\b|\bsearch\b/,
  desk: /\b(trade )?desk\b|\binquir(y|ies)\b/,
  care: /\bcare\b|\bfollow[- ]?up\b/,
  engineering: /\bengineer(ing|s)?\b|\bdev\b|\bperformance\b/,
};

export type TeamToggle = { teams: TeamId[] | "all"; active: boolean };

/**
 * Recognises "turn off the marketing team", "pause the seasons and showcase teams", "Vela, wake all teams". The word
 * "team" is required, so an ordinary question ("why did inquiries stop?") is never taken for a switch.
 */
export function parseTeamToggle(text: string): TeamToggle | null {
  const q = text.toLowerCase();
  if (!/\bteams?\b/.test(q)) return null;
  const off = /\b(turn|switch|shut)(\s+\w+){0,4}\s+off\b|\bpause\b|\bdeactivate\b|\bdisable\b|\bstop\b|\bsleep\b/.test(q);
  const on = /\b(turn|switch)(\s+\w+){0,4}\s+on\b|\bresume\b|\bactivate\b|\benable\b|\bunpause\b|\bwake\b|\brestart\b/.test(q);
  if (off === on) return null;
  if (/\b(all|every|whole)\b/.test(q)) return { teams: "all", active: on };
  const teams = TEAMS.map((t) => t.id).filter((id) => ALIASES[id].test(q));
  return teams.length ? { teams, active: on } : null;
}
