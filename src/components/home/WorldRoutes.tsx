/**
 * The hero's backdrop: a dotted world (public/images/world-dots.svg, rasterised from Natural Earth by
 * design/hero-concepts/world_dots.py) with the trade lanes out of the Guangzhou factory. The lane for the pair on show
 * is drawn bright with a container travelling along it; the others idle as faint flowing dashes. Equirectangular, in
 * the dot map's own 1000 x 500 units.
 */

/** Where the factory is, and where the lanes land (indicative transit, client placeholders; see the shipping page). */
export const ORIGIN = { name: "Guangzhou", ...at(113.3, 23.1) };
export const LANES = [
  { port: "Rotterdam", region: "Europe", days: "30–36 days", ...at(4.5, 51.9) },
  {
    port: "New York",
    region: "North America",
    days: "26–34 days",
    ...at(-74, 40.7),
  },
  {
    port: "Los Angeles",
    region: "North America",
    days: "14–18 days",
    ...at(-118.2, 34),
  },
  {
    port: "Dubai",
    region: "Middle East",
    days: "18–22 days",
    ...at(55.3, 25.3),
  },
  {
    port: "Sydney",
    region: "Australia",
    days: "14–20 days",
    ...at(151.2, -33.9),
  },
  {
    port: "Santos",
    region: "South America",
    days: "35–42 days",
    ...at(-46.3, -24),
  },
];

function at(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * 1000, y: ((90 - lat) / 180) * 500 };
}

/** A lane as a shallow arc, bowed away from the equator so it reads as a great-circle route. */
function arc(to: { x: number; y: number }) {
  const { x: x0, y: y0 } = ORIGIN;
  const mx = (x0 + to.x) / 2;
  const my = (y0 + to.y) / 2;
  const d = Math.hypot(to.x - x0, to.y - y0);
  const lift = d * 0.28 * (to.y > 260 ? -1 : 1); // southern lanes bow south
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${(my - lift).toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export function WorldRoutes({
  active,
  reduced,
}: {
  active: number;
  reduced: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 30 1000 360"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none size-full [mask-image:radial-gradient(75%_80%_at_50%_50%,#000_55%,transparent_100%)]"
    >
      <image
        href="/images/world-dots.svg"
        x="0"
        y="0"
        width="1000"
        height="500"
        opacity="0.1"
      />

      {LANES.map((l, i) => {
        const on = i === active;
        const d = arc(l);
        return (
          <g key={l.port}>
            <path
              d={d}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth={on ? 1.7 : 1}
              strokeOpacity={on ? 0.85 : 0.22}
              strokeLinecap="round"
              strokeDasharray={on ? undefined : "3 6"}
              className={
                on || reduced
                  ? "transition-[stroke-opacity] duration-700"
                  : "[animation:route-flow_2.4s_linear_infinite]"
              }
            />
            {/* a container on its way, on the lane in the spotlight */}
            {on && !reduced && (
              <circle key={`ship-${active}`} r="3.4" fill="var(--color-brand)">
                <animateMotion
                  dur="3.2s"
                  repeatCount="indefinite"
                  path={d}
                  keyPoints="0;1"
                  keyTimes="0;1"
                  calcMode="spline"
                  keySplines=".45 0 .25 1"
                />
              </circle>
            )}
            {/* the port */}
            <circle
              cx={l.x}
              cy={l.y}
              r={on ? 4 : 2.6}
              fill={on ? "var(--color-brand)" : "#7c6f77"}
              className="transition-all duration-500"
            />
            {on && !reduced && (
              <circle
                key={`pulse-${active}`}
                cx={l.x}
                cy={l.y}
                r="4"
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="1.2"
                className="origin-center [transform-box:fill-box] [animation:port-pulse_1.8s_ease-out_infinite]"
              />
            )}
          </g>
        );
      })}

      {/* the factory */}
      <circle
        cx={ORIGIN.x}
        cy={ORIGIN.y}
        r="9"
        fill="var(--color-brand)"
        opacity="0.15"
      />
      <circle
        cx={ORIGIN.x}
        cy={ORIGIN.y}
        r="4.6"
        fill="var(--color-brand)"
        stroke="#fff"
        strokeWidth="1.6"
      />
    </svg>
  );
}
