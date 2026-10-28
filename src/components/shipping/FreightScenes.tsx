import { iso, IsoBox, IsoQuad, viewBoxFor, WHITE_BOX } from "../ui/Iso";

/*
 * The three ways an order travels, drawn with the same isometric kit as the packing scenes (HowItShips). Moving
 * parts carry data-* hooks for DeliveryRoute's timelines: [data-scroll] groups slide one period along the road or
 * sea and loop seamlessly, [data-bob] rides the swell, [data-plane]/[data-shadow] take off.
 */

const COS = Math.cos(Math.PI / 6);
type B = { x: number; y: number; z: number; w: number; d: number; h: number };

/** Faces for a solid colour: the top as given, the two sides darker. */
function faces(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (k: number) => `rgb(${Math.round(((n >> 16) & 255) * k)} ${Math.round(((n >> 8) & 255) * k)} ${Math.round((n & 255) * k)})`;
  return { top: hex, right: f(0.86), left: f(0.74) };
}

/** Screen offset of moving `units` along the x axis: what a [data-scroll] group travels per loop. */
export const travel = (units: number, u: number) => ({ x: -units * COS * u, y: -units * 0.5 * u });

/**
 * A viewBox framed on the vehicle (`b`), widened to the card's shape. The svg draws overflow, so the endless parts
 * (water, runway, road) run on to the card's edges, which clip them.
 */
function frame(b: B, u: number, ratio = 2.4) {
  const [x, y, w, h] = viewBoxFor([b], u, 0).split(" ").map(Number);
  const W = Math.max(w, h * ratio);
  const H = Math.max(h, w / ratio);
  return `${(x + w / 2 - W / 2).toFixed(1)} ${(y + h / 2 - H / 2).toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}`;
}
const SVG = { preserveAspectRatio: "xMidYMid meet", overflow: "visible", className: "size-full" } as const;

const CONTAINER = ["#8e3f82", "#2d5d6f", "#c9a983", "#e7ebed", "#5b6770", "#b5533f"];

/* ---------- sea: a laden container ship on a moving swell ---------- */
export const SEA_U = 13;
export const SEA_PERIOD = 6;

function Swell({ ys, u }: { ys: number[]; u: number }) {
  const marks: B[] = [];
  ys.forEach((y, r) => {
    for (let k = -8; k < 12; k++) marks.push({ x: ((r * 2.3) % SEA_PERIOD) + k * SEA_PERIOD, y, z: 0, w: 1.3, d: 0.07, h: 0.001 });
  });
  return (
    <g data-scroll={SEA_PERIOD}>
      {marks.map((m, i) => (
        <IsoBox key={i} {...m} u={u} top="#ffffff" right="#ffffff" left="#ffffff" stroke="none" className="opacity-70" />
      ))}
    </g>
  );
}

export function SeaScene() {
  const u = SEA_U;
  const hull = faces("#2c3a44");
  const cargo: (B & { c: string })[] = [];
  [3, 2, 3, 3, 2, 2].forEach((tiers, bay) => {
    for (let row = 0; row < 3; row++)
      for (let t = 0; t < tiers - (row === 0 && bay % 2 ? 1 : 0); t++)
        cargo.push({ x: 3.1 + bay * 2.25, y: 0.12 + row * 0.95, z: 1.5 + t * 0.82, w: 2.15, d: 0.9, h: 0.78, c: CONTAINER[(bay * 7 + row * 3 + t * 5) % CONTAINER.length] });
  });
  const bridge = { x: 0.4, y: 0.3, z: 1.5, w: 2.2, d: 2.4, h: 3.7 };
  const parts = [...cargo.map((c) => ({ ...c, kind: "box" as const })), { ...bridge, c: "", kind: "bridge" as const }].sort(
    (a, b) => a.x + a.y + a.z - (b.x + b.y + b.z),
  );
  const P = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

  return (
    <svg viewBox={frame({ x: -1.5, y: -1, z: 0, w: 22.5, d: 5.5, h: 6.6 }, u)} {...SVG}>
      <Swell u={u} ys={[-9, -7.8, -6.6, -5.4, -4.2, -3, -1.8, -0.6]} />
      <g data-bob>
        {/* the bow's starboard flank, then the hull, then the bow's near flank and deck */}
        <IsoQuad u={u} fill={hull.right} c={[P(17, 0, 0), P(19.6, 1.5, 0.3), P(19.6, 1.5, 1.7), P(17, 0, 1.5)]} />
        <IsoBox x={0} y={0} z={0} w={17} d={3} h={1.5} u={u} {...hull} stroke="rgb(0 0 0 / .15)">
          <IsoQuad u={u} fill="#8c2f3a" c={[P(0, 3, 0), P(17, 3, 0), P(17, 3, 0.42), P(0, 3, 0.42)]} />
          <IsoQuad u={u} fill="#ffffff" opacity={0.5} c={[P(0, 3, 1.38), P(17, 3, 1.38), P(17, 3, 1.44), P(0, 3, 1.44)]} />
        </IsoBox>
        <IsoQuad u={u} fill={hull.left} c={[P(17, 3, 0), P(19.6, 1.5, 0.3), P(19.6, 1.5, 1.7), P(17, 3, 1.5)]} />
        <IsoQuad u={u} fill="#8c2f3a" c={[P(17, 3, 0), P(19.6, 1.5, 0.3), P(19.6, 1.5, 0.62), P(17, 3, 0.42)]} />
        <IsoQuad u={u} fill={hull.top} c={[P(17, 0, 1.5), P(19.6, 1.5, 1.7), P(17, 3, 1.5)]} />
        {parts.map((p, i) =>
          p.kind === "bridge" ? (
            <g key={i}>
              <IsoBox {...bridge} u={u} {...WHITE_BOX}>
                <IsoQuad u={u} fill="#2b3338" c={[P(2.6, 0.45, 4.45), P(2.6, 2.55, 4.45), P(2.6, 2.55, 4.9), P(2.6, 0.45, 4.9)]} />
                <IsoQuad u={u} fill="#2b3338" c={[P(0.55, 2.7, 4.45), P(2.45, 2.7, 4.45), P(2.45, 2.7, 4.9), P(0.55, 2.7, 4.9)]} />
              </IsoBox>
              <IsoBox x={0.7} y={1.1} z={5.2} w={0.8} d={0.8} h={0.9} u={u} {...faces("#8e3f82")} />
            </g>
          ) : (
            <IsoBox key={i} {...p} u={u} {...faces(p.c)} stroke="rgb(0 0 0 / .18)" />
          ),
        )}
      </g>
      <Swell u={u} ys={[3.8, 5, 6.2, 7.4, 8.6, 9.8, 11, 12.2, 13.4]} />
    </svg>
  );
}

/* ---------- air: a freighter rolls down the runway and lifts off ---------- */
export const AIR_U = 12;
export const AIR_PERIOD = 4;

export function AirScene() {
  const u = AIR_U;
  const y0 = 1.15; // fuselage's far side
  const grey = faces("#c3ccd2");
  const dashes: B[] = [];
  for (let k = -16; k < 26; k++) dashes.push({ x: k * (AIR_PERIOD / 2), y: 1.72, z: 0, w: 1, d: 0.16, h: 0.001 });
  const clouds = [
    { x: -2, y: -4, z: 8.2 },
    { x: 8, y: -6, z: 9.4 },
    { x: 16, y: -2, z: 7.6 },
  ];

  return (
    <svg viewBox={frame({ x: 0.5, y: -4, z: 0, w: 15, d: 12, h: 6.5 }, u)} {...SVG}>
      <g data-drift>
        {clouds.map((c, i) => (
          <g key={i} className="opacity-90">
            <IsoBox {...c} w={3.2} d={1.6} h={0.5} u={u} top="#ffffff" right="#f1f5f7" left="#e6edf1" stroke="none" />
            <IsoBox x={c.x + 0.7} y={c.y + 0.3} z={c.z + 0.5} w={1.8} d={1.1} h={0.4} u={u} top="#ffffff" right="#f1f5f7" left="#e6edf1" stroke="none" />
          </g>
        ))}
      </g>
      <IsoBox x={-30} y={0} z={-0.1} w={80} d={3.6} h={0.1} u={u} top="#d5dde2" right="#c4cdd3" left="#b9c3ca" stroke="none" />
      <g data-scroll={AIR_PERIOD}>
        {dashes.map((d, i) => (
          <IsoBox key={i} {...d} u={u} top="#ffffff" right="#ffffff" left="#ffffff" stroke="none" />
        ))}
      </g>
      <ellipse data-shadow cx={iso(7, 1.8, 0, u)[0]} cy={iso(7, 1.8, 0, u)[1]} rx={u * 4.2} ry={u * 1.3} fill="#121416" opacity={0.12} />
      <g data-plane>
        {/* far side first: wing, engine, tailplane; then gear, fuselage, fin; near side last */}
        <IsoBox x={5.5} y={y0 - 4.6} z={1.35} w={2.1} d={4.6} h={0.14} u={u} {...grey} />
        <IsoBox x={5.1} y={y0 - 3} z={0.72} w={1.5} d={0.72} h={0.62} u={u} {...faces("#9aa6ae")} />
        <IsoBox x={2.2} y={y0 - 1.7} z={2.35} w={1.2} d={1.7} h={0.1} u={u} {...grey} />
        <IsoBox x={4.1} y={y0 + 0.5} z={0} w={0.35} d={0.3} h={0.9} u={u} {...faces("#3a4046")} />
        <IsoBox x={10} y={y0 + 0.5} z={0} w={0.25} d={0.3} h={1} u={u} {...faces("#3a4046")} />
        <IsoBox x={2} y={y0} z={0.9} w={9} d={1.3} h={1.3} u={u} {...WHITE_BOX}>
          <IsoQuad u={u} fill="#8e3f82" c={[[2, y0 + 1.3, 1.5], [11, y0 + 1.3, 1.5], [11, y0 + 1.3, 1.66], [2, y0 + 1.3, 1.66]]} />
        </IsoBox>
        <IsoBox x={11} y={y0 + 0.15} z={1} w={1.2} d={1} h={1} u={u} {...WHITE_BOX}>
          <IsoQuad u={u} fill="#2b3338" c={[[12.2, y0 + 0.3, 1.55], [12.2, y0 + 1, 1.55], [12.2, y0 + 1, 1.85], [12.2, y0 + 0.3, 1.85]]} />
        </IsoBox>
        <IsoBox x={12.2} y={y0 + 0.35} z={1.15} w={0.5} d={0.6} h={0.6} u={u} {...WHITE_BOX} />
        <IsoQuad u={u} fill="#8e3f82" c={[[2, y0 + 0.65, 2.2], [3.7, y0 + 0.65, 2.2], [3, y0 + 0.65, 4], [2, y0 + 0.65, 4]]} />
        <IsoBox x={2.2} y={y0 + 1.3} z={2.35} w={1.2} d={1.7} h={0.1} u={u} {...grey} />
        <IsoBox x={5.5} y={y0 + 1.3} z={1.35} w={2.1} d={4.6} h={0.14} u={u} {...grey} />
        <IsoBox x={5.1} y={y0 + 3.4} z={0.72} w={1.5} d={0.72} h={0.62} u={u} {...faces("#9aa6ae")} />
      </g>
    </svg>
  );
}

/* ---------- road: a container truck on the highway ---------- */
export const ROAD_U = 12;
export const ROAD_PERIOD = 6;

export function RoadScene() {
  const u = ROAD_U;
  const lane: B[] = [];
  const posts: B[] = [];
  for (let k = -8; k < 10; k++) {
    lane.push({ x: k * ROAD_PERIOD, y: 2.45, z: 0, w: 1.6, d: 0.12, h: 0.001 }, { x: k * ROAD_PERIOD + 3, y: 2.45, z: 0, w: 1.6, d: 0.12, h: 0.001 });
    posts.push({ x: k * ROAD_PERIOD + 1, y: -0.9, z: 0, w: 0.16, d: 0.16, h: 1.1 });
  }
  const body = faces("#8e3f82");
  const wheels = [1.3, 2.5, 7.1, 8.3, 10.9].map((x) => iso(x, 4.6, 0.42, u));

  return (
    <svg viewBox={frame({ x: -1.5, y: 0, z: 0, w: 15, d: 5.5, h: 3.8 }, u)} {...SVG}>
      <g data-scroll={ROAD_PERIOD}>
        {posts.map((p, i) => (
          <IsoBox key={i} {...p} u={u} {...faces("#9aa6ae")} stroke="none">
            <IsoQuad u={u} fill="#f2b33d" c={[[p.x + 0.16, p.y, 0.8], [p.x + 0.16, p.y + 0.16, 0.8], [p.x + 0.16, p.y + 0.16, 0.95], [p.x + 0.16, p.y, 0.95]]} />
          </IsoBox>
        ))}
      </g>
      <IsoBox x={-40} y={0} z={-0.1} w={90} d={5} h={0.1} u={u} top="#c9d1d6" right="#b7c0c6" left="#aab4bb" stroke="none" />
      <IsoBox x={-40} y={0.25} z={0} w={90} d={0.1} h={0.001} u={u} top="#ffffff" right="#ffffff" left="#ffffff" stroke="none" />
      <IsoBox x={-40} y={4.65} z={0} w={90} d={0.1} h={0.001} u={u} top="#ffffff" right="#ffffff" left="#ffffff" stroke="none" />
      <g data-scroll={ROAD_PERIOD}>
        {lane.map((d, i) => (
          <IsoBox key={i} {...d} u={u} top="#ffffff" right="#ffffff" left="#ffffff" stroke="none" />
        ))}
      </g>
      <ellipse cx={iso(5.8, 3.7, 0, u)[0]} cy={iso(5.8, 3.7, 0, u)[1]} rx={u * 5.6} ry={u * 1.5} fill="#121416" opacity={0.12} />
      <g data-bob>
        <IsoBox x={0} y={2.8} z={0.5} w={9.3} d={1.8} h={0.32} u={u} {...faces("#2a2f34")} />
        <IsoBox x={0.1} y={2.8} z={0.82} w={9} d={1.8} h={2.5} u={u} {...body} stroke="rgb(0 0 0 / .18)">
          {Array.from({ length: 14 }, (_, i) => 0.5 + i * 0.6).map((x) => (
            <IsoQuad key={x} u={u} fill="#ffffff" opacity={0.14} c={[[x, 4.6, 0.95], [x + 0.18, 4.6, 0.95], [x + 0.18, 4.6, 3.2], [x, 4.6, 3.2]]} />
          ))}
        </IsoBox>
        <IsoBox x={9.45} y={2.9} z={0.5} w={2.2} d={1.6} h={2.45} u={u} {...WHITE_BOX}>
          <IsoQuad u={u} fill="#2b3338" c={[[11.65, 3.05, 1.85], [11.65, 4.35, 1.85], [11.65, 4.35, 2.7], [11.65, 3.05, 2.7]]} />
          <IsoQuad u={u} fill="#2b3338" c={[[10.5, 4.5, 1.9], [11.45, 4.5, 1.9], [11.45, 4.5, 2.65], [10.5, 4.5, 2.65]]} />
        </IsoBox>
        {wheels.map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={u * 0.42} ry={u * 0.36} fill="#121416" />
        ))}
      </g>
    </svg>
  );
}
