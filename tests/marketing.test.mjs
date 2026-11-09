// The marketing desk's pure rules: `npm test`. Node runs the TypeScript modules directly (type stripping).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  audienceLabel,
  audienceMatches,
  buildUtm,
  cleanTags,
  emailHtml,
  normalTrackerId,
  parseImport,
  priorityFromScore,
  priorityId,
  renderTemplate,
  scoreSubscriber,
  subscriberId,
  textToHtml,
  trackerIdOk,
  unknownTags,
} from "../src/lib/marketing/model.ts";
import { unsubscribePath, unsubscribeReady, unsubscribeToken, unsubscribeTokenOk } from "../src/lib/marketing/unsubscribe.ts";

const none = { inquiries: 0, quoted: 0, won: 0, pairs: 0, lastInquiryDays: null };

test("subscriber ids are zero-padded and carry their tier", () => {
  assert.equal(subscriberId(42), "SUB-00042");
  assert.equal(subscriberId(123456), "SUB-123456");
  assert.equal(subscriberId(0), "SUB-00001");
  assert.equal(priorityId("SUB-00042", "vip"), "P1·SUB-00042");
  assert.equal(priorityId("SUB-00042", "low"), "P4·SUB-00042");
});

test("orders and quotes outrank plain signups", () => {
  const signup = scoreSubscriber(none, "line-sheet");
  const asked = scoreSubscriber({ ...none, inquiries: 1, lastInquiryDays: 10 }, "inquiry");
  const quoted = scoreSubscriber({ ...none, inquiries: 2, quoted: 1, pairs: 1200, lastInquiryDays: 10 }, "inquiry");
  const won = scoreSubscriber({ inquiries: 3, quoted: 2, won: 2, pairs: 5000, lastInquiryDays: 5 }, "inquiry");
  assert.ok(signup < asked && asked < quoted && quoted < won);
  assert.equal(priorityFromScore(signup), "low");
  assert.equal(priorityFromScore(asked), "normal");
  assert.equal(priorityFromScore(quoted), "high");
  assert.equal(priorityFromScore(won), "vip");
  assert.ok(won <= 100);
  // asking the desk to write beats a plain line-sheet signup
  assert.ok(scoreSubscriber(none, "talk-to-desk") > signup);
});

test("merge tags fill in, fall back, and never leave braces", () => {
  const vars = { first_name: "Ana", company: "Shoe Box" };
  assert.equal(renderTemplate("Hello {{first_name|there}}", vars), "Hello Ana");
  assert.equal(renderTemplate("Hello {{ first_name | there }}", {}), "Hello there");
  assert.equal(renderTemplate("For {{company}} in {{country}}", vars), "For Shoe Box in ");
  assert.equal(renderTemplate("{{nonsense|x}} {{nope}}", vars), "x ");
  assert.deepEqual(unknownTags("{{company}} {{frist_name}} {{frist_name}}"), ["frist_name"]);
});

test("email HTML escapes everything but its own markup", () => {
  const html = textToHtml('Hi <script>alert(1)</script>\n\n**New** [styles](https://x.com/a?b=1&c=2) at https://x.com/catalog');
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("<strong>New</strong>"));
  assert.ok(html.includes('<a href="https://x.com/a?b=1&amp;c=2"'));
  assert.ok(html.includes('<a href="https://x.com/catalog"'));
  // javascript: links never become links
  assert.ok(!textToHtml("[x](javascript:alert(1))").includes("<a "));
  const page = emailHtml({ body: "Hi", preheader: "<b>", unsubscribeUrl: "https://x.com/u?s=1&t=2", company: "Chime Long" });
  assert.ok(page.includes("&lt;b&gt;") && page.includes("Unsubscribe") && page.includes("s=1&amp;t=2"));
});

test("pasted imports: header and bad rows skipped, repeats once, tags cleaned", () => {
  const { rows, skipped } = parseImport("email,company\nANNA@Shoes.co.uk, Anna's, UK, Boots Winter!\nnot-an-email\nanna@shoes.co.uk\nbuyer@store.de\t\tDE");
  assert.equal(skipped, 1);
  assert.deepEqual(
    rows.map((r) => r.email),
    ["anna@shoes.co.uk", "buyer@store.de"],
  );
  assert.equal(rows[0].company, "Anna's");
  assert.deepEqual(rows[0].tags, ["boots", "winter"]);
  assert.equal(rows[1].country, "DE");
  assert.deepEqual(cleanTags([" Trade Show 2026 ", "trade-show-2026", ""]), ["trade-show-2026"]);
});

test("audiences: subscribed only, by tier and any tag", () => {
  const s = { priority: "high", tags: ["boots", "uk"], status: "subscribed" };
  assert.equal(audienceMatches(s, { priorities: [], tags: [] }), true);
  assert.equal(audienceMatches(s, { priorities: ["vip", "high"], tags: [] }), true);
  assert.equal(audienceMatches(s, { priorities: ["vip"], tags: [] }), false);
  assert.equal(audienceMatches(s, { priorities: [], tags: ["sandals", "uk"] }), true);
  assert.equal(audienceMatches(s, { priorities: [], tags: ["sandals"] }), false);
  assert.equal(audienceMatches({ ...s, status: "unsubscribed" }, { priorities: [], tags: [] }), false);
  assert.equal(audienceLabel({ priorities: ["vip", "high"], tags: ["boots"] }), "VIP, High, tagged boots");
  assert.equal(audienceLabel({ priorities: [], tags: [] }), "Every subscriber");
});

test("tracking ids are checked against each vendor's format", () => {
  assert.equal(trackerIdOk("meta", "123456789012345"), true);
  assert.equal(trackerIdOk("meta", "12345"), false);
  assert.equal(trackerIdOk("ga4", " g-ab12cd34ef "), true);
  assert.equal(normalTrackerId("ga4", " g-ab12cd34ef "), "G-AB12CD34EF");
  assert.equal(trackerIdOk("ga4", "UA-12345-1"), false);
  assert.equal(trackerIdOk("gtm", "GTM-ABC1234"), true);
  assert.equal(trackerIdOk("gads", "AW-123456789"), true);
  assert.equal(trackerIdOk("linkedin", "1234567"), true);
  assert.equal(trackerIdOk("tiktok", "C4ABCDEFGHIJKLMNOPQR"), true);
  assert.equal(trackerIdOk("clarity", "ABCD1234EF"), true);
  assert.equal(normalTrackerId("clarity", "ABCD1234EF"), "abcd1234ef");
  // nothing that could break out of a script URL
  assert.equal(trackerIdOk("ga4", 'G-AB12"><script>'), false);
});

test("UTM links: added, replaced, cleaned; required parts enforced", () => {
  assert.equal(
    buildUtm("https://x.com/catalog?q=boots&utm_source=old", { source: "Instagram", medium: "paid social", campaign: "Winter 2026!" }),
    "https://x.com/catalog?q=boots&utm_source=instagram&utm_medium=paid_social&utm_campaign=winter_2026",
  );
  assert.equal(buildUtm("https://x.com/", { source: "a", medium: "b", campaign: "c", content: "reel 1" }), "https://x.com/?utm_source=a&utm_medium=b&utm_campaign=c&utm_content=reel_1");
  assert.equal(buildUtm("https://x.com/", { source: "a", medium: "b", campaign: "" }), null);
  assert.equal(buildUtm("javascript:alert(1)", { source: "a", medium: "b", campaign: "c" }), null);
  assert.equal(buildUtm("not a url", { source: "a", medium: "b", campaign: "c" }), null);
});

test("unsubscribe links are signed per subscriber", () => {
  const secret = "a-long-enough-secret-value";
  const t = unsubscribeToken("SUB-00042", secret);
  assert.equal(unsubscribeTokenOk("SUB-00042", t, secret), true);
  assert.equal(unsubscribeTokenOk("SUB-00043", t, secret), false);
  assert.equal(unsubscribeTokenOk("SUB-00042", t.slice(1), secret), false);
  assert.equal(unsubscribeTokenOk("SUB-00042", t, "another-long-secret-value"), false);
  assert.equal(unsubscribeTokenOk("anything", t, secret), false);
  // no secret, or a short one: no valid links at all
  assert.equal(unsubscribeReady("short"), false);
  assert.equal(unsubscribeTokenOk("SUB-00042", unsubscribeToken("SUB-00042", "short"), "short"), false);
  assert.match(unsubscribePath("SUB-00042"), /^\/unsubscribe\?s=SUB-00042&t=/);
});
