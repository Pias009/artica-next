// The business planner's arithmetic: `npm test`. Node runs the TypeScript module directly (type stripping).
import assert from "node:assert/strict";
import { test } from "node:test";
import { buyNow, cashflow, freightCost, landedCost, leadDays, outcomes, priceForMargin, seasonWindows, timeWindows } from "../src/lib/planner/core.ts";

const NORTH = "winter winter spring spring spring summer summer summer autumn autumn autumn winter".split(" ");
// Germany: 45 days production, 36 at sea, 7 to the shelf; first orders add 10 days of samples and 7 of review
const LEAD = { bulk: 45, transit: 36, prep: 7, samples: 10, review: 7, safety: 14 };
const TODAY = new Date(2026, 9, 31);
const day = (d) => d.toISOString().slice(0, 10);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("lead time: reorders 88 days, first orders 105", () => {
  assert.equal(leadDays(LEAD, false), 88);
  assert.equal(leadDays(LEAD, true), 105);
});

test("season windows join months and include the season under way", () => {
  const w = seasonWindows(NORTH, TODAY, 14);
  assert.deepEqual(
    w.map((x) => `${x.season} ${ymd(x.start)}`),
    ["autumn 2026-09-01", "winter 2026-12-01", "spring 2027-03-01", "summer 2027-06-01", "autumn 2027-09-01"],
  );
  assert.equal(ymd(w[1].end), "2027-02-28");
});

test("Germany on 31 Oct: winter is too late, spring still on time, summer's order-by is 19 Feb", () => {
  const t = timeWindows(seasonWindows(NORTH, TODAY, 14), TODAY, LEAD, false);
  const by = Object.fromEntries(t.map((x) => [`${x.season}-${x.start.getFullYear()}`, x]));
  assert.equal(by["winter-2026"].verdict, "late");
  assert.equal(by["spring-2027"].verdict, "on-time");
  assert.equal(ymd(by["summer-2027"].orderBy), "2027-02-19");
  assert.equal(ymd(by["spring-2027"].arrival), "2027-01-27");
  assert.equal(buyNow(t).season, "spring");
});

test("first orders move the order-by date back by the sample time", () => {
  const t = timeWindows(seasonWindows(NORTH, TODAY, 14), TODAY, LEAD, true);
  const spring = t.find((x) => x.season === "spring");
  assert.equal(ymd(spring.orderBy), "2026-11-02");
  assert.equal(spring.verdict, "on-time");
});

test("a season stock reaches in its first third is tight", () => {
  const t = timeWindows([{ season: "winter", start: new Date(2027, 0, 1), end: new Date(2027, 2, 31) }], TODAY, LEAD, false);
  assert.equal(t[0].verdict, "tight");
  assert.ok(t[0].daysOfSelling > 0 && t[0].daysOfSelling < 90);
});

test("freight: by volume in a shared container, per box for a full one", () => {
  const rates = { lclPerCbm: 100, container: { "20gp": 2500 } };
  assert.equal(freightCost({ cbm: 6.15, lcl: true, containerId: "20gp", count: 1 }, rates), 615);
  assert.equal(freightCost({ cbm: 0.4, lcl: true, containerId: "20gp", count: 1 }, rates), 100);
  assert.equal(freightCost({ cbm: 20, lcl: false, containerId: "20gp", count: 2 }, rates), 5000);
});

test("landed cost: duty on CIF value, VAT shown but left out", () => {
  const c = landedCost({ pairs: 1000, fob: 10, freight: 1000, insurancePct: 0.5, dutyPct: 10, dutyOn: "cif", vatPct: 20, fees: 300 });
  assert.equal(c.goods, 10000);
  assert.equal(c.insurance, 55);
  assert.equal(Math.round(c.duty * 100) / 100, 1105.5);
  assert.equal(Math.round(c.total * 100) / 100, 12460.5);
  assert.equal(Math.round(c.perPair * 100) / 100, 12.46);
  assert.ok(c.vat > 0);
  const us = landedCost({ pairs: 1000, fob: 10, freight: 1000, insurancePct: 0, dutyPct: 10, dutyOn: "fob", vatPct: 0, fees: 0 });
  assert.equal(us.duty, 1000);
});

test("margin: price for a margin, break-even and markdown scenarios", () => {
  assert.equal(priceForMargin(20, 0.5), 40);
  const o = outcomes({ pairs: 100, landed: 20, price: 40, markdownPct: 50, sellThrough: [0.6, 1] });
  assert.equal(o.breakEven, 0.5);
  assert.equal(o.unitMargin, 0.5);
  assert.equal(o.scenarios[1].profit, 2000);
  // 60 at 40 + 40 at 20 = 3,200 against 2,000 cost
  assert.equal(o.scenarios[0].revenue, 3200);
  assert.equal(o.scenarios[0].profit, 1200);
});

test("cash flow: deposit, balance at shipping, then sales; peak and payback", () => {
  const c = cashflow({
    orderDate: new Date(2026, 10, 1),
    lead: LEAD,
    firstOrder: false,
    depositPct: 30,
    goods: 10000,
    freight: 1000,
    insurance: 50,
    duty: 0,
    fees: 0,
    sellFrom: new Date(2027, 2, 1),
    sellTo: new Date(2027, 4, 31),
    fullPriceRevenue: 18000,
    markdownRevenue: 2000,
  });
  assert.equal(day(c.ships).slice(0, 7) >= "2026-12", true);
  assert.equal(Math.round(c.peak), 11050);
  assert.equal(c.months[0].out, 3000);
  const last = c.months[c.months.length - 1];
  assert.equal(Math.round(last.balance), 20000 - 11050);
  assert.ok(c.payback && c.payback.getMonth() === 3, "pays back in April");
});
