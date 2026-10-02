import type { ReactNode } from "react";

/** Tiny isometric drawing kit for cartons, pallets and trucks (SVG, no assets). */

const COS = Math.cos(Math.PI / 6);

export type Pt = [number, number];
/** Project a 3D point (x right-down, y left-down, z up) to 2D, `u` px per unit. */
export const iso = (x: number, y: number, z: number, u = 1): Pt => [(x - y) * COS * u, (x + y) * 0.5 * u - z * u];
const pts = (p: Pt[]) => p.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(" ");

export type BoxProps = {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  u: number;
  top: string;
  right: string;
  left: string;
  stroke?: string;
  className?: string;
  /** Extra marks drawn on the faces (labels, tape), in the same coordinate space. */
  children?: ReactNode;
  "data-anim"?: string;
};

/** A solid box: top, right (+x) and front-left (+y) faces, the three a viewer sees. */
export function IsoBox({ x, y, z, w, d, h, u, top, right, left, stroke = "rgb(18 20 22 / .14)", className, children, ...rest }: BoxProps) {
  const P = (a: number, b: number, c: number) => iso(a, b, c, u);
  return (
    <g className={className} {...rest}>
      <polygon points={pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)])} fill={left} stroke={stroke} strokeWidth={0.8} strokeLinejoin="round" />
      <polygon points={pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)])} fill={right} stroke={stroke} strokeWidth={0.8} strokeLinejoin="round" />
      <polygon points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)])} fill={top} stroke={stroke} strokeWidth={0.8} strokeLinejoin="round" />
      {children}
    </g>
  );
}

/** A quad on any face, from four 3D corners. */
export function IsoQuad({ c, u, fill, opacity }: { c: [number, number, number][]; u: number; fill: string; opacity?: number }) {
  return <polygon points={pts(c.map(([a, b, z]) => iso(a, b, z, u)))} fill={fill} opacity={opacity} />;
}

/** Painter's order for unit stacks: back to front, bottom to top. */
export const byDepth = <T extends { x: number; y: number; z: number }>(a: T, b: T) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.z - b.z;

export const KRAFT = { top: "#dcc29e", right: "#c9a983", left: "#b39069" };
export const WHITE_BOX = { top: "#ffffff", right: "#eef1f2", left: "#dfe5e8" };
export const WOOD = { top: "#d9c3a0", right: "#bfa27a", left: "#a98c66" };

/** viewBox string that fits every corner of the given boxes, plus padding. */
export function viewBoxFor(boxes: { x: number; y: number; z: number; w: number; d: number; h: number }[], u: number, pad = 12) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes)
    for (const dx of [0, b.w])
      for (const dy of [0, b.d])
        for (const dz of [0, b.h]) {
          const [px, py] = iso(b.x + dx, b.y + dy, b.z + dz, u);
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
        }
  return `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`;
}
