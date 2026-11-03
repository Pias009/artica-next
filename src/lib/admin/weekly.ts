import "server-only";
import { visits } from "../analytics/visits";
import { inquiries } from "../leads/db";
import { absoluteUrl } from "../site";

/** The Monday email (Settings → Alerts → Weekly summary): last week's inquiries, styles asked for and visits. */
export async function weeklySummary() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [byStatus, styles, sessions] = await Promise.all([
    inquiries()
      .aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$status", n: { $sum: 1 } } }])
      .toArray(),
    inquiries()
      .aggregate<{ _id: string; n: number }>([
        { $match: { createdAt: { $gte: since }, status: { $ne: "spam" } } },
        { $unwind: "$lines" },
        { $group: { _id: "$lines.name", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    visits()
      .distinct("sid", { at: { $gte: since } })
      .then((x) => x.length)
      .catch(() => 0),
  ]);
  const total = byStatus.filter((s) => s._id !== "spam").reduce((a, s) => a + s.n, 0);
  return [
    `Last 7 days`,
    ``,
    `Inquiries: ${total}${byStatus.length ? ` (${byStatus.map((s) => `${s.n} ${s._id}`).join(", ")})` : ""}`,
    `Styles asked for most: ${styles.length ? styles.map((s) => `${s._id} (${s.n})`).join(", ") : "none"}`,
    `Visits to the site: ${sessions}`,
    ``,
    `The dashboard: ${absoluteUrl("/admin")}`,
  ].join("\n");
}
