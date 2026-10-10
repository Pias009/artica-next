/**
 * The Chime Long 3D showroom, ported from the client's standalone page (Blender layout: x, y, z -> three x, z, -y).
 * Room 6 m wide, 7 m deep, 3.2 m high; three shelf walls and a centre table. Shoes are photo cut-outs on planes.
 *
 * Framework-free on purpose: the homepage section (Showroom.tsx) creates it, feeds it a camera pose from the page
 * scroll ("tour"), or hands over to first-person controls ("free"), and gets told when a shoe is picked.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import type { Pose } from "./tour";
import { SHELF_UNITS, SHOWROOM, SHOWROOM_ASSET_VERSION, type ShowroomShoe, type Wall } from "@/lib/showroom";

const RX = 3.0;
const RD = 7.0;
const RH = 3.2;
const EYE = 1.62;
const IZ = -3.5; // centre table
const H = Math.PI / 2;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export type Mode = "tour" | "free";

export type ShowroomOptions = {
  mobile: boolean;
  reduced: boolean;
  /** CSS font-family for the signage drawn into textures (the site font). */
  font: string;
  /** Floating name tag shown while hovering a shoe (desktop). */
  tip: HTMLElement;
  onProgress?: (loaded: number, total: number) => void;
  onReady?: () => void;
  onPick?: (slug: string) => void;
  /** Called once the visitor drags, walks or scrolls the camera themselves (to fade the hint). */
  onInteract?: () => void;
};

export type ShowroomApi = {
  /** Where the scroll tour wants the camera; it eases there. */
  setTourPose: (p: Pose) => void;
  setMode: (m: Mode) => void;
  /** Free view: glide to a pose (the area chips). */
  flyTo: (p: Pose) => void;
  /** Render only while the section is on screen. */
  setActive: (on: boolean) => void;
  dispose: () => void;
};

type Pair = { d: ShowroomShoe; g: THREE.Group; inner: THREE.Group; baseRy: number; lift: number; hover: boolean; shelf?: string };

export function createShowroom(canvas: HTMLCanvasElement, opts: ShowroomOptions): ShowroomApi {
  const { mobile, reduced, font, tip } = opts;
  RectAreaLightUniformsLib.init();

  /* ---------- renderer / scene ---------- */
  const host = canvas.parentElement!;
  const size = () => ({ w: Math.max(1, host.clientWidth), h: Math.max(1, host.clientHeight) });
  let { w: W, h: Ht } = size();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(W, Ht, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#E9E4DA");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(mobile ? 70 : 62, W / Ht, 0.05, 50);
  camera.rotation.order = "YXZ";

  // Ambient occlusion on desktop only; dropped automatically if the device can't keep up.
  let composer: EffectComposer | null = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, W, Ht);
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.2, thickness: 1.2, scale: 1.0, samples: 12 });
    ao.blendIntensity = 0.85;
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    composer.setSize(W, Ht);
  }

  /* ---------- procedural textures ---------- */
  const textures: THREE.Texture[] = [];
  function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat: [number, number] = [1, 1]) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return t;
  }
  const rnd = ((a) => () => (a = (a * 16807) % 2147483647) / 2147483647)(7);
  function grain(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, lines: number, alpha: number) {
    for (let i = 0; i < lines; i++) {
      const yy = y + rnd() * h;
      const amp = 1 + rnd() * 3;
      g.strokeStyle = `rgba(${base},${alpha * (0.4 + rnd() * 0.6)})`;
      g.lineWidth = 0.6 + rnd() * 1.4;
      g.beginPath();
      g.moveTo(x, yy);
      for (let xx = x; xx <= x + w; xx += 24) g.lineTo(xx, yy + Math.sin(xx * 0.01 + i) * amp);
      g.stroke();
    }
  }
  // oak plank floor: 18 cm planks, random lengths, colour variation, fine gaps
  const floorTex = canvasTex(
    1024,
    1024,
    (g, w, h) => {
      g.fillStyle = "#B79C7C";
      g.fillRect(0, 0, w, h);
      const rows = 8;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * 300;
        while (x < w) {
          const L = 260 + rnd() * 380;
          const tone = rnd();
          const c = [178 + tone * 28, 152 + tone * 22, 122 + tone * 18].map(Math.round);
          g.fillStyle = `rgb(${c})`;
          g.fillRect(x, r * rh, L, rh);
          grain(g, x, r * rh, L, rh, "92,62,36", 14, 0.18);
          g.fillStyle = "rgba(60,40,22,.55)";
          g.fillRect(x, r * rh, 2, rh);
          x += L;
        }
        g.fillStyle = "rgba(60,40,22,.5)";
        g.fillRect(0, r * rh, w, 2);
      }
    },
    [3, 3.5],
  );
  const oakTex = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = "#D6C7B2";
    g.fillRect(0, 0, w, h);
    grain(g, 0, 0, w, h, "120,88,58", 40, 0.16);
  });
  const plasterTex = canvasTex(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = "#E6E0D5";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "160,150,135"},${rnd() * 0.05})`;
        g.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
    },
    [6, 2],
  );
  const shadowTex = canvasTex(256, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(20,16,10,.55)");
    gr.addColorStop(0.45, "rgba(20,16,10,.25)");
    gr.addColorStop(1, "rgba(20,16,10,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
  const cornerTex = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "rgba(40,32,20,.28)");
    gr.addColorStop(1, "rgba(40,32,20,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  cornerTex.wrapS = cornerTex.wrapT = THREE.ClampToEdgeWrapping;

  function textTex(text: string, { w = 2048, h = 160, size = 78, color = "#F3EFE6", weight = 800, spacing = 10 } = {}) {
    return canvasTex(w, h, (g) => {
      g.fillStyle = color;
      g.font = `${weight} ${size}px ${font}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
      g.fillText(text, w / 2, h / 2 + 4);
    });
  }

  /* ---------- materials ---------- */
  const M = {
    floor: new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.18 }),
    wall: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 }),
    ceil: new THREE.MeshStandardMaterial({ color: "#F4F2EE", roughness: 1, emissive: "#CFC9BE", emissiveIntensity: 0.55 }),
    panel: new THREE.MeshStandardMaterial({ color: "#CEC5B4", roughness: 0.9 }),
    oak: new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.48 }),
    olive: new THREE.MeshStandardMaterial({ color: "#474C38", roughness: 0.5 }),
    led: new THREE.MeshBasicMaterial({ color: "#FFF1D8" }),
    glow: new THREE.MeshBasicMaterial({ color: "#FFF6E8" }),
    riser: new THREE.MeshStandardMaterial({ color: "#E7E2D8", roughness: 0.35 }),
    fabric: new THREE.MeshStandardMaterial({ color: "#9DA38A", roughness: 1 }),
    rug: new THREE.MeshStandardMaterial({ color: "#C9BEA8", roughness: 1 }),
    pot: new THREE.MeshStandardMaterial({ color: "#D8D2C6", roughness: 0.7 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#4E6B3A", roughness: 0.7, side: THREE.DoubleSide }),
  };

  function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    scene.add(m);
    return m;
  }
  function plane(w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0, "YXZ");
    scene.add(m);
    return m;
  }
  const label = (t: THREE.Texture) => new THREE.MeshBasicMaterial({ map: t, transparent: true });

  /* ---------- room shell ---------- */
  const floor = box(RX * 2 + 0.4, 0.1, RD + 2.4, M.floor, 0, -0.05, -RD / 2 + 1.0, { cast: false });
  box(RX * 2 + 0.4, 0.1, RD + 0.4, M.ceil, 0, RH + 0.05, -RD / 2, { cast: false });
  box(0.1, RH, RD + 0.4, M.wall, -RX - 0.05, RH / 2, -RD / 2, { cast: false });
  box(0.1, RH, RD + 0.4, M.wall, RX + 0.05, RH / 2, -RD / 2, { cast: false });
  box(RX * 2 + 0.4, RH, 0.1, M.wall, 0, RH / 2, -RD - 0.05, { cast: false });
  box(RX - 0.9, RH, 0.1, M.wall, -(RX + 0.9) / 2, RH / 2, 0.05, { cast: false });
  box(RX - 0.9, RH, 0.1, M.wall, (RX + 0.9) / 2, RH / 2, 0.05, { cast: false });
  box(1.8, RH - 2.4, 0.1, M.wall, 0, 2.4 + (RH - 2.4) / 2, 0.05, { cast: false });
  // skirting + soft shadow where the walls meet the floor
  box(0.02, 0.08, RD, M.olive, -RX + 0.01, 0.04, -RD / 2);
  box(0.02, 0.08, RD, M.olive, RX - 0.01, 0.04, -RD / 2);
  box(RX * 2, 0.08, 0.02, M.olive, 0, 0.04, -RD + 0.01);
  const aoMat = new THREE.MeshBasicMaterial({ map: cornerTex, transparent: true, depthWrite: false });
  plane(RD, 0.5, aoMat, -RX + 0.002, 0.25, -RD / 2, H);
  plane(RD, 0.5, aoMat, RX - 0.002, 0.25, -RD / 2, -H);
  plane(RX * 2, 0.5, aoMat, 0, 0.25, -RD + 0.002, 0);
  // brand on the entrance wall (seen when you turn around)
  plane(2.2, 0.215, label(textTex("CHIME LONG", { color: "#474C38", size: 120, h: 200, spacing: 18 })), -1.95, 1.85, -0.002, Math.PI);
  plane(1.6, 0.094, label(textTex("WHOLESALE SHOWROOM  ·  FW26", { color: "#474C38", size: 56, h: 120, spacing: 12 })), -1.95, 1.6, -0.002, Math.PI);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight("#FFF8F0", "#A39686", 0.38));
  const downlights: THREE.SpotLight[] = [];
  for (const x of [-1.6, 0, 1.6])
    for (const yb of [1.4, 3.5, 5.6]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), M.glow);
      disc.rotation.x = H;
      disc.position.set(x, RH - 0.004, -yb);
      scene.add(disc);
      const s = new THREE.SpotLight("#FFF4E8", 38, 7, THREE.MathUtils.degToRad(48), 0.85, 1.6);
      s.position.set(x, RH - 0.03, -yb);
      s.target.position.set(x * 1.35, 0, -yb);
      scene.add(s, s.target);
      downlights.push(s);
    }
  // only a few lights cast shadows, aimed at the three walls and the table
  for (const [i, tx, tz] of [
    [0, -3, -3.5],
    [6, 3, -3.5],
    [5, 0, -7],
    [4, 0, -3.5],
  ]) {
    const s = downlights[i];
    s.castShadow = true;
    s.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.02;
    s.shadow.radius = 4;
    s.target.position.set(tx, 0.8, tz);
  }
  const ceilingFill = new THREE.RectAreaLight("#FFF3E4", 1.1, 5, 6);
  ceilingFill.position.set(0, RH - 0.05, -3.5);
  ceilingFill.lookAt(0, 0, -3.5);
  scene.add(ceilingFill);

  /* ---------- shelving units ---------- */
  type Frame = { o: THREE.Vector3; al: THREE.Vector3; out: THREE.Vector3; ry: number };
  // origin on the wall surface, along = reading direction, out = into the room, ry = facing
  function frame(wall: Exclude<Wall, "island">, start: number): Frame {
    if (wall === "left") return { o: new THREE.Vector3(-RX, 0, -start), al: new THREE.Vector3(0, 0, -1), out: new THREE.Vector3(1, 0, 0), ry: H };
    if (wall === "right") return { o: new THREE.Vector3(RX, 0, -start), al: new THREE.Vector3(0, 0, 1), out: new THREE.Vector3(-1, 0, 0), ry: -H };
    return { o: new THREE.Vector3(start, 0, -RD), al: new THREE.Vector3(1, 0, 0), out: new THREE.Vector3(0, 0, 1), ry: 0 };
  }
  const P = (f: Frame, a: number, o: number, y: number) => f.o.clone().addScaledVector(f.al, a).addScaledVector(f.out, o).setY(y);
  function fbox(f: Frame, la: number, lo: number, h: number, mat: THREE.Material, a: number, o: number, y: number, o2?: { cast?: boolean; receive?: boolean }) {
    const sx = Math.abs(f.al.x) * la + Math.abs(f.out.x) * lo;
    const sz = Math.abs(f.al.z) * la + Math.abs(f.out.z) * lo;
    const p = P(f, a, o, y);
    return box(sx, h, sz, mat, p.x, p.y, p.z, o2);
  }
  const walls = Object.entries(SHELF_UNITS) as [Exclude<Wall, "island">, (typeof SHELF_UNITS)["left"]][];
  for (const [wall, u] of walls) {
    const f = frame(wall, u.start);
    const L = u.L;
    fbox(f, L, 0.024, 2.4, M.panel, L / 2, 0.012, 1.3, { cast: false });
    fbox(f, L, 0.34, 0.1, M.olive, L / 2, 0.17, 0.05);
    u.levels.forEach((z) => {
      fbox(f, L, 0.32, 0.028, M.oak, L / 2, 0.17, z);
      fbox(f, L - 0.06, 0.012, 0.004, M.led, L / 2, 0.3, z - 0.016, { cast: false, receive: false });
    });
    for (let b = 0; b <= u.bays; b++) fbox(f, 0.03, 0.34, 2.4, M.oak, (b * L) / u.bays, 0.17, 1.3);
    fbox(f, L, 0.06, 0.26, M.olive, L / 2, 0.03, 2.63);
    const tp = P(f, L / 2, 0.0615, 2.63);
    plane(L * 0.9, (L * 0.9 * 160) / 2048, label(textTex(u.title.replace(" · ", "  ·  "), { size: 70, spacing: 14 })), tp.x, tp.y, tp.z, f.ry);
    const mp = P(f, L / 2, 0.025, 2.4);
    plane(1.6, 0.11, label(textTex("MOQ 300 PAIRS  ·  12 PER CASE", { color: "#474C38", size: 44, h: 110, spacing: 10, w: 1600 })), mp.x, mp.y, mp.z, f.ry);
    // warm wash from the shelf LEDs
    const wash = new THREE.RectAreaLight("#FFF5EA", 1.5, L, 1.9);
    wash.position.copy(P(f, L / 2, 0.9, 1.3));
    wash.lookAt(P(f, L / 2, 0, 1.3));
    scene.add(wash);
  }

  /* ---------- centre table, seats, rug, plants ---------- */
  box(1.5, 0.7, 0.62, M.olive, 0, 0.35, IZ);
  box(1.8, 0.05, 0.82, M.oak, 0, 0.725, IZ);
  for (const x of [-0.45, 0.45]) box(0.62, 0.06, 0.38, M.riser, x, 0.78, IZ + 0.05);
  plane(0.5, 0.1, label(textTex("MEN", { size: 110, h: 220, w: 1100, spacing: 26 })), 0, 0.45, IZ + 0.312, 0);
  plane(0.7, 0.07, label(textTex("US 7–13  ·  MOQ 300", { size: 60, h: 120, w: 1200, spacing: 10 })), 0, 0.34, IZ + 0.312, 0);
  const tableSpot = new THREE.SpotLight("#FFEBD6", 70, 6, THREE.MathUtils.degToRad(24), 0.6, 1.4);
  tableSpot.position.set(0, RH - 0.05, IZ + 0.6);
  tableSpot.target.position.set(0, 0.8, IZ);
  scene.add(tableSpot, tableSpot.target);
  for (const [x, yb] of [
    [-1.25, 2.1],
    [1.25, 2.1],
    [-1.25, 5.1],
    [1.25, 5.1],
  ]) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 48), M.fabric);
    o.position.set(x, 0.21, -yb);
    o.castShadow = o.receiveShadow = true;
    scene.add(o);
  }
  const rug = box(3.2, 0.012, 4.6, M.rug, 0, 0.006, -3.6, { cast: false });
  for (const [x, z] of [
    [-2.62, -6.62],
    [2.62, -6.62],
  ]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.5, 40), M.pot);
    pot.position.set(x, 0.25, z);
    pot.castShadow = true;
    scene.add(pot);
    const leafGeo = new THREE.SphereGeometry(0.16, 10, 8);
    leafGeo.scale(1, 0.35, 0.5);
    for (let i = 0; i < 26; i++) {
      const l = new THREE.Mesh(leafGeo, M.leaf);
      const a = rnd() * Math.PI * 2;
      const r = 0.05 + rnd() * 0.22;
      l.position.set(x + Math.cos(a) * r, 0.55 + rnd() * 0.75, z + Math.sin(a) * r);
      l.rotation.set(rnd() * 1.2 - 0.6, a, rnd() * 0.8 - 0.4);
      l.castShadow = true;
      scene.add(l);
    }
  }

  /* ---------- shoes ---------- */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) => opts.onProgress?.(loaded, total);
  manager.onLoad = () => opts.onReady?.();
  const loader = new THREE.TextureLoader(manager);
  const BASE_W = { men: 0.3, women: 0.26, kids: 0.21 };
  const pickables: THREE.Object3D[] = [];
  const pairs: Pair[] = [];
  const bySlug: Record<string, Pair> = {};
  const texCache: Record<string, THREE.Texture> = {};
  // phones get the 320 px set (scripts/showroom-phone-photos.mjs): same look on a small screen, a third of the download
  const photoDir = mobile ? "shoes-sm" : "shoes";
  function tex(img: string) {
    if (!texCache[img]) {
      const t = loader.load(`/showroom/${photoDir}/${img}.webp?v=${SHOWROOM_ASSET_VERSION}`);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = mobile ? 4 : 8;
      texCache[img] = t;
      textures.push(t);
    }
    return texCache[img];
  }
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  function shoeMesh(img: string, w: number, h: number, mirror: boolean) {
    const g = new THREE.PlaneGeometry(w, h);
    g.translate(0, h / 2, 0);
    // the photo already carries studio light, so show it as photographed (true product colour)
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex(img), alphaTest: 0.45, side: THREE.DoubleSide, color: "#F4F1EA" }));
    mesh.castShadow = true;
    if (mirror) mesh.scale.x = -1;
    // a darker twin 6 mm behind gives the photo a sense of thickness from an angle
    const back = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex(img), alphaTest: 0.45, color: "#2a2722", side: THREE.DoubleSide }));
    back.position.z = -0.006;
    mesh.add(back);
    return mesh;
  }

  function placePair(d: ShowroomShoe, pos: THREE.Vector3, ry: number, sScale = 1) {
    let w = BASE_W[d.line] * sScale;
    let h = (w * d.size[1]) / d.size[0];
    const cap = d.category === "Tall boots" ? 0.4 : 0.34;
    if (h > cap) {
      w *= cap / h;
      h = cap;
    }
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = ry;
    scene.add(g);
    const a = shoeMesh(d.img, w, h, false);
    a.position.set(-w * 0.18, 0, 0.03);
    a.rotation.y = THREE.MathUtils.degToRad(-8);
    let b: THREE.Mesh;
    if (d.img2 && d.size2) {
      let w2 = w;
      let h2 = (w2 * d.size2[1]) / d.size2[0];
      if (h2 > cap) {
        w2 *= cap / h2;
        h2 = cap;
      }
      b = shoeMesh(d.img2, w2, h2, false);
    } else b = shoeMesh(d.img, w, h, true);
    b.position.set(w * 0.3, 0, -0.05);
    b.rotation.y = THREE.MathUtils.degToRad(9);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, 0.24), shadowMat);
    s.rotation.x = -H;
    s.position.set(w * 0.05, 0.0015, -0.01);
    const inner = new THREE.Group();
    inner.add(a, b, s);
    g.add(inner);
    a.userData.slug = b.userData.slug = d.slug;
    pickables.push(a, b);
    const rec: Pair = { d, g, inner, baseRy: ry, lift: 0, hover: false };
    pairs.push(rec);
    bySlug[d.slug] = rec;
    return rec;
  }
  function labelAt(d: ShowroomShoe, f: Frame, a: number, y: number) {
    const p = P(f, a, 0.3315, y);
    plane(0.3, 0.0367, label(textTex(d.name.toUpperCase(), { color: "#2B2D24", size: 64, h: 110, w: 900, spacing: 8 })), p.x, p.y, p.z, f.ry);
  }

  // same placement rules as the Blender scene: middle shelves fill first, tall boots on the top shelf
  for (const [wall, u] of walls) {
    const items = SHOWROOM.filter((d) => d.wall === wall);
    const tall = items.filter((d) => d.category === "Tall boots");
    const rest = items.filter((d) => d.category !== "Tall boots");
    const lv = u.levels;
    const n = lv.length;
    let counts = lv.map((_, i) => Math.floor(rest.length / n) + (i < rest.length % n ? 1 : 0));
    if (tall.length) counts = [...Array(n - 1)].map((_, i) => Math.floor(rest.length / (n - 1)) + (i < rest.length % (n - 1) ? 1 : 0)).concat([0]);
    const seq = rest.slice();
    const per: Record<number, ShowroomShoe[]> = {};
    [...lv.keys()].sort((i, j) => Math.abs(lv[i] - 1.3) - Math.abs(lv[j] - 1.3)).forEach((li) => (per[li] = seq.splice(0, Math.min(counts[li], seq.length))));
    if (tall.length) per[n - 1] = tall.concat(per[n - 1] || []);
    const f = frame(wall, u.start);
    const bw = u.L / u.bays;
    for (const [lis, its] of Object.entries(per)) {
      if (!its.length) continue;
      const li = Number(lis);
      const y = lv[li] + 0.0145;
      const bc = Array(u.bays).fill(0);
      its.forEach((_, i) => bc[Math.floor((i * u.bays) / its.length)]++);
      let k = 0;
      bc.forEach((c, bi) => {
        for (let j = 0; j < c; j++) {
          const a = bi * bw + ((j + 0.5) * bw) / c;
          const d = its[k++];
          placePair(d, P(f, a, 0.15, y), f.ry).shelf = `${wall}:${li}`;
          labelAt(d, f, a, lv[li]);
        }
      });
    }
  }
  SHOWROOM.filter((d) => d.wall === "island").forEach((d, i) => placePair(d, new THREE.Vector3(i ? 0.45 : -0.45, 0.8105, IZ + 0.02), 0, 1.05));

  /* ---------- camera: tour pose or first-person ---------- */
  let mode: Mode = "tour";
  const cam: Pose = { x: 0, z: 1.3, yaw: 0, pitch: -0.05 }; // what is rendered
  const tourTarget: Pose = { ...cam };
  const look = { yaw: 0, pitch: 0 }; // drag offset on top of the tour
  let lastDrag = 0;
  let tween: { from: Pose; to: Pose; t: number; dur: number } | null = null;
  const keys: Record<string, boolean> = {};
  const bounds = { x0: -RX + 0.65, x1: RX - 0.65, z0: -RD + 0.75, z1: -0.25 };
  const tableBox = { x0: -1.15, x1: 1.15, z0: IZ - 0.68, z1: IZ + 0.68 };
  function clampPos(p: { x: number; z: number }) {
    p.x = THREE.MathUtils.clamp(p.x, bounds.x0, bounds.x1);
    p.z = THREE.MathUtils.clamp(p.z, bounds.z0, bounds.z1);
    if (p.x > tableBox.x0 && p.x < tableBox.x1 && p.z > tableBox.z0 && p.z < tableBox.z1) {
      const dx = Math.min(p.x - tableBox.x0, tableBox.x1 - p.x);
      const dz = Math.min(p.z - tableBox.z0, tableBox.z1 - p.z);
      if (dx < dz) p.x = p.x - tableBox.x0 < tableBox.x1 - p.x ? tableBox.x0 : tableBox.x1;
      else p.z = p.z - tableBox.z0 < tableBox.z1 - p.z ? tableBox.z0 : tableBox.z1;
    }
    return p;
  }
  function glide(to: Pose, dur: number) {
    tween = { from: { ...cam }, to: { ...to, yaw: cam.yaw + wrap(to.yaw - cam.yaw) }, t: 0, dur: reduced ? 0.01 : dur };
  }

  /* ---------- pointer: drag = look, tap = open a shoe (or walk, in free view) ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: { x: number; y: number; id: number; moved: boolean; yaw: number; pitch: number } | null = null;
  let hovered: Pair | null = null;
  const interacted = () => opts.onInteract?.();

  function pick(clientX: number, clientY: number, objs: THREE.Object3D[]) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(objs, false)[0];
  }
  function setHover(rec: Pair | null) {
    if (hovered === rec) return;
    if (hovered) hovered.hover = false;
    hovered = rec;
    if (rec) rec.hover = true;
    canvas.style.cursor = rec ? "pointer" : mode === "free" ? "grab" : "";
    tip.dataset.on = rec ? "true" : "false";
  }
  function hoverAt(x: number, y: number) {
    const h = pick(x, y, pickables);
    setHover(h ? bySlug[h.object.userData.slug] : null);
    if (hovered) {
      const r = canvas.getBoundingClientRect();
      tip.textContent = "";
      const b = document.createElement("b");
      b.textContent = hovered.d.name;
      const em = document.createElement("em");
      em.textContent = `${hovered.d.type} · view details`;
      tip.append(b, em);
      tip.style.left = `${x - r.left}px`;
      tip.style.top = `${y - r.top}px`;
    }
  }
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, yaw: mode === "free" ? cam.yaw : look.yaw, pitch: mode === "free" ? cam.pitch : look.pitch };
  };
  const onMove = (e: PointerEvent) => {
    if (!down || down.id !== e.pointerId) {
      if (e.pointerType === "mouse") hoverAt(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 6) {
      down.moved = true;
      canvas.setPointerCapture(e.pointerId);
      if (mode === "free") canvas.style.cursor = "grabbing";
      tween = null;
      interacted();
    }
    if (!down.moved) return;
    const k = e.pointerType === "mouse" ? 0.0035 : 0.0055;
    if (mode === "free") {
      cam.yaw = down.yaw + dx * k;
      cam.pitch = THREE.MathUtils.clamp(down.pitch + dy * k, -1.0, 0.6);
    } else {
      // in the tour, a drag looks around a little; the page keeps scrolling vertically on touch
      look.yaw = THREE.MathUtils.clamp(down.yaw + dx * k, -1.1, 1.1);
      look.pitch = THREE.MathUtils.clamp(down.pitch + dy * k * (e.pointerType === "mouse" ? 1 : 0), -0.5, 0.4);
      lastDrag = performance.now();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!down || down.id !== e.pointerId) return;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (mode === "free") canvas.style.cursor = hovered ? "pointer" : "grab";
    if (!down.moved) {
      const s = pick(e.clientX, e.clientY, pickables);
      if (s) opts.onPick?.(s.object.userData.slug);
      else if (mode === "free") {
        const f = pick(e.clientX, e.clientY, [floor, rug]);
        if (f) {
          const q = clampPos({ x: f.point.x, z: f.point.z });
          const dist = Math.hypot(q.x - cam.x, q.z - cam.z);
          glide({ x: q.x, z: q.z, yaw: cam.yaw, pitch: cam.pitch }, Math.min(2.2, 0.5 + dist * 0.45));
          interacted();
        }
      }
    }
    down = null;
  };
  const onCancel = () => {
    down = null;
  };
  const onLeave = () => setHover(null);
  const onWheel = (e: WheelEvent) => {
    if (mode !== "free") return;
    e.preventDefault();
    cam.x += -Math.sin(cam.yaw) * -e.deltaY * 0.0025;
    cam.z += -Math.cos(cam.yaw) * -e.deltaY * 0.0025;
    clampPos(cam);
    tween = null;
    interacted();
  };
  const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const onKey = (e: KeyboardEvent) => {
    if (mode !== "free" || typing(e.target) || document.querySelector("dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (!["w", "a", "s", "d", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) return;
    keys[k] = e.type === "keydown";
    if (k.startsWith("arrow")) e.preventDefault();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKey);

  /* ---------- resize ---------- */
  const resize = () => {
    ({ w: W, h: Ht } = size());
    camera.aspect = W / Ht;
    camera.updateProjectionMatrix();
    renderer.setSize(W, Ht, false);
    composer?.setSize(W, Ht);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const perf = { n: 0, t: 0 };
  let active = false;
  let raf = 0;
  let bob = 0;

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    let moving = false;

    if (tween) {
      const tw = tween;
      tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      cam.x = THREE.MathUtils.lerp(tw.from.x, tw.to.x, k);
      cam.z = THREE.MathUtils.lerp(tw.from.z, tw.to.z, k);
      cam.yaw = THREE.MathUtils.lerp(tw.from.yaw, tw.to.yaw, k);
      cam.pitch = THREE.MathUtils.lerp(tw.from.pitch, tw.to.pitch, k);
      if (tw.t >= 1) tween = null;
      moving = true;
    } else if (mode === "tour") {
      // ease toward the scroll position; a drag offset drifts back after a moment
      const e = reduced ? 1 : 1 - Math.exp(-dt * 7);
      const dist = Math.hypot(tourTarget.x - cam.x, tourTarget.z - cam.z);
      cam.x += (tourTarget.x - cam.x) * e;
      cam.z += (tourTarget.z - cam.z) * e;
      cam.yaw += wrap(tourTarget.yaw - cam.yaw) * e;
      cam.pitch += (tourTarget.pitch - cam.pitch) * e;
      moving = dist > 0.01;
      if (!down?.moved && performance.now() - lastDrag > 1600) {
        const r = 1 - Math.exp(-dt * 2.5);
        look.yaw -= look.yaw * r;
        look.pitch -= look.pitch * r;
      }
    }

    if (mode === "free") {
      const sp = (keys.shift ? 3.2 : 1.7) * dt;
      const fw = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
      const st = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      if (keys.arrowleft) cam.yaw += 1.6 * dt;
      if (keys.arrowright) cam.yaw -= 1.6 * dt;
      if (fw || st) {
        tween = null;
        cam.x += (-Math.sin(cam.yaw) * fw + Math.cos(cam.yaw) * st) * sp;
        cam.z += (-Math.cos(cam.yaw) * fw - Math.sin(cam.yaw) * st) * sp;
        clampPos(cam);
        moving = true;
        interacted();
      }
    }

    // gentle head bob while walking makes it feel physical
    bob += moving && !reduced ? dt * 9 : 0;
    const yaw = cam.yaw + (mode === "tour" ? look.yaw : 0);
    const pitch = THREE.MathUtils.clamp(cam.pitch + (mode === "tour" ? look.pitch : 0), -1.0, 0.6);
    camera.position.set(cam.x, EYE + (moving && !reduced ? Math.sin(bob) * 0.01 : 0), cam.z);
    camera.rotation.set(pitch, yaw, 0);

    // shoes turn a little toward you (max 22°) and lift when hovered
    for (const r of pairs) {
      tmp.subVectors(camera.position, r.g.position);
      let dlt = wrap(Math.atan2(tmp.x, tmp.z) - r.baseRy);
      dlt = THREE.MathUtils.clamp(dlt, -0.38, 0.38) * 0.6;
      r.inner.rotation.y += (dlt - r.inner.rotation.y) * Math.min(1, dt * 4);
      r.lift += ((r.hover ? 0.025 : 0) - r.lift) * Math.min(1, dt * 10);
      r.inner.position.y = r.lift;
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
    // drop ambient occlusion on slow devices so the tour stays smooth
    if (composer && perf.n < 90) {
      perf.n++;
      perf.t += dt;
      if (perf.n === 90 && perf.t / perf.n > 1 / 32) {
        composer.dispose();
        composer = null;
      }
    }
  }

  function setActive(on: boolean) {
    if (on === active) return;
    active = on;
    if (on) {
      clock.getDelta(); // don't jump after a pause
      raf = requestAnimationFrame(tick);
    } else cancelAnimationFrame(raf);
  }

  return {
    setTourPose(p) {
      Object.assign(tourTarget, p);
    },
    setMode(m) {
      if (m === mode) return;
      mode = m;
      tween = null;
      for (const k of Object.keys(keys)) keys[k] = false;
      if (m === "free") {
        // keep looking where the tour was looking
        cam.yaw += look.yaw;
        cam.pitch = THREE.MathUtils.clamp(cam.pitch + look.pitch, -1, 0.6);
        look.yaw = look.pitch = 0;
        clampPos(cam);
        canvas.style.cursor = "grab";
      } else canvas.style.cursor = "";
    },
    flyTo(p) {
      glide(p, 1.4);
    },
    setActive,
    dispose() {
      setActive(false);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("keyup", onKey);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
      textures.forEach((t) => t.dispose());
      envTex.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
