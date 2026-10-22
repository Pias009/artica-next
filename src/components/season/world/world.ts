/*
 * The season's world: a live 3D landscape behind the whole site (three.js), one per season. Loaded on its own, once
 * the page is idle (SeasonWorld imports it), so it never holds up the first paint.
 *
 * Winter: snowy mountains, a pine forest under snow, a frozen lake, falling snow. Spring: green hills, blossom trees
 * in the wind, meadow flowers, drifting petals, birds. Summer: a beach, a living sea with sun glints, palms, islands.
 * Rainy: misty hills, a lake, low cloud, rain. Autumn: golden-hour hills of orange and red trees, falling leaves,
 * birds. Holiday: a snowy dusk, cabins with lit windows, lights twinkling in the pines, soft snow.
 *
 * Kept light: one draw per kind of thing (instanced trees, one terrain, one sea), the weather, wind and waves move in
 * the GPU (no per-frame work on the main thread beyond the camera and a handful of birds), Lambert lighting, no
 * shadows. The renderer watches its own frame times and steps its resolution down, then to 30 fps, then to a still.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type WorldSeason = "spring" | "summer" | "rainy" | "autumn" | "winter" | "holiday";
export type World = { set: (season: WorldSeason, still: boolean) => void; destroy: () => void };

/* ---------- noise ---------- */

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function makeNoise(seed: number) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const val = Float32Array.from({ length: 256 }, () => r());
  const v = (x: number, y: number) => val[perm[perm[x & 255] + (y & 255)]];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * u;
    const b = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * u;
    return a + (b - a) * w;
  };
  const fbm = (x: number, y: number, oct = 5) => {
    let s = 0;
    let a = 0.5;
    for (let i = 0; i < oct; i++) {
      s += a * noise(x, y);
      x *= 2.03;
      y *= 2.03;
      a *= 0.5;
    }
    return s;
  };
  // sharp crests, for mountain ranges
  const ridge = (x: number, y: number, oct = 5) => {
    let s = 0;
    let a = 0.55;
    for (let i = 0; i < oct; i++) {
      s += a * (1 - Math.abs(2 * noise(x, y) - 1)) ** 2;
      x *= 2.07;
      y *= 2.07;
      a *= 0.5;
    }
    return s;
  };
  return { noise, fbm, ridge, rand: r };
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const col = (hex: string) => new THREE.Color(hex);
/** Hands the main thread back to the browser between build steps, so building a world never blocks a frame long. */
const breathe = () =>
  new Promise<void>((r) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(r);
    else setTimeout(r, 0);
  });

/* ---------- the season recipes ---------- */

type Land = {
  /** Ground height at (x, z); the camera looks down -z. */
  height: (x: number, z: number) => number;
  /** Ground colour from height and slope (ny: 1 flat, 0 cliff). */
  color: (x: number, z: number, y: number, ny: number, out: THREE.Color) => void;
};
type Recipe = {
  sky: { top: string; horizon: string; sun: [number, number, number]; sunColor: string; sunSize: number; stars?: boolean };
  fog: { color: string; near: number; far: number };
  light: { sky: string; ground: string; hemi: number; sun: string; dir: number };
  land: (n: ReturnType<typeof makeNoise>) => Land;
  water?: { level: number; deep: string; shallow: string; waves: number; ice?: boolean; x: [number, number]; z: [number, number] };
  trees: { kind: "pine" | "broad" | "palm"; count: number; colors: string[]; snow?: boolean; zone: [number, number] }[];
  weather?: { kind: "snow" | "rain" | "petals" | "leaves"; count: number; colors?: string[] };
  clouds?: { count: number; color: string; opacity: number; low?: boolean };
  birds?: number;
  flowers?: string[];
  cabins?: boolean;
  /** Where the camera sits and looks. */
  cam: { pos: [number, number, number]; look: [number, number, number] };
};

/** Mountains far off, rolling ground in the middle, a calm foreground: the shared lie of the land. */
function landform(n: ReturnType<typeof makeNoise>, o: { hills: number; peaks: number; valley: number; base?: number }) {
  return (x: number, z: number) => {
    const far = smooth(-120, -280, z);
    const mid = smooth(10, -70, z);
    const hills = n.fbm(x * 0.011 + 3, z * 0.011) * o.hills * (0.25 + 0.75 * mid);
    const peaks = n.ridge(x * 0.0055 + 7, z * 0.0055 + 2) * o.peaks * far;
    const valley = -o.valley * Math.exp(-(x * x) / (2 * 55 * 55)) * smooth(-5, -50, z) * (1 - far * 0.6);
    return hills + peaks + valley + (o.base ?? -2);
  };
}

/** Carves a smooth basin (for a lake) into a height function. */
function lake(h: (x: number, z: number) => number, cx: number, cz: number, rx: number, rz: number, floor: number) {
  return (x: number, z: number) => {
    const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
    const y = h(x, z);
    return d < 1 ? y + (floor - y) * smooth(1, 0.45, d) : y;
  };
}

const SNOW = col("#f6f9fc");
const SNOW_SHADE = col("#c8d8e8");
const ROCK = col("#7f8b98");

const RECIPES: Record<WorldSeason, Recipe> = {
  winter: {
    sky: { top: "#8db8de", horizon: "#e5eef6", sun: [-0.45, 0.16, -1], sunColor: "#fff3df", sunSize: 0.9994 },
    fog: { color: "#dde8f1", near: 70, far: 470 },
    light: { sky: "#d6e6f5", ground: "#eef2f6", hemi: 1.25, sun: "#fff0da", dir: 1.5 },
    land: (n) => {
      const h = lake(landform(n, { hills: 16, peaks: 105, valley: 7 }), 0, -80, 48, 34, -5.5);
      return {
        height: h,
        color: (x, z, y, ny, out) => {
          out.copy(SNOW_SHADE).lerp(SNOW, Math.min(1, ny * ny * 1.15));
          if (ny < 0.72 && y > 18) out.lerp(ROCK, smooth(0.72, 0.5, ny) * 0.8);
        },
      };
    },
    water: { level: -3.4, deep: "#b9cfdf", shallow: "#e3eef6", waves: 0, ice: true, x: [-60, 60], z: [-125, -35] },
    trees: [{ kind: "pine", count: 900, colors: ["#2c5640", "#36624a", "#25493a"], snow: true, zone: [-12, -190] }],
    weather: { kind: "snow", count: 3600 },
    clouds: { count: 7, color: "#ffffff", opacity: 0.55 },
    cam: { pos: [0, 9, 34], look: [0, 6, -60] },
  },
  spring: {
    sky: { top: "#7fb9ea", horizon: "#e9f3fa", sun: [0.35, 0.55, -1], sunColor: "#fffbe9", sunSize: 0.9993 },
    fog: { color: "#e2eef5", near: 80, far: 520 },
    light: { sky: "#dcecff", ground: "#b9d39a", hemi: 1.15, sun: "#fff6e0", dir: 1.55 },
    land: (n) => {
      const h = landform(n, { hills: 20, peaks: 80, valley: 4 });
      const grass = [col("#6e9f48"), col("#8dbb5a"), col("#5b8a3f")];
      const far = col("#9fb5c9");
      return {
        height: h,
        color: (x, z, y, ny, out) => {
          const k = n.noise(x * 0.05, z * 0.05);
          out.copy(grass[0]).lerp(grass[1], k).lerp(grass[2], smooth(0.9, 0.7, ny) * 0.6);
          out.lerp(far, smooth(-150, -300, z) * 0.85);
          if (y > 62) out.lerp(SNOW, smooth(62, 82, y));
        },
      };
    },
    trees: [
      { kind: "broad", count: 260, colors: ["#f4b8c8", "#fbe0e7", "#f7c9d5", "#7fae5a", "#9cc46b"], zone: [-14, -170] },
      { kind: "pine", count: 160, colors: ["#3a6b46", "#2f5c3c"], zone: [-60, -200] },
    ],
    weather: { kind: "petals", count: 520, colors: ["#f7c6d3", "#fde2ea", "#ffffff", "#f1aec2"] },
    clouds: { count: 9, color: "#ffffff", opacity: 0.85 },
    birds: 9,
    flowers: ["#ffd84d", "#ffffff", "#f39ab4", "#b9a6ff"],
    cam: { pos: [0, 8, 34], look: [0, 6, -60] },
  },
  summer: {
    sky: { top: "#5ea9e6", horizon: "#f1f5f1", sun: [0.5, 0.42, -1], sunColor: "#fff6dc", sunSize: 0.9991 },
    fog: { color: "#e8f1f2", near: 90, far: 600 },
    light: { sky: "#d9ecff", ground: "#f0dcb0", hemi: 1.2, sun: "#fff3d6", dir: 1.75 },
    land: (n) => {
      const sand = col("#ecd7a8");
      const wet = col("#cdb68a");
      const green = col("#5f9a52");
      return {
        height: (x, z) => {
          // a beach running down into the sea, then islands far out
          const beach = z > -26 ? 0.6 + (z + 26) * 0.07 + n.fbm(x * 0.05, z * 0.05) * 1.2 : -8;
          const islands = Math.max(0, n.fbm(x * 0.009 + 11, z * 0.009) - 0.42) * 160 * smooth(-200, -280, z);
          return Math.max(beach, islands - 6);
        },
        color: (x, z, y, ny, out) => {
          out.copy(sand);
          if (y < 1.2) out.lerp(wet, smooth(1.2, 0.2, y));
          if (z < -150) out.copy(green).lerp(SNOW_SHADE, smooth(-260, -340, z) * 0.4);
        },
      };
    },
    water: { level: 0, deep: "#13739f", shallow: "#58c4c4", waves: 1, x: [-420, 420], z: [-420, -10] },
    trees: [{ kind: "palm", count: 14, colors: ["#3f8a3e", "#4f9c46"], zone: [-2, -24] }],
    clouds: { count: 6, color: "#ffffff", opacity: 0.8 },
    birds: 5,
    cam: { pos: [0, 7, 36], look: [0, 3, -60] },
  },
  rainy: {
    sky: { top: "#a3b3bd", horizon: "#d5dee2", sun: [0, 0.5, -1], sunColor: "#e6ecee", sunSize: 1.1 },
    fog: { color: "#cdd8dc", near: 40, far: 300 },
    light: { sky: "#d6e0e4", ground: "#6f8a70", hemi: 1.35, sun: "#e9eef0", dir: 0.6 },
    land: (n) => {
      const h = lake(landform(n, { hills: 24, peaks: 70, valley: 8 }), 0, -82, 54, 38, -7);
      const g = [col("#4b7650"), col("#5f8b5e"), col("#3f6447")];
      return {
        height: h,
        color: (x, z, y, ny, out) => {
          out.copy(g[0]).lerp(g[1], n.noise(x * 0.06, z * 0.06)).lerp(g[2], smooth(0.92, 0.7, ny) * 0.7);
        },
      };
    },
    water: { level: -4.4, deep: "#55737a", shallow: "#8ea7ab", waves: 0.25, x: [-70, 70], z: [-130, -35] },
    trees: [
      { kind: "broad", count: 260, colors: ["#3f6b45", "#4d7a4c", "#365f3e"], zone: [-14, -180] },
      { kind: "pine", count: 240, colors: ["#2d5039", "#335a40"], zone: [-30, -210] },
    ],
    weather: { kind: "rain", count: 5200 },
    clouds: { count: 12, color: "#b9c4ca", opacity: 0.9, low: true },
    cam: { pos: [0, 9, 34], look: [0, 5, -60] },
  },
  autumn: {
    sky: { top: "#94b3d4", horizon: "#f7dcb4", sun: [0.62, 0.12, -1], sunColor: "#ffd59e", sunSize: 0.9992 },
    fog: { color: "#f0dcc2", near: 70, far: 460 },
    light: { sky: "#f4dcbf", ground: "#b98b52", hemi: 1.15, sun: "#ffcf91", dir: 1.6 },
    land: (n) => {
      const h = landform(n, { hills: 20, peaks: 85, valley: 5 });
      const g = [col("#c3a05a"), col("#a98445"), col("#d1b571")];
      const far = col("#a99db4");
      return {
        height: h,
        color: (x, z, y, ny, out) => {
          out.copy(g[0]).lerp(g[2], n.noise(x * 0.05, z * 0.05)).lerp(g[1], smooth(0.92, 0.7, ny) * 0.7);
          out.lerp(far, smooth(-150, -300, z) * 0.85);
        },
      };
    },
    trees: [
      { kind: "broad", count: 420, colors: ["#d9682b", "#e89a32", "#b8402a", "#f0c045", "#c7792f"], zone: [-12, -190] },
      { kind: "pine", count: 120, colors: ["#3c5e3e"], zone: [-50, -210] },
    ],
    weather: { kind: "leaves", count: 460, colors: ["#d9682b", "#e89a32", "#b8402a", "#f0c045"] },
    clouds: { count: 6, color: "#fff2e0", opacity: 0.75 },
    birds: 7,
    cam: { pos: [0, 9, 34], look: [0, 6, -60] },
  },
  holiday: {
    sky: { top: "#5f73a8", horizon: "#f5cfc2", sun: [-0.3, 0.05, -1], sunColor: "#ffd7b8", sunSize: 0.9993, stars: true },
    fog: { color: "#e6cfd2", near: 60, far: 420 },
    light: { sky: "#c9c3e3", ground: "#efe4ea", hemi: 1.1, sun: "#ffc9a8", dir: 1.0 },
    land: (n) => {
      const h = landform(n, { hills: 14, peaks: 95, valley: 6 });
      const shade = col("#cfcbe3");
      return {
        height: h,
        color: (x, z, y, ny, out) => {
          out.copy(shade).lerp(SNOW, Math.min(1, ny * ny * 1.1));
          if (ny < 0.72 && y > 18) out.lerp(ROCK, smooth(0.72, 0.5, ny) * 0.7);
        },
      };
    },
    trees: [{ kind: "pine", count: 700, colors: ["#2c5640", "#25493a"], snow: true, zone: [-12, -190] }],
    weather: { kind: "snow", count: 2400 },
    clouds: { count: 5, color: "#f3dbe2", opacity: 0.5 },
    cabins: true,
    cam: { pos: [0, 9, 34], look: [0, 6, -60] },
  },
};

/* ---------- parts ---------- */

function skyDome(r: Recipe) {
  const sun = new THREE.Vector3(...r.sky.sun).normalize();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: col(r.sky.top) },
      uHorizon: { value: col(r.sky.horizon) },
      uSun: { value: sun },
      uSunColor: { value: col(r.sky.sunColor) },
      uSunSize: { value: r.sky.sunSize },
      uStars: { value: r.sky.stars ? 1 : 0 },
      uTime: { value: 0 },
    },
    vertexShader: `varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}`,
    fragmentShader: `
      uniform vec3 uTop;uniform vec3 uHorizon;uniform vec3 uSun;uniform vec3 uSunColor;uniform float uSunSize;uniform float uStars;uniform float uTime;
      varying vec3 vDir;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      void main(){
        vec3 d=normalize(vDir);
        float h=max(d.y,0.);
        vec3 c=mix(uHorizon,uTop,pow(smoothstep(0.,.55,h),.8));
        float s=max(dot(d,uSun),0.);
        c+=uSunColor*(pow(s,8.)*.35+pow(s,60.)*.35);
        c=mix(c,uSunColor*1.15,smoothstep(uSunSize,uSunSize+.0004,s));
        if(uStars>.5&&h>.12){vec3 q=floor(d*420.);float st=step(.9975,hash(q));c+=st*(.5+.5*sin(uTime*2.+hash(q+1.)*30.))*smoothstep(.12,.5,h)*.6;}
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  mesh.renderOrder = -1;
  return { mesh, tick: (t: number) => (mat.uniforms.uTime.value = t) };
}

function terrainMesh(land: Land) {
  const geo = new THREE.PlaneGeometry(760, 420, 160, 110);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -170);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, land.height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    land.color(pos.getX(i), pos.getZ(i), pos.getY(i), nrm.getY(i), c);
    c.toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

/** Wind: the canopy sways by height, each instance on its own beat. */
function windy(mat: THREE.Material, time: { value: number }, amount = 0.07) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float ph=instanceMatrix[3].x*.13+instanceMatrix[3].z*.09;
        float sway=sin(uTime*1.25+ph)*${amount.toFixed(3)}*max(position.y-1.,0.);
        transformed.x+=sway;transformed.z+=sway*.45;
        #endif`,
      );
  };
  return mat;
}

/** Paints a geometry one colour (for merging parts into one tree). */
function paint(g: THREE.BufferGeometry, hex: string, snowOnTop = false) {
  const g2 = g.index ? g.toNonIndexed() : g;
  const n = g2.attributes.position.count;
  const colors = new Float32Array(n * 3);
  const base = col(hex);
  const c = new THREE.Color();
  g2.computeVertexNormals();
  const nrm = g2.attributes.normal;
  for (let i = 0; i < n; i++) {
    c.copy(base);
    if (snowOnTop && nrm.getY(i) > 0.35) c.copy(SNOW);
    c.toArray(colors, i * 3);
  }
  g2.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g2;
}

function pineGeometry(green: string, snow: boolean) {
  const parts = [paint(new THREE.CylinderGeometry(0.22, 0.32, 1.8, 6).translate(0, 0.9, 0), "#5b4232")];
  [
    [2.3, 3.2, 2.6],
    [1.8, 2.9, 4.2],
    [1.25, 2.5, 5.7],
  ].forEach(([r, h, y]) => parts.push(paint(new THREE.ConeGeometry(r, h, 7).translate(0, y, 0), green, snow)));
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}
function broadGeometry() {
  const crown = new THREE.IcosahedronGeometry(2.3, 1);
  const p = crown.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + Math.sin(p.getX(i) * 3.1 + p.getZ(i) * 2.3) * 0.12;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.9, p.getZ(i) * k);
  }
  crown.translate(0, 4.4, 0);
  return { crown: paint(crown, "#ffffff"), trunk: paint(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6).translate(0, 1.6, 0), "#6b4c36") };
}
function palmGeometry(green: string) {
  const parts: THREE.BufferGeometry[] = [];
  // a gently bent trunk of stacked segments
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.CylinderGeometry(0.26 - i * 0.015, 0.3 - i * 0.015, 1.3, 7);
    seg.translate(0, 0.65, 0);
    seg.rotateZ(-0.05 * i);
    seg.translate(Math.sin(i * 0.05) * i * 0.35, i * 1.25, 0);
    parts.push(paint(seg, "#8a6a48"));
  }
  // fronds drooping out from the crown
  for (let k = 0; k < 8; k++) {
    const f = new THREE.ConeGeometry(0.45, 4.2, 4);
    f.scale(1, 1, 0.25);
    f.translate(0, 2.1, 0);
    f.rotateZ(-1.9);
    f.rotateY((k / 8) * Math.PI * 2);
    f.translate(2.3, 8.9, 0);
    parts.push(paint(f, green));
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

function forest(r: Recipe["trees"][number], land: Land, n: ReturnType<typeof makeNoise>, time: { value: number }, water: Recipe["water"], lights: THREE.Vector3[]) {
  const group = new THREE.Group();
  const count = r.count;
  const spots: THREE.Matrix4[] = [];
  const tint: THREE.Color[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let tries = 0;
  while (spots.length < count && tries++ < count * 8) {
    const z = r.zone[0] + (r.zone[1] - r.zone[0]) * Math.pow(n.rand(), 0.8);
    const spread = 40 + Math.abs(z) * 1.3;
    const x = (n.rand() * 2 - 1) * spread;
    // the near view stays open (the page's words and shoes sit in front of it): forests start a little way off and
    // keep a wide clearing down the middle; palms stand off to the sides of the beach
    if (r.kind !== "palm" && (z > -40 || (z > -90 && Math.abs(x) < 26))) continue;
    if (r.kind === "palm" && Math.abs(x) < 26) continue;
    if (water && x > water.x[0] - 4 && x < water.x[1] + 4 && z > water.z[0] - 4 && z < water.z[1] + 4 && land.height(x, z) < water.level + 1.5) continue;
    const y = land.height(x, z);
    if (r.kind !== "palm" && y > 70) continue;
    // forests grow in clumps
    if (r.kind !== "palm" && n.noise(x * 0.03 + 50, z * 0.03) < 0.42) continue;
    const s = (r.kind === "palm" ? 0.75 : 0.7) + n.rand() * (r.kind === "palm" ? 0.4 : 0.8);
    q.setFromAxisAngle(up, n.rand() * Math.PI * 2);
    m.compose(new THREE.Vector3(x, y - 0.3, z), q, new THREE.Vector3(s, s * (0.9 + n.rand() * 0.3), s));
    spots.push(m.clone());
    tint.push(col(r.colors[Math.floor(n.rand() * r.colors.length)]));
    if (lights && r.snow && z > -90 && n.rand() < 0.35) lights.push(new THREE.Vector3(x, y + 3.5 * s, z));
  }
  const make = (geo: THREE.BufferGeometry, which: number[], tinted: boolean, sway: number) => {
    const mat = windy(new THREE.MeshLambertMaterial({ vertexColors: true }), time, sway);
    const mesh = new THREE.InstancedMesh(geo, mat, which.length);
    which.forEach((k, i) => {
      mesh.setMatrixAt(i, spots[k]);
      if (tinted) mesh.setColorAt(i, tint[k]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  };
  const all = spots.map((_, i) => i);
  if (r.kind === "broad") {
    // crowns take a per-tree tint (blossom, greens, autumn colours); trunks stay bark
    const g = broadGeometry();
    group.add(make(g.crown, all, true, 0.06), make(g.trunk, all, false, 0.02));
  } else {
    // pines and palms: one mesh per green, painted into the geometry, so snow stays white and trunks stay brown
    r.colors.forEach((c, ci) => {
      const which = all.filter((i) => i % r.colors.length === ci);
      if (!which.length) return;
      const geo = r.kind === "pine" ? pineGeometry(c, !!r.snow) : palmGeometry(c);
      group.add(make(geo, which, false, r.kind === "pine" ? 0.035 : 0.05));
    });
  }
  return group;
}

function waterMesh(w: NonNullable<Recipe["water"]>, r: Recipe) {
  const width = w.x[1] - w.x[0];
  const depth = w.z[1] - w.z[0];
  const geo = new THREE.PlaneGeometry(width, depth, Math.min(160, Math.round(width / 4)), Math.min(120, Math.round(depth / 4)));
  geo.rotateX(-Math.PI / 2);
  geo.translate((w.x[0] + w.x[1]) / 2, w.level, (w.z[0] + w.z[1]) / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: col(w.deep) },
      uShallow: { value: col(w.shallow) },
      uSky: { value: col(r.sky.horizon) },
      uSun: { value: new THREE.Vector3(...r.sky.sun).normalize() },
      uSunColor: { value: col(r.sky.sunColor) },
      uWaves: { value: w.waves },
      uIce: { value: w.ice ? 1 : 0 },
      uFog: { value: col(r.fog.color) },
      uFogNear: { value: r.fog.near },
      uFogFar: { value: r.fog.far },
    },
    vertexShader: `
      uniform float uTime;uniform float uWaves;
      varying vec3 vWorld;varying vec3 vNormal;varying float vDist;
      void main(){
        vec3 p=position;
        float a=uWaves;
        float w1=sin(p.x*.06+uTime*1.1)*.55, w2=sin(p.z*.09+uTime*1.4+p.x*.02)*.4, w3=sin((p.x+p.z)*.18+uTime*2.1)*.12;
        p.y+=(w1+w2+w3)*a;
        float dx=(cos(p.x*.06+uTime*1.1)*.033+cos((p.x+p.z)*.18+uTime*2.1)*.0216+cos(p.z*.09+uTime*1.4+p.x*.02)*.008)*a;
        float dz=(cos(p.z*.09+uTime*1.4+p.x*.02)*.036+cos((p.x+p.z)*.18+uTime*2.1)*.0216)*a;
        vNormal=normalize(vec3(-dx,1.,-dz));
        vec4 wp=modelMatrix*vec4(p,1.);vWorld=wp.xyz;
        vec4 mv=viewMatrix*wp;vDist=-mv.z;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform vec3 uDeep;uniform vec3 uShallow;uniform vec3 uSky;uniform vec3 uSun;uniform vec3 uSunColor;uniform float uIce;uniform float uTime;
      uniform vec3 uFog;uniform float uFogNear;uniform float uFogFar;
      varying vec3 vWorld;varying vec3 vNormal;varying float vDist;
      void main(){
        vec3 v=normalize(cameraPosition-vWorld);
        vec3 n=normalize(vNormal);
        float fres=pow(1.-max(dot(v,n),0.),3.);
        vec3 c=mix(uShallow,uDeep,smoothstep(20.,260.,vDist));
        c=mix(c,uSky,fres*.75);
        vec3 h=normalize(v+uSun);
        float spec=pow(max(dot(n,h),0.),uIce>.5?60.:220.);
        c+=uSunColor*spec*(uIce>.5?.35:1.4);
        if(uIce>.5){c=mix(c,vec3(1.),.18);}
        c=mix(c,uFog,smoothstep(uFogNear,uFogFar,vDist));
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  });
  return { mesh: new THREE.Mesh(geo, mat), tick: (t: number) => (mat.uniforms.uTime.value = t) };
}

/** The weather, moved entirely in the vertex shader: positions wrap through a box that follows the camera. */
function weatherPoints(w: NonNullable<Recipe["weather"]>, n: ReturnType<typeof makeNoise>) {
  const count = w.count;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  const tint = new Float32Array(count * 3);
  const palette = (w.colors ?? ["#ffffff"]).map(col);
  for (let i = 0; i < count; i++) {
    pos.set([(n.rand() * 2 - 1) * 70, n.rand() * 46, -n.rand() * 110 + 25], i * 3);
    seed.set([n.rand(), n.rand(), n.rand(), n.rand()], i * 4);
    palette[i % palette.length].toArray(tint, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  geo.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 20, -30), 400);
  const kind = { snow: 0, rain: 1, petals: 2, leaves: 3 }[w.kind];
  const speed = { snow: 3.2, rain: 34, petals: 2.6, leaves: 3.4 }[w.kind];
  const size = { snow: 0.17, rain: 0.55, petals: 0.3, leaves: 0.4 }[w.kind];
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uPx: { value: 600 }, uKind: { value: kind } },
    vertexShader: `
      uniform float uTime;uniform vec3 uOrigin;uniform float uPx;uniform float uKind;
      attribute vec4 aSeed;attribute vec3 aTint;
      varying vec3 vTint;varying float vRot;varying float vAlpha;
      void main(){
        vec3 p=position;
        float sp=${speed.toFixed(2)}*(.6+aSeed.x*.8);
        p.y=mod(p.y-uTime*sp,46.);
        p.x+=sin(uTime*(.5+aSeed.y)+aSeed.z*6.28)*(uKind>.5&&uKind<1.5?.3:2.2);
        p.z+=cos(uTime*(.4+aSeed.w)+aSeed.y*6.28)*(uKind>.5&&uKind<1.5?.2:1.4);
        p.x+=uOrigin.x;p.z+=uOrigin.z;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_PointSize=${size.toFixed(2)}*(.6+aSeed.w*.9)*uPx/max(-mv.z,1.);
        gl_Position=projectionMatrix*mv;
        vTint=aTint;vRot=uTime*(aSeed.x-.5)*3.+aSeed.z*6.28;
        vAlpha=smoothstep(2.,10.,-mv.z)*(1.-smoothstep(70.,110.,-mv.z));
      }`,
    fragmentShader: `
      uniform float uKind;varying vec3 vTint;varying float vRot;varying float vAlpha;
      void main(){
        vec2 q=gl_PointCoord-.5;
        float a;
        if(uKind<.5){a=smoothstep(.5,.15,length(q));}                       // snow: a soft flake
        else if(uKind<1.5){a=smoothstep(.06,0.,abs(q.x+q.y*.12))*smoothstep(.5,.2,abs(q.y));} // rain: a streak
        else{ // petals and leaves: a turning, tumbling shape
          float c=cos(vRot),s=sin(vRot);vec2 r=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
          r.x*=abs(sin(vRot*.7))*.7+.3;
          a=uKind<2.5?smoothstep(.36,.3,length(r*vec2(1.,1.7))):smoothstep(.34,.28,abs(r.x)+abs(r.y)*.8);
        }
        if(a<.02)discard;
        vec3 c=uKind<1.5?mix(vec3(.75,.82,.86),vec3(1.),uKind<.5?1.:.4):vTint;
        gl_FragColor=vec4(c,a*vAlpha*(uKind>.5&&uKind<1.5?.55:.95));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {
    mesh: points,
    tick: (t: number, cam: THREE.Camera, px: number) => {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uOrigin.value.set(cam.position.x, 0, cam.position.z - 30);
      points.position.y = cam.position.y - 22;
      mat.uniforms.uPx.value = px;
    },
  };
}

function cloudTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  const r = rng(7);
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 176;
    const y = 50 + r() * 40 - Math.abs(x - 128) * 0.12;
    const rad = 18 + r() * 34;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.arc(x, y, rad, 0, 6.283);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function cloudLayer(cl: NonNullable<Recipe["clouds"]>, n: ReturnType<typeof makeNoise>) {
  const tex = cloudTexture(cl.color);
  const group = new THREE.Group();
  const sprites: { s: THREE.Sprite; speed: number }[] = [];
  for (let i = 0; i < cl.count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: cl.opacity * (0.6 + n.rand() * 0.4), depthWrite: false, fog: true }));
    const w = 120 + n.rand() * 160;
    s.scale.set(w, w * 0.4, 1);
    s.position.set((n.rand() * 2 - 1) * 380, (cl.low ? 45 : 85) + n.rand() * 60, -320 - n.rand() * 160);
    group.add(s);
    sprites.push({ s, speed: 1.2 + n.rand() * 2 });
  }
  return {
    mesh: group,
    tick: (dt: number) => {
      for (const c of sprites) {
        c.s.position.x += c.speed * dt;
        if (c.s.position.x > 460) c.s.position.x = -460;
      }
    },
  };
}

/** A flock crossing the sky: a few V shapes flapping, moved on the CPU (there are only a handful). */
function flock(count: number, n: ReturnType<typeof makeNoise>, white = false) {
  const wing = new THREE.BufferGeometry();
  wing.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, -1.7, 0.8, -0.3, -0.8, 0.1, 0.55, 0, 0, 0, 1.7, 0.8, -0.3, 0.8, 0.1, 0.55]), 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: white ? "#f4f4f2" : "#2b3530", side: THREE.DoubleSide, fog: true });
  const mesh = new THREE.InstancedMesh(wing, mat, count);
  const birds = Array.from({ length: count }, (_, i) => ({ off: new THREE.Vector3((i % 5) * -3.5, Math.abs((i % 5) - 2) * 1.2 + Math.floor(i / 5) * 2.5, (i % 3) * 2), ph: n.rand() * 6.28 }));
  const lead = new THREE.Vector3(-160, 34, -110);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  return {
    mesh,
    tick: (t: number, dt: number) => {
      lead.x += 11 * dt;
      lead.y = 34 + Math.sin(t * 0.3) * 3;
      if (lead.x > 200) lead.set(-200, 30 + n.rand() * 10, -90 - n.rand() * 50);
      birds.forEach((b, i) => {
        const flap = Math.sin(t * 7 + b.ph);
        p.copy(lead).add(b.off);
        e.set(0, Math.PI / 2, 0);
        q.setFromEuler(e);
        s.set(1.1, 0.35 + flap * 0.9, 1.1);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/** Meadow flowers: a scatter of tiny bright points on the near ground. */
function meadow(colors: string[], land: Land, n: ReturnType<typeof makeNoise>) {
  const count = 1600;
  const pos = new Float32Array(count * 3);
  const tint = new Float32Array(count * 3);
  const pal = colors.map(col);
  for (let i = 0; i < count; i++) {
    const z = -8 - n.rand() * 110;
    const x = (n.rand() * 2 - 1) * (40 + Math.abs(z) * 1.2);
    pos.set([x, land.height(x, z) + 0.15, z], i * 3);
    pal[i % pal.length].toArray(tint, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(tint, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, sizeAttenuation: true, fog: true }));
}

/** Holiday: a handful of cabins with lit windows, and fairy lights in the near pines. */
function village(land: Land, lights: THREE.Vector3[], n: ReturnType<typeof makeNoise>) {
  const group = new THREE.Group();
  const spots = [
    [-26, -58],
    [-38, -72],
    [24, -64],
    [36, -84],
    [-14, -96],
  ];
  const wall = new THREE.MeshLambertMaterial({ color: "#7b5a44" });
  const roof = new THREE.MeshLambertMaterial({ color: "#f6f7fb" });
  const glow = new THREE.MeshBasicMaterial({ color: "#ffcf7a", fog: true });
  for (const [x, z] of spots) {
    const y = land.height(x, z);
    const h = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.6, 4.6), wall);
    body.position.y = 1.8;
    const top = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.6, 4), roof);
    top.position.y = 4.9;
    top.rotation.y = Math.PI / 4;
    top.scale.z = 0.8;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), glow);
    win.position.set(-1.4, 1.9, 2.31);
    const win2 = win.clone();
    win2.position.x = 1.4;
    h.add(body, top, win, win2);
    h.position.set(x, y - 0.2, z);
    h.rotation.y = (n.rand() - 0.5) * 0.6;
    group.add(h);
  }
  // fairy lights: warm points that twinkle
  const pos = new Float32Array(lights.length * 3 * 6);
  const ph = new Float32Array(lights.length * 6);
  const tint = new Float32Array(lights.length * 3 * 6);
  const pal = ["#ffd27a", "#ff7a7a", "#8fe0a0", "#fff3d6"].map(col);
  let k = 0;
  for (const l of lights)
    for (let j = 0; j < 6; j++) {
      const a = n.rand() * 6.28;
      const r = 0.6 + n.rand() * 1.3;
      pos.set([l.x + Math.cos(a) * r, l.y - n.rand() * 3, l.z + Math.sin(a) * r], k * 3);
      ph[k] = n.rand() * 6.28;
      pal[k % pal.length].toArray(tint, k * 3);
      k++;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
  geo.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 600 } },
    vertexShader: `uniform float uTime;uniform float uPx;attribute float aPh;attribute vec3 aTint;varying vec3 vTint;varying float vA;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=.55*uPx/max(-mv.z,1.);gl_Position=projectionMatrix*mv;vTint=aTint;vA=.55+.45*sin(uTime*2.4+aPh);}`,
    fragmentShader: `varying vec3 vTint;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);if(a<.02)discard;gl_FragColor=vec4(vTint*1.4,a*vA);
      #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  group.add(pts);
  return { mesh: group, tick: (t: number, px: number) => ((mat.uniforms.uTime.value = t), (mat.uniforms.uPx.value = px)) };
}

/* ---------- the world ---------- */

const SCALES = [1, 0.8, 0.62, 0.48];

export function createWorld(canvas: HTMLCanvasElement, onFirstFrame: () => void): World | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: (devicePixelRatio || 1) < 1.5, powerPreference: "high-performance", alpha: false, stencil: false });
  } catch {
    return null;
  }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1400);
  const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;

  let scene = new THREE.Scene();
  let ticks: ((t: number, dt: number) => void)[] = [];
  let token = 0;
  let recipe: Recipe = RECIPES.winter;
  let season: WorldSeason | null = null;
  let still = true;

  const time = { value: 0 };
  let pxScale = 600;

  function dispose(s: THREE.Scene) {
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
  }

  /** Builds the season's scene in small steps (yielding between them); swaps it in when complete. */
  async function build(s: WorldSeason, mine: number) {
    const next = new THREE.Scene();
    const nextTicks: typeof ticks = [];
    const r = RECIPES[s];
    const n = makeNoise(s.length * 97 + 13);
    next.fog = new THREE.Fog(col(r.fog.color), r.fog.near, r.fog.far);
    next.background = col(r.fog.color);
    // physical light units: a Lambert surface returns intensity / π, so these are scaled to read as daylight
    next.add(new THREE.HemisphereLight(col(r.light.sky), col(r.light.ground), r.light.hemi * 2.1));
    const sun = new THREE.DirectionalLight(col(r.light.sun), r.light.dir * 1.7);
    sun.position.set(...(r.sky.sun.map((v) => v * 100) as [number, number, number]));
    next.add(sun);
    const sky = skyDome(r);
    next.add(sky.mesh);
    nextTicks.push((t) => sky.tick(t));
    const land = r.land(n);
    await breathe();
    if (mine !== token) return false;
    next.add(terrainMesh(land));
    const lights: THREE.Vector3[] = [];
    for (const tr of r.trees) {
      await breathe();
      if (mine !== token) return false;
      next.add(forest({ ...tr, count: Math.round(tr.count * (small ? 0.55 : 1)) }, land, n, time, r.water, lights));
    }
    await breathe();
    if (mine !== token) return false;
    if (r.water) {
      const w = waterMesh(r.water, r);
      next.add(w.mesh);
      nextTicks.push((t) => w.tick(t));
    }
    if (r.clouds) {
      const c = cloudLayer(r.clouds, n);
      next.add(c.mesh);
      nextTicks.push((_t, dt) => c.tick(dt));
    }
    if (r.flowers) next.add(meadow(r.flowers, land, n));
    if (r.birds) {
      const b = flock(r.birds, n, s === "summer");
      next.add(b.mesh);
      nextTicks.push((t, dt) => b.tick(t, dt));
    }
    if (r.cabins) {
      const v = village(land, lights, n);
      next.add(v.mesh);
      nextTicks.push((t) => v.tick(t, pxScale));
    }
    if (r.weather) {
      const w = weatherPoints({ ...r.weather, count: Math.round(r.weather.count * (small ? 0.5 : 1)) }, n);
      next.add(w.mesh);
      nextTicks.push((t) => w.tick(t, camera, pxScale));
    }
    // shaders compile off the main thread where the browser can (KHR_parallel_shader_compile)
    await renderer.compileAsync(next, camera);
    if (mine !== token) {
      dispose(next);
      return false;
    }
    const old = scene;
    scene = next;
    ticks = nextTicks;
    recipe = r;
    dispose(old);
    return true;
  }

  /* camera: a slow drift, a dolly with the page's scroll, a touch of parallax from the pointer; all eased */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollEase = 0;
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  };
  const look = new THREE.Vector3();
  function placeCamera(t: number, dt: number) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const target = Math.min(1, scrollY / max);
    const k = Math.min(1, dt * 3);
    scrollEase += (target - scrollEase) * k;
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    const [px, py, pz] = recipe.cam.pos;
    const [lx, ly, lz] = recipe.cam.look;
    camera.position.set(px + Math.sin(t * 0.05) * 3 + pointer.x * 1.6, py + Math.sin(t * 0.07) * 0.5 - pointer.y * 0.8 + scrollEase * 4, pz - scrollEase * 26);
    look.set(lx + Math.sin(t * 0.04) * 4, ly + scrollEase * 2, lz - scrollEase * 26);
    camera.lookAt(look);
  }

  /* size and quality */
  let level = small ? 1 : 0;
  function size() {
    const pr = Math.min(devicePixelRatio || 1, 1.5) * SCALES[level];
    renderer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < innerHeight ? 62 : 50;
    camera.updateProjectionMatrix();
    pxScale = (innerHeight * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  const t0 = performance.now() - 30_000;
  let last = performance.now();
  function frame(ms: number) {
    const dt = Math.min((ms - last) / 1000, 0.05);
    last = ms;
    const t = (ms - t0) / 1000;
    time.value = t;
    placeCamera(t, still ? 1 : dt);
    for (const f of ticks) f(t, still ? 0 : dt);
    renderer.render(scene, camera);
  }

  // frame-time watch, every half second: under ~45 fps step the resolution down; at the lowest step cap to 30 fps,
  // then hold a still. Counting every browser frame, drawn or skipped, so skipping never reads as slowness.
  let raf = 0;
  let frames = 0;
  let windowStart = 0;
  let capped = false;
  let lastDraw = 0;
  let scrolledAt = -Infinity;
  let odd = false;
  const onScroll = () => {
    scrolledAt = performance.now();
    if (!raf) requestAnimationFrame((ms) => frame(ms)); // still mode: follow the scroll with single frames
  };
  function loop(ms: number) {
    raf = requestAnimationFrame(loop);
    frames++;
    if (ms - windowStart >= 500) {
      const mean = (ms - windowStart) / frames;
      frames = 0;
      windowStart = ms;
      if (mean > 21 && level < SCALES.length - 1) {
        level++;
        size();
      } else if (mean > 21 && !capped) capped = true;
      else if (mean > 45) return stop();
    }
    if (capped && ms - lastDraw < 31) return;
    // while the page scrolls the world draws every other frame: the GPU stays free for the scroll itself
    if (ms - scrolledAt < 160 && (odd = !odd)) return;
    lastDraw = ms;
    frame(ms);
  }
  function start() {
    if (still || raf || document.hidden || !season) return;
    last = windowStart = performance.now();
    frames = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  const onResize = () => {
    size();
    if (!raf) frame(performance.now());
  };
  const onVis = () => (document.hidden ? stop() : start());
  addEventListener("resize", onResize, { passive: true });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  size();

  let first = true;
  return {
    set(s, st) {
      still = st;
      if (still) stop();
      if (s === season) {
        frame(performance.now());
        start();
        return;
      }
      season = s;
      const mine = ++token;
      // the current world keeps running while the next one builds; it swaps in once it is complete
      build(s, mine).then((done) => {
        if (!done) return;
        frame(performance.now());
        if (first) {
          first = false;
          onFirstFrame();
        }
        start();
      });
    },
    destroy() {
      token++;
      stop();
      removeEventListener("resize", onResize);
      removeEventListener("scroll", onScroll);
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVis);
      dispose(scene);
      renderer.dispose();
    },
  };
}
