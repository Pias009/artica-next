import "server-only";
import { database, dbReady } from "../leads/db";
import { isTeamId, TEAMS, type TeamId } from "./teams";

/*
 * Which of Vela's teams an admin has switched off, in one document (MongoDB `vela_state`, _id "teams"), so every
 * admin sees the same roster. Without a database the switches live in memory on this server only.
 */

type State = { _id: string; paused: TeamId[]; updatedAt: Date; updatedBy: string };
const state = () => database().collection<State>("vela_state");
const TTL = 10_000;
let cache: { paused: TeamId[]; at: number } | null = null;
let memory: TeamId[] = [];

export async function getPausedTeams(): Promise<TeamId[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.paused;
  if (!dbReady()) return memory;
  try {
    const doc = await state().findOne({ _id: "teams" });
    const paused = (doc?.paused ?? []).filter(isTeamId);
    cache = { paused, at: Date.now() };
    return paused;
  } catch (e) {
    console.error("[vela] team state, treating every team as on", e);
    return cache?.paused ?? [];
  }
}

/** Switch one or more teams (or all of them) on or off. Returns the teams now off. */
export async function setTeamsActive(teams: TeamId[] | "all", active: boolean, by: string): Promise<TeamId[]> {
  const ids = teams === "all" ? TEAMS.map((t) => t.id) : teams;
  cache = null;
  const now = new Set(await getPausedTeams());
  for (const id of ids) {
    if (active) now.delete(id);
    else now.add(id);
  }
  const paused = TEAMS.map((t) => t.id).filter((id) => now.has(id));
  if (dbReady()) {
    await state().updateOne({ _id: "teams" }, { $set: { paused, updatedAt: new Date(), updatedBy: by } }, { upsert: true });
  } else memory = paused;
  cache = { paused, at: Date.now() };
  return paused;
}
