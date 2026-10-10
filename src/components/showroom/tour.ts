/** The showroom's scroll tour. No three.js here, so the homepage can use it before the 3D code loads. */

const H = Math.PI / 2;
// room size, metres (matches scene.ts)
const RX = 3.0;
const RD = 7.0;

export type Pose = { x: number; z: number; yaw: number; pitch: number };

/**
 * The scroll tour: entrance, then along each wall close enough to read the shelves, ending at the men's table.
 * Phones stand a little further back so a narrow screen still shows a useful slice of the wall.
 */
export function tourStops(mobile: boolean): { label: string; pose: Pose }[] {
  const d = mobile ? 1.75 : 1.45; // distance from the shelf front
  const side = RX - 0.34 - d; // camera x for the side walls
  const back = -RD + 0.34 + d; // camera z for the back wall
  return [
    { label: "Entrance", pose: { x: 0, z: 1.3, yaw: 0, pitch: -0.05 } },
    { label: "Entrance", pose: { x: 0, z: -0.7, yaw: 0, pitch: -0.06 } },
    { label: "Women · Boots", pose: { x: -side, z: -1.9, yaw: H, pitch: -0.22 } },
    { label: "Women · Boots", pose: { x: -side, z: -5.3, yaw: H, pitch: -0.22 } },
    { label: "Women · Shoes", pose: { x: -1.35, z: back, yaw: 0, pitch: -0.2 } },
    { label: "Women · Shoes", pose: { x: 1.35, z: back, yaw: 0, pitch: -0.2 } },
    { label: "Kids", pose: { x: side, z: -5.3, yaw: -H, pitch: -0.3 } },
    { label: "Kids", pose: { x: side, z: -1.9, yaw: -H, pitch: -0.3 } },
    { label: "Men", pose: { x: 0, z: -2.0, yaw: 0, pitch: -0.42 } },
  ];
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Pose at a point of the tour (0..1), eased between stops so the camera settles at each wall. */
export function poseAt(stops: { pose: Pose }[], progress: number): Pose {
  const seg = stops.length - 1;
  const t = Math.min(seg, Math.max(0, progress * seg));
  const i = Math.min(seg - 1, Math.floor(t));
  const k = smooth(t - i);
  const a = stops[i].pose;
  const b = stops[i + 1].pose;
  return {
    x: a.x + (b.x - a.x) * k,
    z: a.z + (b.z - a.z) * k,
    yaw: a.yaw + wrap(b.yaw - a.yaw) * k,
    pitch: a.pitch + (b.pitch - a.pitch) * k,
  };
}
