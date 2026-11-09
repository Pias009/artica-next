// Vela's team routing and team switches: `npm test`. Node runs the TypeScript module directly (type stripping).
import assert from "node:assert/strict";
import { test } from "node:test";
import { isTeamId, parseTeamToggle, routeQuestion, TEAMS, TEAM_BY_ID } from "../src/lib/vela/teams.ts";

test("11 teams in 3 departments, each with a unique id and code", () => {
  assert.equal(TEAMS.length, 11);
  assert.equal(new Set(TEAMS.map((t) => t.id)).size, 11);
  assert.equal(new Set(TEAMS.map((t) => t.code)).size, 11);
  assert.deepEqual(new Set(TEAMS.map((t) => t.department)), new Set(["growth", "merchandising", "operations"]));
  for (const t of TEAMS) assert.equal(TEAM_BY_ID[t.id], t);
});

test("questions go to the team whose work they're about", () => {
  assert.equal(routeQuestion("Are there any bugs or errors on the website?"), "engineering");
  assert.equal(routeQuestion("How fast is the site for real visitors?"), "engineering");
  assert.equal(routeQuestion("Is our winter campaign ready?"), "seasons");
  assert.equal(routeQuestion("Which inquiries are overdue for a reply?"), "desk");
  assert.equal(routeQuestion("Which quotes need a follow-up?"), "care");
  assert.equal(routeQuestion("Which countries send the most inquiries?"), "markets");
  assert.equal(routeQuestion("Which channels bring buyers, LinkedIn or Google?"), "marketing");
  assert.equal(routeQuestion("Where do buyers drop off in the funnel?"), "conversion");
  assert.equal(routeQuestion("Which styles are trending up?"), "trending");
  assert.equal(routeQuestion("Are we featuring the right styles?"), "showcase");
  assert.equal(routeQuestion("Which searches find nothing?"), "web");
  assert.equal(routeQuestion("Which boots never get asked about?"), "catalogue");
  // nothing recognisable: the trade desk answers
  assert.equal(routeQuestion("hello"), "desk");
});

test("switching teams needs the word team, and reads on/off", () => {
  assert.deepEqual(parseTeamToggle("pause the marketing team"), { teams: ["marketing"], active: false });
  assert.deepEqual(parseTeamToggle("turn off the seasons and showcase teams"), { teams: ["showcase", "seasons"], active: false });
  assert.deepEqual(parseTeamToggle("Vela, wake all teams"), { teams: "all", active: true });
  assert.deepEqual(parseTeamToggle("turn the dev team back on"), { teams: ["engineering"], active: true });
  // an ordinary question is never a switch
  assert.equal(parseTeamToggle("why did marketing stop working?"), null);
  // unclear: both on and off
  assert.equal(parseTeamToggle("turn on and pause the desk team"), null);
  // no team named
  assert.equal(parseTeamToggle("pause the team"), null);
});

test("only real team ids pass", () => {
  assert.equal(isTeamId("desk"), true);
  assert.equal(isTeamId("orders"), false);
  assert.equal(isTeamId(undefined), false);
});
