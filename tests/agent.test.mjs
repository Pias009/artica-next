// Kai's topics and the AI agent view's suggestions: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { topicOf } from "../src/lib/assistant/topics.ts";
import { suggestions } from "../src/lib/admin/agent-suggestions.ts";

test("each message gets one topic, the narrow ones first", () => {
  assert.equal(topicOf("What's the MOQ for kids boots?"), "moq");
  assert.equal(topicOf("How much per pair for 600 pairs?"), "price");
  assert.equal(topicOf("Can I get samples of the Nord?"), "samples");
  assert.equal(topicOf("How long does shipping to Germany take?"), "shipping");
  assert.equal(topicOf("Can you put my logo on the box?"), "label");
  assert.equal(topicOf("Do you accept letter of credit?"), "payment");
  assert.equal(topicOf("Show me waterproof boots"), "styles");
  assert.equal(topicOf("Can I talk to a person?"), "contact");
  assert.equal(topicOf("hello"), "other");
  // the planning desk's open questions are planning
  assert.equal(topicOf("hello", "plan"), "plan");
  assert.equal(topicOf("What margin will I make?", "plan"), "plan");
});

const quiet = {
  overdue: 0,
  contactWaiting: 0,
  emailsStuck: 0,
  desks: { trade: true, plan: true, model: true },
  aiReady: true,
  usage: { calls: 10, tokens: 1000, rpd: 1000, tpd: 2_000_000 },
  topics: [],
  sources: { rules: 0, model: 0, limited: 0, closed: 0 },
  emptySearches: [],
  unpriced: 0,
  live: 40,
  rising: [],
};

test("nothing to do gives one all-clear", () => {
  const s = suggestions(quiet);
  assert.equal(s.length, 1);
  assert.equal(s[0].tone, "good");
});

test("urgent things come first, with links that open the right list", () => {
  const s = suggestions({ ...quiet, overdue: 2, contactWaiting: 1, rising: ["Nord"], emptySearches: [{ q: "clogs", n: 3 }] });
  assert.deepEqual(
    s.map((x) => x.id),
    ["overdue", "contact", "searches", "rising"],
  );
  assert.equal(s[0].title, "Reply to 2 inquiries past 20 hours");
  assert.equal(s[0].action.href, "/admin/inquiries/all?status=overdue");
  assert.equal(s[1].action.href, "/admin/inquiries/all?intent=contact&status=new");
});

test("near the AI limit, and desks switched off", () => {
  const near = suggestions({ ...quiet, usage: { calls: 850, tokens: 0, rpd: 1000, tpd: 2_000_000 } });
  assert.equal(near[0].id, "limit");
  assert.match(near[0].title, /85%/);
  const off = suggestions({ ...quiet, desks: { trade: false, plan: true, model: true }, sources: { ...quiet.sources, closed: 4 } });
  assert.equal(off[0].id, "desk-off");
  assert.equal(off[0].tone, "now");
});

test("price questions point to the styles with no price", () => {
  const s = suggestions({ ...quiet, topics: [{ id: "price", label: "Prices", n: 5 }, { id: "styles", label: "Styles", n: 10 }], unpriced: 3 });
  const p = s.find((x) => x.id === "price-asks");
  assert.ok(p);
  assert.equal(p.action.href, "/admin/products?status=noprice");
});
