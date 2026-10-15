/**
 * The homepage hero in WebGL: a curved ivory showroom wall set with arched, backlit niches (brass rims, glass shelves,
 * one pair per shelf), a polished white-marble floor that mirrors the room, and three round marble pillars with brass
 * rings carrying one pair per line (women, kids, men).
 *
 * On load the room "renders in": each niche dissolves into being from the centre outward with a warm glowing edge,
 * its shoes a beat later; the pillars grow up out of the floor, the hero pairs settle onto them and their spotlights
 * come up. Reduced motion shows the finished room at once.
 *
 * Framework-free like the showroom scene: HeroStore3D.tsx creates it, keeps the headline, button and labels in HTML
 * over the canvas, and places the labels from the pillar positions this reports.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import gsap from "gsap";

export type HeroShoe = { src: string; w: number; h: number };

/** Where a pillar sits on screen, in CSS px from the canvas's top-left: centre x, top of its pair, foot of the pillar. */
export type PillarRect = { x: number; top: number; bottom: number; w: number };

export type HeroSceneOptions = {
  /** Pairs for the niches, used in order. */
  wall: HeroShoe[];
  /** The three hero pairs, left to right. */
  pillars: [HeroShoe, HeroShoe, HeroShoe];
  mobile: boolean;
  reduced: boolean;
  onReady?: () => void;
  onLayout?: (rects: PillarRect[]) => void;
};

export type HeroSceneApi = {
  /** Render only while the hero is on screen and the tab is visible. */
  setActive: (on: boolean) => void;
  /** Lift the pair on a pillar while its label is pointed at (null: none). */
  setHover: (i: number | null) => void;
  dispose: () => void;
};

/* ---------- room layout (metres) ---------- */
const R = 9; // wall radius
const C = new THREE.Vector3(0, 0, 4.5); // wall centre: the wall's middle stands at z = -4.5
/** Where the camera settles: wide screens stand back to take in both banks of arches; phones step in to the pillars. */
const CAM = new THREE.Vector3(0, 2.25, 9.4);
const LOOK = new THREE.Vector3(0, 1.45, 0);
const CAM_NARROW = new THREE.Vector3(0, 2.05, 8.3);
const LOOK_NARROW = new THREE.Vector3(0, 1.55, 0);
const SHORT = { w: 0.95, h: 2.1, y: 0.55, shelves: 3, shoe: 0.3 };
const TALL = { w: 1.0, h: 3.3, y: 0.25, shelves: 4, shoe: 0.33 };
const STEP_SHORT = 1.18 / R;
const STEP_TALL = 1.3 / R;
const PILLARS = [
  { x: -2.4, z: 2.2, h: 0.8, r: 0.56, shoe: 0.6 },
  { x: 0, z: 1.2, h: 1.05, r: 0.54, shoe: 0.58 },
  { x: 2.4, z: 2.2, h: 0.8, r: 0.56, shoe: 0.58 },
];

/** Five short arches in the middle, four tall ones on each side, as angles round the wall. */
function nicheLayout() {
  const out: { theta: number; kind: typeof SHORT }[] = [];
  for (let i = -2; i <= 2; i++) out.push({ theta: i * STEP_SHORT, kind: SHORT });
  const first = 2.5 * STEP_SHORT + 0.05 + 0.5 * STEP_TALL;
  for (let j = 0; j < 4; j++) {
    const t = first + j * STEP_TALL;
    out.push({ theta: -t, kind: TALL }, { theta: t, kind: TALL });
  }
  return out;
}

/** Cloudinary cutouts come at 1400 px; ask for what the plane needs. Local files are used as they are. */
const sized = (src: string, px: number) => src.replace(/c_limit,w_\d+,h_\d+/, `c_limit,w_${px},h_${px}`);

/* ---------- procedural textures ---------- */

/** White Carrara: the same noise recipe as the CSS `marble` utility, rasterised once at 1024 px. */
function marbleSVG(size: number) {
  const veins = (seed: number, f: string, peak: number, slots: number) => {
    const table = Array.from({ length: slots }, (_, i) => (i === Math.floor(slots / 2) ? peak : 0)).join(" ");
    return `<filter id='f${seed}' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='5' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.43 0 0 0 0 0.46 1 0 0 0 0'/><feComponentTransfer><feFuncA type='table' tableValues='${table}'/></feComponentTransfer></filter>`;
  };
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><defs>${veins(21, "0.0024 0.005", 0.36, 21)}${veins(5, "0.006 0.01", 0.22, 29)}<filter id='cl' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.004' numOctaves='3' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.56 0 0 0 0 0.58 0.08 0 0 0 -0.02'/></filter></defs><rect width='100%' height='100%' fill='#f4f3f0'/><rect width='100%' height='100%' filter='url(#cl)'/><rect width='100%' height='100%' filter='url(#f21)'/><rect width='100%' height='100%' filter='url(#f5)'/></svg>`;
}

function loadMarble(renderer: THREE.WebGLRenderer, onDone: () => void) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4f3f0";
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    tex.needsUpdate = true;
    onDone();
  };
  img.onerror = onDone; // the plain white base still reads as stone
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(marbleSVG(size))}`;
  return tex;
}

/** The lit inside of a niche: warm cream, brightest under the LED at the top, darker toward the sides (the recess). */
function nicheGlow() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, "#fff6e6");
  v.addColorStop(0.35, "#f8e8cf");
  v.addColorStop(1, "#efdcbf");
  g.fillStyle = v;
  g.fillRect(0, 0, 128, 256);
  const top = g.createRadialGradient(64, 18, 4, 64, 18, 110);
  top.addColorStop(0, "rgba(255,255,255,.9)");
  top.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = top;
  g.fillRect(0, 0, 128, 256);
  const side = g.createLinearGradient(0, 0, 128, 0);
  side.addColorStop(0, "rgba(120,80,40,.28)");
  side.addColorStop(0.2, "rgba(120,80,40,0)");
  side.addColorStop(0.8, "rgba(120,80,40,0)");
  side.addColorStop(1, "rgba(120,80,40,.28)");
  g.fillStyle = side;
  g.fillRect(0, 0, 128, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft dark ellipse for contact shadows. */
function blob() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(40,30,20,.55)");
  r.addColorStop(0.6, "rgba(40,30,20,.18)");
  r.addColorStop(1, "rgba(40,30,20,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------- arch shapes ---------- */

function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return s;
}

/** The brass band round the sides and top of an arch, t wide. */
function rimShape(w: number, h: number, t: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - t, 0);
  s.lineTo(-w / 2 - t, h - w / 2);
  s.absarc(0, h - w / 2, w / 2 + t, Math.PI, 0, true);
  s.lineTo(w / 2 + t, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  s.closePath();
  return s;
}

/** ShapeGeometry UVs are raw shape units; map them to 0–1 over the arch so a texture fills it. */
function normaliseUV(geo: THREE.BufferGeometry, w: number, h: number) {
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / h);
  uv.needsUpdate = true;
}

/* ---------- dissolve: niches materialise through noise with a warm edge ---------- */

type Dissolve = { uDissolve: { value: number } };

const NOISE = /* glsl */ `
float dHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i), dHash(i + vec3(1,0,0)), f.x), mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), f.x), mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

function dissolvable<M extends THREE.Material>(m: M, d: Dissolve): M {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDissolve = d.uDissolve;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vDPos;\nuniform float uDissolve;\n${NOISE}`)
      .replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nfloat dN = dNoise(vDPos * 7.0) * 0.7 + dNoise(vDPos * 23.0) * 0.3;\nif (dN > uDissolve) discard;",
      )
      .replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\nfloat dE = smoothstep(uDissolve - 0.07, uDissolve, dN) * step(uDissolve, 0.999);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.82, 0.55) * 1.6, dE);",
      );
  };
  m.customProgramCacheKey = () => "hero-dissolve";
  return m;
}

/* ---------- the scene ---------- */

export function createHeroScene(canvas: HTMLCanvasElement, opts: HeroSceneOptions): HeroSceneApi {
  const { mobile, reduced } = opts;
  const host = canvas.parentElement!;
  const size = () => ({ w: Math.max(1, host.clientWidth), h: Math.max(1, host.clientHeight) });
  let { w: W, h: H } = size();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f3ece3");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 60);
  const fit = () => {
    // keep the room's width in frame: wide screens see both banks of arches, phones crop to the pillars
    const aspect = W / H;
    const hfov = aspect >= 1.2 ? 72 : 58;
    camera.fov = Math.min(76, (2 * Math.atan(Math.tan(((hfov / 2) * Math.PI) / 180) / aspect) * 180) / Math.PI);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };
  fit();
  const pose = () => (W / H < 1.2 ? { cam: CAM_NARROW, look: LOOK_NARROW } : { cam: CAM, look: LOOK });
  camera.position.copy(reduced ? pose().cam : pose().cam.clone().add(new THREE.Vector3(0, 0.55, 2.4)));
  camera.lookAt(pose().look);

  const textures: THREE.Texture[] = [];
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  loader.setCrossOrigin("anonymous");
  const shoeTex = (src: string, px: number) => {
    const t = loader.load(sized(src, px));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = mobile ? 4 : 8;
    textures.push(t);
    return t;
  };

  manager.itemStart("marble");
  const marble = loadMarble(renderer, () => manager.itemEnd("marble"));
  const glow = nicheGlow();
  const shadow = blob();
  textures.push(marble, glow, shadow);

  /* lights */
  scene.add(new THREE.HemisphereLight("#fffaf2", "#d9cfc2", 1.15));
  const key = new THREE.DirectionalLight("#fff6ea", 1.1);
  key.position.set(-3, 6, 6);
  scene.add(key);

  /* wall, ceiling */
  const wallGeo = new THREE.CylinderGeometry(R + 0.03, R + 0.03, 5.2, 96, 1, true, Math.PI - 1.25, 2.5);
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: "#efe5d8", roughness: 0.95, side: THREE.BackSide }));
  wall.position.set(C.x, 2.6, C.z);
  scene.add(wall);

  // the ceiling reads as lit plaster: unlit material, so it stays bright ivory whatever the lights do
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: "#efe6da" }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4.7;
  scene.add(ceiling);
  const lampGeo = new THREE.CircleGeometry(0.09, 24);
  const lampMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  for (let i = -3; i <= 3; i++) {
    const th = i * 0.28;
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(C.x + (R - 1.2) * Math.sin(th), 4.69, C.z - (R - 1.2) * Math.cos(th));
    scene.add(lamp);
  }

  /* polished marble floor: a mirror under a translucent marble skin */
  const mirror = new Reflector(new THREE.PlaneGeometry(40, 40), {
    textureWidth: Math.round(W * dpr * 0.5),
    textureHeight: Math.round(H * dpr * 0.5),
    color: 0xb9b7b3,
  });
  mirror.rotation.x = -Math.PI / 2;
  scene.add(mirror);
  marble.repeat.set(5, 5);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ map: marble, roughness: 0.32, transparent: true, opacity: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.002;
  scene.add(floor);

  /* niches */
  const brass = () => new THREE.MeshStandardMaterial({ color: "#c9a76d", metalness: 1, roughness: 0.32 });
  const glass = () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.06, transparent: true, opacity: 0.38 });
  const niches: { theta: number; frame: Dissolve; shoes: Dissolve }[] = [];
  let next = 0;
  for (const { theta, kind } of nicheLayout()) {
    const frame: Dissolve = { uDissolve: { value: reduced ? 1.1 : -0.1 } };
    const shoes: Dissolve = { uDissolve: { value: reduced ? 1.1 : -0.1 } };
    const g = new THREE.Group();
    g.position.set(C.x + R * Math.sin(theta), kind.y, C.z - R * Math.cos(theta));
    g.rotation.y = -theta;

    const backGeo = new THREE.ShapeGeometry(archShape(kind.w, kind.h), 24);
    normaliseUV(backGeo, kind.w, kind.h);
    const back = new THREE.Mesh(backGeo, dissolvable(new THREE.MeshBasicMaterial({ map: glow }), frame));
    g.add(back);

    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(rimShape(kind.w, kind.h, 0.045), { depth: 0.05, bevelEnabled: false, curveSegments: 24 }),
      dissolvable(brass(), frame),
    );
    g.add(rim);

    const top = kind.h - kind.w / 2 - 0.12;
    const gap = (top - 0.12) / kind.shelves;
    for (let s = 0; s < kind.shelves; s++) {
      const y = 0.12 + s * gap;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(kind.w * 0.88, 0.018, 0.24), dissolvable(glass(), frame));
      shelf.position.set(0, y, 0.12);
      g.add(shelf);

      const p = opts.wall[next++ % opts.wall.length];
      const sh = kind.shoe;
      const sw = Math.min(kind.w * 0.8, (sh * p.w) / p.h);
      const shoe = new THREE.Mesh(
        new THREE.PlaneGeometry(sw, (sw * p.h) / p.w),
        dissolvable(new THREE.MeshBasicMaterial({ map: shoeTex(p.src, 320), transparent: true, alphaTest: 0.4 }), shoes),
      );
      shoe.position.set(0, y + 0.009 + (sw * p.h) / p.w / 2, 0.13);
      g.add(shoe);
    }
    scene.add(g);
    niches.push({ theta, frame, shoes });
  }

  /* pillars */
  const pillarMarble = marble.clone();
  pillarMarble.repeat.set(1.6, 1);
  textures.push(pillarMarble);
  const pillars = PILLARS.map((pp, i) => {
    const group = new THREE.Group();
    group.position.set(pp.x, 0, pp.z);
    const grow = new THREE.Group(); // scaled up out of the floor on load
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(pp.r, pp.r, pp.h, 72).translate(0, pp.h / 2, 0),
      new THREE.MeshStandardMaterial({ map: pillarMarble, roughness: 0.2, envMapIntensity: 0.8 }),
    );
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(pp.r + 0.008, pp.r + 0.008, 0.035, 72, 1, true), brass());
    ring.position.y = pp.h - 0.13;
    const foot = new THREE.Mesh(new THREE.PlaneGeometry(pp.r * 3.2, pp.r * 2.2), new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false }));
    foot.rotation.x = -Math.PI / 2;
    foot.position.y = 0.006;
    grow.add(body, ring);
    group.add(grow, foot);

    const p = opts.pillars[i];
    const sh = pp.shoe;
    const sw = (sh * p.w) / p.h;
    const pairMat = new THREE.MeshBasicMaterial({ map: shoeTex(p.src, 800), transparent: true, alphaTest: 0.35, opacity: reduced ? 1 : 0 });
    const pair = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), pairMat);
    const rest = pp.h + sh / 2 - 0.01;
    pair.position.y = reduced ? rest : rest + 0.9;
    const seat = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.9, pp.r * 0.8), new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false, opacity: reduced ? 1 : 0 }));
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = pp.h + 0.004;
    group.add(pair, seat);

    const spot = new THREE.SpotLight("#fff1dc", reduced ? 38 : 0, 0, 0.42, 0.85, 2);
    spot.position.set(pp.x, 4.6, pp.z + 0.4);
    spot.target.position.set(pp.x, pp.h, pp.z);
    scene.add(spot, spot.target);

    grow.scale.y = reduced ? 1 : 0.001;
    scene.add(group);
    return { pp, group, grow, pair, pairMat, seat, rest, spot, lift: 0 };
  });

  /* pairs face the camera (turned only about the vertical) */
  const face = () => {
    for (const p of pillars) p.pair.rotation.y = Math.atan2(camera.position.x - p.pp.x, camera.position.z - p.pp.z);
  };

  /* labels follow the pillars: report where they land on screen for the final camera pose */
  const layout = () => {
    if (!opts.onLayout) return;
    const cam = camera.clone();
    cam.position.copy(pose().cam);
    cam.lookAt(pose().look);
    cam.updateMatrixWorld();
    const toScreen = (v: THREE.Vector3) => {
      const s = v.clone().project(cam);
      return { x: ((s.x + 1) / 2) * W, y: ((1 - s.y) / 2) * H };
    };
    opts.onLayout(
      pillars.map(({ pp }) => {
        const foot = toScreen(new THREE.Vector3(pp.x, 0, pp.z + pp.r));
        const head = toScreen(new THREE.Vector3(pp.x, pp.h + pp.shoe, pp.z));
        const side = toScreen(new THREE.Vector3(pp.x + pp.r, 0, pp.z + pp.r));
        return { x: foot.x, top: head.y, bottom: foot.y, w: Math.abs(side.x - foot.x) * 2.3 };
      }),
    );
  };

  /* intro */
  const tl = gsap.timeline({ paused: true });
  const intro = () => {
    if (reduced) return;
    const { cam } = pose();
    tl.to(camera.position, { x: cam.x, y: cam.y, z: cam.z, duration: 2.8, ease: "power2.out" }, 0);
    // the wall renders in from the middle outward; each niche's shoes a beat after its frame
    [...niches]
      .sort((a, b) => Math.abs(a.theta) - Math.abs(b.theta))
      .forEach((n, i) => {
        const at = 0.15 + i * 0.07;
        tl.to(n.frame.uDissolve, { value: 1.1, duration: 1.1, ease: "power1.inOut" }, at);
        tl.to(n.shoes.uDissolve, { value: 1.1, duration: 0.9, ease: "power1.inOut" }, at + 0.35);
      });
    // the pillars grow up out of the floor, centre first, then the pairs settle on and the spots come up
    [1, 0, 2].forEach((idx, k) => {
      const p = pillars[idx];
      const at = 0.55 + k * 0.16;
      tl.to(p.grow.scale, { y: 1, duration: 1.15, ease: "back.out(1.15)" }, at);
      tl.to(p.pair.position, { y: p.rest, duration: 0.95, ease: "power3.out" }, at + 0.85);
      tl.to(p.pairMat, { opacity: 1, duration: 0.5, ease: "power1.out" }, at + 0.85);
      tl.to(p.seat.material, { opacity: 1, duration: 0.6 }, at + 1.3);
      tl.to(p.spot, { intensity: 38, duration: 1.2, ease: "power2.out" }, at + 0.9);
    });
    tl.play();
  };

  /* pointer parallax and hover lift */
  const pointer = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  };
  if (!reduced && !mobile) addEventListener("pointermove", onMove, { passive: true });
  let hovered: number | null = null;

  /* loop */
  let active = false;
  let raf = 0;
  let ready = false;
  let introStarted = false;
  // the intro starts once the textures are in and the hero is on screen, whichever comes last
  const maybeIntro = () => {
    if (!ready || !active || introStarted) return;
    introStarted = true;
    intro();
  };
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const settled = !tl.isActive();
    const { cam, look } = pose();
    if (settled && !reduced) {
      // ease toward the resting pose (also after a resize between wide and narrow), plus a touch of pointer parallax
      camera.position.x += (cam.x + pointer.x * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (cam.y - pointer.y * 0.12 - camera.position.y) * 0.04;
      camera.position.z += (cam.z - camera.position.z) * 0.04;
    } else if (settled) camera.position.copy(cam);
    camera.lookAt(look);
    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      p.lift += ((hovered === i ? 0.08 : 0) - p.lift) * 0.12;
      if (settled && (reduced || tl.progress() === 1)) p.pair.position.y = p.rest + p.lift;
    }
    face();
    renderer.render(scene, camera);
  };
  const setActive = (on: boolean) => {
    if (on === active) return;
    active = on;
    if (on) {
      raf = requestAnimationFrame(frame);
      if (introStarted) tl.resume();
      maybeIntro();
    } else {
      cancelAnimationFrame(raf);
      tl.pause();
    }
  };

  manager.onLoad = () => {
    if (ready) return;
    ready = true;
    face();
    renderer.render(scene, camera);
    opts.onReady?.();
    layout();
    maybeIntro();
  };

  /* resize */
  const resize = () => {
    ({ w: W, h: H } = size());
    renderer.setSize(W, H, false);
    mirror.getRenderTarget().setSize(Math.round(W * dpr * 0.5), Math.round(H * dpr * 0.5));
    fit();
    layout();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  return {
    setActive,
    setHover: (i) => {
      hovered = i;
    },
    dispose() {
      setActive(false);
      tl.kill();
      ro.disconnect();
      removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
      mirror.dispose();
      textures.forEach((t) => t.dispose());
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
