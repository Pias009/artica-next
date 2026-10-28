/*
 * The Shipping page's freight scenes in WebGL (three.js): a laden container ship under way on open water, a freighter
 * taking off, a container truck on the highway. Everything is built in code (no model files): physically based
 * materials under a real sky, sun shadows, reflective water for the ship.
 *
 * Loaded on its own by FreightCanvas once the page is up. One renderer serves all three scenes; only the shown one is
 * built and drawn. It draws only while on screen and the tab is visible, and draws one still frame for reduced motion.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";

export type FreightMode = "sea" | "air" | "road";
export type Freight = { set: (mode: FreightMode) => void; destroy: () => void };

/** One run of the route underneath (DeliveryRoute's loop plus its pause), so the take-off keeps time with it. */
const CYCLE = 7.8;
const BRAND = "#8e3f82";
const CONTAINER_COLOURS = [BRAND, "#2d5d6f", "#b5533f", "#c9a983", "#e7ebed", "#5b6770", "#3f6b4e", BRAND, "#2d5d6f"];

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------- textures, drawn once ---------- */

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Corrugated steel: ribs, top and bottom rails, corner castings. White, so instance colours tint it. */
function containerTexture() {
  return canvasTexture(512, 128, (g) => {
    g.fillStyle = "#f4f4f4";
    g.fillRect(0, 0, 512, 128);
    for (let x = 0; x < 512; x += 10) {
      const grad = g.createLinearGradient(x, 0, x + 10, 0);
      grad.addColorStop(0, "#d9d9d9");
      grad.addColorStop(0.5, "#ffffff");
      grad.addColorStop(1, "#cfcfcf");
      g.fillStyle = grad;
      g.fillRect(x, 8, 10, 112);
    }
    g.fillStyle = "#a9a9a9";
    g.fillRect(0, 0, 512, 8);
    g.fillRect(0, 120, 512, 8);
    g.fillStyle = "#8d8d8d";
    for (const x of [0, 500]) for (const y of [0, 116]) g.fillRect(x, y, 12, 12);
  });
}

function noiseTexture(size: number, base: [number, number, number], spread: number, seed: number) {
  const r = rng(seed);
  return canvasTexture(size, size, (g) => {
    const img = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const n = (r() - 0.5) * spread;
      img.data[i * 4] = base[0] + n;
      img.data[i * 4 + 1] = base[1] + n;
      img.data[i * 4 + 2] = base[2] + n * 0.9;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}

/** Asphalt with markings, one tile along the length (u) and the full width (v). */
function laneTexture(kind: "runway" | "road") {
  const W = 512;
  const H = 256;
  const r = rng(kind === "road" ? 11 : 23);
  return canvasTexture(W, H, (g) => {
    const img = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const n = 52 + (r() - 0.5) * 26;
      img.data[i * 4] = n;
      img.data[i * 4 + 1] = n + 2;
      img.data[i * 4 + 2] = n + 5;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = "rgba(240,240,236,.92)";
    g.fillRect(0, 10, W, 7); // edge lines
    g.fillRect(0, H - 17, W, 7);
    if (kind === "road") {
      g.fillRect(0, H / 2 - 4, W * 0.5, 8); // centre dashes
    } else {
      g.fillRect(0, H / 2 - 3, W * 0.42, 6);
      g.fillStyle = "rgba(230,190,60,.6)";
      g.fillRect(W * 0.6, H / 2 + 14, W * 0.4, 3); // a faded taxi line
    }
  });
}

/** A tiling normal map for the sea: a sum of waves on whole-number frequencies, so it repeats seamlessly. */
function waterNormals(size = 256) {
  const r = rng(7);
  const waves = Array.from({ length: 14 }, (_, i) => ({
    kx: Math.round((r() * 2 - 1) * (4 + i)),
    ky: Math.round((r() * 2 - 1) * (4 + i)) || 1,
    a: 1 / (1 + i * 0.55),
    p: r() * Math.PI * 2,
  }));
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dy = 0;
      for (const w of waves) {
        const c = Math.cos(((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.p) * w.a;
        dx += c * w.kx;
        dy += c * w.ky;
      }
      const n = new THREE.Vector3(-dx * 0.09, -dy * 0.09, 1).normalize();
      const i = (y * size + x) * 4;
      data[i] = (n.x * 0.5 + 0.5) * 255;
      data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Soft white foam: a radial falloff for the wake and the bow wave. */
function foamTexture() {
  return canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,.95)");
    grad.addColorStop(0.5, "rgba(255,255,255,.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
}

/* ---------- materials ---------- */

const paint = (color: string, rough = 0.5, metal = 0.1) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const glass = () => new THREE.MeshPhysicalMaterial({ color: "#1d2a33", roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
const chrome = () => new THREE.MeshStandardMaterial({ color: "#d9dde0", roughness: 0.18, metalness: 1 });
const rubber = () => new THREE.MeshStandardMaterial({ color: "#16181a", roughness: 0.92, metalness: 0 });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ---------- a scene: what it adds, where the camera sits, how it moves ---------- */

type Stage = {
  root: THREE.Group;
  /** Where the sun's shadow box centres, and how big it is. */
  focus: THREE.Vector3;
  shadowSize: number;
  fog: THREE.Fog | null;
  update: (t: number, dt: number, camera: THREE.PerspectiveCamera, aspect: number) => void;
  dispose: () => void;
};

/* ----- sea: a laden container ship under way ----- */

function seaStage(sun: THREE.Vector3): Stage {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  const normals = track(waterNormals());
  const water = new Water(track(new THREE.PlaneGeometry(6000, 6000)), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normals,
    sunDirection: sun.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: 0x0f3b4f,
    distortionScale: 2.6,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 2.2;
  track(water.material);
  root.add(water);

  // the ship: 60 units long (about 300 m), heading +x
  const ship = new THREE.Group();
  root.add(ship);
  const L = 60;
  const B = 9;
  const half = (x: number) => (x < 16 ? B / 2 : (B / 2) * Math.max(0, 1 - ((x - 16) / (L / 2 - 16 + 2.5)) ** 1.6));
  const plan = new THREE.Shape();
  plan.moveTo(-L / 2, -B / 2 + 0.8);
  plan.quadraticCurveTo(-L / 2, -B / 2, -L / 2 + 0.8, -B / 2);
  plan.lineTo(16, -B / 2);
  plan.bezierCurveTo(24, -B / 2, 29, -1.6, L / 2 + 2.5, 0);
  plan.bezierCurveTo(29, 1.6, 24, B / 2, 16, B / 2);
  plan.lineTo(-L / 2 + 0.8, B / 2);
  plan.quadraticCurveTo(-L / 2, B / 2, -L / 2, B / 2 - 0.8);
  plan.closePath();
  const hullPart = (depth: number, y: number, side: THREE.Material, top: THREE.Material) => {
    const g = track(new THREE.ExtrudeGeometry(plan, { depth, bevelEnabled: false, curveSegments: 18 }));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, [top, side]);
    m.position.y = y;
    m.castShadow = m.receiveShadow = true;
    ship.add(m);
  };
  const deck = track(paint("#4a5258", 0.8));
  hullPart(2.2, -2.2, track(paint("#7d2a32", 0.7)), deck); // antifouling below the line
  hullPart(0.18, 0, track(paint("#e9ecee", 0.6)), deck); // boot-top
  hullPart(3.2, 0.18, track(paint("#1f2b35", 0.45, 0.25)), deck); // topsides

  // containers: bays of 40ft boxes, stacked to an uneven skyline, narrowing towards the bow
  const box = track(new THREE.BoxGeometry(2.44, 0.52, 0.49));
  const steel = track(new THREE.MeshStandardMaterial({ map: track(containerTexture()), roughness: 0.62, metalness: 0.35 }));
  const r = rng(5);
  const slots: THREE.Vector3[] = [];
  for (let bay = 0; bay < 18; bay++) {
    const x = -20 + bay * 2.56;
    const w = half(x + 1.3) - 0.35;
    const rows = Math.floor((w * 2) / 0.51);
    const tiers = bay > 15 ? 3 : Math.round(4 + r() * 3 - (bay % 5 === 0 ? 1 : 0));
    for (let row = 0; row < rows; row++)
      for (let t = 0; t < tiers - (row === 0 || row === rows - 1 ? Math.round(r()) : 0); t++)
        slots.push(new THREE.Vector3(x, 3.38 + 0.26 + t * 0.53, -((rows - 1) * 0.51) / 2 + row * 0.51));
  }
  const boxes = new THREE.InstancedMesh(box, steel, slots.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  slots.forEach((p, i) => {
    boxes.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    boxes.setColorAt(i, col.set(CONTAINER_COLOURS[Math.floor(r() * CONTAINER_COLOURS.length)]).multiplyScalar(0.85 + r() * 0.2));
  });
  boxes.castShadow = boxes.receiveShadow = true;
  ship.add(boxes);

  // accommodation block and bridge, aft
  const white = track(paint("#f1f3f4", 0.55));
  const dark = track(glass());
  ship.add(mesh(track(new THREE.BoxGeometry(4.6, 9, 8)), white, -25, 3.38 + 4.5, 0));
  ship.add(mesh(track(new THREE.BoxGeometry(3.2, 0.9, 11.4)), white, -24.4, 3.38 + 8.6, 0)); // bridge wings
  for (let f = 0; f < 5; f++) ship.add(mesh(track(new THREE.BoxGeometry(4.66, 0.32, 7.4)), dark, -25, 3.38 + 2 + f * 1.45, 0));
  ship.add(mesh(track(new THREE.BoxGeometry(3.26, 0.45, 11.46)), dark, -24.4, 3.38 + 8.75, 0));
  ship.add(mesh(track(new THREE.BoxGeometry(2.4, 3.6, 2.6)), track(paint(BRAND, 0.45, 0.2)), -28, 3.38 + 7, 0)); // funnel
  ship.add(mesh(track(new THREE.BoxGeometry(2.44, 0.5, 2.64)), track(paint("#1a1c1e", 0.7)), -28, 3.38 + 9, 0));
  ship.add(mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 4)), white, -24.4, 3.38 + 11, 0)); // mast
  ship.add(mesh(track(new THREE.BoxGeometry(0.2, 0.2, 2.2)), white, -24.4, 3.38 + 12.2, 0));
  ship.add(mesh(track(new THREE.BoxGeometry(3, 1.1, B - 1)), white, 27, 3.38 + 0.55, 0)); // forecastle

  // wake and bow wave
  const foam = track(new THREE.MeshBasicMaterial({ map: track(foamTexture()), transparent: true, depthWrite: false, opacity: 0.85 }));
  const wake = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), foam);
  wake.rotation.x = -Math.PI / 2;
  wake.scale.set(70, 10, 1);
  wake.position.set(-62, 0.06, 0);
  ship.add(wake);
  for (const side of [-1, 1]) {
    const bow = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), foam);
    bow.rotation.set(-Math.PI / 2, 0, side * 0.5);
    bow.scale.set(16, 3.4, 1);
    bow.position.set(24, 0.07, side * 3.2);
    ship.add(bow);
  }

  // a far headland so the horizon has something on it
  const land = mesh(track(new THREE.IcosahedronGeometry(1, 3)), track(paint("#7d8f86", 0.95)), 520, -30, -900);
  land.scale.set(420, 70, 120);
  root.add(land);

  const speed = 7;
  const target = new THREE.Vector3();
  return {
    root,
    focus: ship.position,
    shadowSize: 46,
    fog: null,
    update(t, dt, camera, aspect) {
      water.material.uniforms.time.value += dt * 0.55;
      ship.position.x = (t * speed) % 2400;
      ship.position.y = Math.sin(t * 0.9) * 0.18;
      ship.rotation.x = Math.sin(t * 0.7) * 0.012;
      ship.rotation.z = Math.sin(t * 0.55 + 1) * 0.008;
      const far = aspect < 1.6 ? 1.45 : 1;
      target.set(ship.position.x + 2, 6, 0);
      camera.position.set(target.x + (36 + Math.sin(t * 0.12) * 6) * far, 11 * far, 54 * far);
      camera.lookAt(target);
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ----- air: a freighter takes off ----- */

function airStage(): Stage {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  const grassTex = track(noiseTexture(256, [118, 132, 92], 30, 3));
  grassTex.repeat.set(220, 220);
  const ground = mesh(track(new THREE.PlaneGeometry(4000, 4000)), track(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })), 0, -0.02, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  root.add(ground);

  const runTex = track(laneTexture("runway"));
  runTex.repeat.set(1600 / 16, 1);
  const runway = mesh(track(new THREE.PlaneGeometry(1600, 9)), track(new THREE.MeshStandardMaterial({ map: runTex, roughness: 0.9 })), 400, 0, 0);
  runway.rotation.x = -Math.PI / 2;
  runway.castShadow = false;
  root.add(runway);

  // edge lights, a control tower and hangars in the distance
  const lightGeo = track(new THREE.SphereGeometry(0.05, 8, 6));
  const lights = new THREE.InstancedMesh(lightGeo, track(new THREE.MeshBasicMaterial({ color: "#fff4d6" })), 400);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 200; i++) {
    lights.setMatrixAt(i * 2, m4.makeTranslation(-400 + i * 8, 0.1, 4.9));
    lights.setMatrixAt(i * 2 + 1, m4.makeTranslation(-400 + i * 8, 0.1, -4.9));
  }
  root.add(lights);
  const concrete = track(paint("#d4d6d3", 0.85));
  root.add(mesh(track(new THREE.CylinderGeometry(1.4, 1.8, 16, 20)), concrete, 30, 8, -60));
  root.add(mesh(track(new THREE.CylinderGeometry(3, 2.4, 2.6, 8)), track(glass()), 30, 17, -60));
  for (let i = 0; i < 4; i++) root.add(mesh(track(new THREE.BoxGeometry(22, 9, 18)), track(paint(i % 2 ? "#c9ced1" : "#e2e5e6", 0.7, 0.3)), -40 + i * 26, 4.5, -95));

  // the aircraft: about 13 units long (a 64 m freighter), nose to +x
  const plane = new THREE.Group();
  root.add(plane);
  const body = new THREE.Group();
  plane.add(body);
  const skin = track(new THREE.MeshPhysicalMaterial({ color: "#f5f6f7", roughness: 0.32, metalness: 0.15, clearcoat: 0.6 }));
  const grey = track(paint("#b9c0c5", 0.4, 0.5));
  const tailPaint = track(paint(BRAND, 0.35, 0.15));

  const R = 0.66;
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) profile.push(new THREE.Vector2(R * Math.sin(((i / 12) * Math.PI) / 2), -6.4 + 1.6 * (1 - Math.cos(((i / 12) * Math.PI) / 2))));
  profile.push(new THREE.Vector2(R, 3.2));
  for (let i = 1; i <= 10; i++) profile.push(new THREE.Vector2(R * (1 - (i / 10) ** 1.4 * 0.82), 3.2 + i * 0.34));
  const fuselageGeo = track(new THREE.LatheGeometry(profile, 32));
  fuselageGeo.rotateZ(Math.PI / 2); // lathe axis to x; nose ends up at +x
  body.add(mesh(fuselageGeo, skin, 0, 1.75, 0));
  // cockpit windows
  const windows = mesh(track(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, 0.6)), track(glass()), 5.15, 2.05, 0);
  windows.scale.set(0.9, 0.55, 0.95);
  windows.rotation.z = -1.15;
  body.add(windows);

  /**
   * A swept, tapered surface (wing, tailplane, fin). Drawn flat (span along x, chord back along -y, thickness z),
   * then turned so the span runs along `spanAxis`, the chord runs aft (-x) and the thickness along the third axis.
   */
  const swept = (root: number, tip: number, span: number, sweep: number, thick: number, mat: THREE.Material, spanAxis: THREE.Vector3) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(span, -sweep);
    s.lineTo(span, -sweep - tip);
    s.lineTo(0, -root);
    s.closePath();
    const g = track(new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.4, bevelSize: thick * 0.5, bevelSegments: 2 }));
    const chord = new THREE.Vector3(1, 0, 0);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(spanAxis, chord, new THREE.Vector3().crossVectors(spanAxis, chord)));
    return mesh(g, mat);
  };
  for (const side of [-1, 1]) {
    // wing: root chord along x, span along z, a little dihedral
    const wing = swept(2.7, 0.7, 6.6, 3.3, 0.1, grey, new THREE.Vector3(0, 0, side));
    wing.position.set(1.6, 1.3, side * 0.45);
    wing.rotation.x = -side * 0.07; // dihedral: tips up
    body.add(wing);
    // engine under each wing
    const nacelle = mesh(track(new THREE.CylinderGeometry(0.42, 0.36, 1.7, 24)), skin, 0.9, 0.75, side * 2.3);
    nacelle.rotation.z = Math.PI / 2;
    body.add(nacelle);
    const intake = mesh(track(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 24)), track(paint("#2a2e31", 0.5, 0.6)), 1.76, 0.75, side * 2.3);
    intake.rotation.z = Math.PI / 2;
    body.add(intake);
    // tailplane
    const stab = swept(1.3, 0.5, 2.6, 1.2, 0.06, grey, new THREE.Vector3(0, 0, side));
    stab.position.set(-5.2, 2.1, side * 0.2);
    body.add(stab);
  }
  // fin
  const fin = swept(2.2, 0.9, 2.9, 1.9, 0.07, tailPaint, new THREE.Vector3(0, 1, 0));
  fin.position.set(-4.6, 2.2, 0.035);
  body.add(fin);
  // landing gear
  const gear = new THREE.Group();
  body.add(gear);
  const tyre = track(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16));
  const strut = track(new THREE.CylinderGeometry(0.05, 0.05, 0.9));
  for (const [x, z] of [
    [4.3, 0],
    [0.2, 0.9],
    [0.2, -0.9],
  ] as const) {
    gear.add(mesh(strut, grey, x, 0.75, z));
    const w = mesh(tyre, track(rubber()), x, 0.22, z);
    w.rotation.x = Math.PI / 2;
    gear.add(w);
  }

  const target = new THREE.Vector3();
  const look = new THREE.Vector3();
  return {
    root,
    focus: plane.position,
    shadowSize: 22,
    fog: new THREE.Fog("#dfe8ee", 120, 900),
    update(t, dt, camera, aspect) {
      // roll, rotate, climb, gear up: once per cycle, in step with the route underneath
      const c = t % CYCLE;
      const roll = Math.min(c, 2.6);
      const x = -40 + 7 * roll * roll;
      const air = Math.max(0, c - 2.6);
      plane.position.set(x + 42 * air + 2.5 * air * air, 0.1 * air * air * 9 + 1.6 * air, 0);
      plane.rotation.z = Math.min(0.16, air * 0.22);
      gear.scale.y = c > 3.8 ? Math.max(0.01, 1 - (c - 3.8) * 1.4) : 1;
      gear.visible = gear.scale.y > 0.02;
      const far = aspect < 1.6 ? 1.4 : 1;
      target.copy(plane.position).add(new THREE.Vector3(1, 0.5, 0));
      look.lerp(target, c < 0.05 ? 1 : 0.12);
      camera.position.set(look.x - 9 * far, look.y + 4.2 * far, 17 * far);
      camera.lookAt(look);
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ----- road: a container truck on the highway ----- */

function roadStage(): Stage {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  const grassTex = track(noiseTexture(256, [142, 146, 104], 34, 9));
  grassTex.repeat.set(160, 160);
  const ground = mesh(track(new THREE.PlaneGeometry(1600, 1600)), track(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })), 0, -0.03, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  root.add(ground);

  const TILE = 24; // metres per dash cycle
  const roadTex = track(laneTexture("road"));
  roadTex.repeat.set(1600 / TILE, 1);
  const road = mesh(track(new THREE.PlaneGeometry(1600, 9)), track(new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92 })), 0, 0, 0);
  road.rotation.x = -Math.PI / 2;
  road.castShadow = false;
  root.add(road);

  // roadside: guardrail, lamp posts, trees; they all ride a conveyor that wraps
  const conveyor = new THREE.Group();
  root.add(conveyor);
  const SPAN = 360;
  const steel = track(chrome());
  const rail = mesh(track(new THREE.BoxGeometry(1600, 0.32, 0.08)), steel, 0, 0.7, -5.6);
  root.add(rail);
  const postGeo = track(new THREE.BoxGeometry(0.12, 0.8, 0.12));
  const lampGeo = track(new THREE.CylinderGeometry(0.09, 0.12, 9, 10));
  const armGeo = track(new THREE.BoxGeometry(0.1, 0.1, 2.6));
  const headGeo = track(new THREE.BoxGeometry(0.7, 0.18, 0.35));
  const lampMat = track(paint("#8f979c", 0.45, 0.7));
  const r = rng(12);
  const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.26, 2.4, 7));
  const crownGeo = track(new THREE.IcosahedronGeometry(1.6, 1));
  const bark = track(paint("#5a4632", 1));
  const leaves = [track(paint("#4d6b3a", 0.95)), track(paint("#5f7d44", 0.95)), track(paint("#3f5a33", 0.95))];
  for (let x = -SPAN / 2; x < SPAN / 2; x += 6) conveyor.add(mesh(postGeo, steel, x, 0.4, -5.6));
  for (let x = -SPAN / 2; x < SPAN / 2; x += 40) {
    conveyor.add(mesh(lampGeo, lampMat, x, 4.5, -6.6));
    conveyor.add(mesh(armGeo, lampMat, x, 8.95, -5.4));
    conveyor.add(mesh(headGeo, lampMat, x, 8.85, -4.2));
  }
  for (let i = 0; i < 90; i++) {
    const side = r() > 0.35 ? -1 : 1;
    const x = -SPAN / 2 + r() * SPAN;
    const z = side * (10 + r() * 50);
    const s = 0.8 + r() * 0.9;
    const trunk = mesh(trunkGeo, bark, x, 1.2 * s, z);
    trunk.scale.setScalar(s);
    const crown = mesh(crownGeo, leaves[i % 3], x, 3.4 * s, z);
    crown.scale.set(s, s * 1.25, s);
    conveyor.add(trunk, crown);
  }

  // the truck (metres): a tractor unit pulling a 40ft container on a skeletal trailer, heading +x in the near lane
  const truck = new THREE.Group();
  truck.position.z = 2.1;
  root.add(truck);
  const cabPaint = track(new THREE.MeshPhysicalMaterial({ color: "#1f2428", roughness: 0.28, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const frame = track(paint("#22262a", 0.6, 0.5));
  const glassMat = track(glass());
  const chromeMat = track(chrome());

  const cab = mesh(track(new RoundedBoxGeometry(2.3, 2.9, 2.5, 4, 0.16)), cabPaint, 6.55, 2.55, 0);
  truck.add(cab);
  truck.add(mesh(track(new THREE.BoxGeometry(0.06, 1.1, 2.2)), glassMat, 7.72, 3.05, 0)); // windscreen
  for (const z of [-1.26, 1.26]) truck.add(mesh(track(new THREE.BoxGeometry(1.1, 0.9, 0.04)), glassMat, 6.9, 3.1, z));
  truck.add(mesh(track(new THREE.BoxGeometry(0.08, 0.8, 1.7)), chromeMat, 7.72, 1.75, 0)); // grille
  truck.add(mesh(track(new THREE.BoxGeometry(0.3, 0.42, 2.5)), frame, 7.7, 0.95, 0)); // bumper
  for (const z of [-0.95, 0.95]) {
    truck.add(mesh(track(new THREE.BoxGeometry(0.06, 0.2, 0.4)), track(new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: "#fff3c4", emissiveIntensity: 1.4 })), 7.74, 1.25, z));
    const mirror = mesh(track(new THREE.BoxGeometry(0.12, 0.5, 0.06)), frame, 7.5, 3.1, z * 1.45);
    truck.add(mirror);
  }
  truck.add(mesh(track(new THREE.BoxGeometry(2.1, 0.32, 2.36)), cabPaint, 6.35, 4.1, 0)); // roof fairing
  for (const z of [-1.05, 1.05]) {
    const tank = mesh(track(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 18)), chromeMat, 5.4, 0.8, z);
    tank.rotation.z = Math.PI / 2;
    truck.add(tank);
  }
  truck.add(mesh(track(new THREE.BoxGeometry(14.2, 0.28, 1.0)), frame, 0.2, 0.95, 0)); // chassis rails

  const container = mesh(
    track(new THREE.BoxGeometry(12.19, 2.59, 2.44)),
    track(new THREE.MeshStandardMaterial({ map: track(containerTexture()), color: BRAND, roughness: 0.55, metalness: 0.35 })),
    -0.9,
    1.15 + 1.295,
    0,
  );
  truck.add(container);
  for (let i = 0; i < 4; i++) truck.add(mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 2.4)), chromeMat, -7.0, 2.45, -0.9 + i * 0.6)); // door bars

  const wheels: THREE.Mesh[] = [];
  const tyreGeo = track(new THREE.CylinderGeometry(0.52, 0.52, 0.32, 28));
  const hubGeo = track(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 20));
  const tyreMat = track(rubber());
  for (const x of [6.9, 3.9, 2.6, -4.2, -5.5, -6.8])
    for (const z of [-1.1, 1.1]) {
      const w = mesh(tyreGeo, tyreMat, x, 0.52, z);
      w.rotation.x = Math.PI / 2;
      w.add(mesh(hubGeo, chromeMat));
      wheels.push(w);
      truck.add(w);
    }

  const speed = 24; // metres a second, about 86 km/h
  let travelled = 0;
  return {
    root,
    focus: truck.position,
    shadowSize: 20,
    fog: new THREE.Fog("#e3e6df", 60, 420),
    update(t, dt, camera, aspect) {
      travelled += dt * speed;
      roadTex.offset.x = (travelled / TILE) % 1;
      for (const o of conveyor.children) {
        o.userData.x ??= o.position.x;
        o.position.x = THREE.MathUtils.euclideanModulo(o.userData.x - travelled + SPAN / 2, SPAN) - SPAN / 2;
      }
      wheels.forEach((w) => (w.rotation.y = -travelled / 0.52));
      truck.position.y = Math.sin(t * 13) * 0.012;
      const far = aspect < 1.6 ? 1.5 : 1;
      camera.position.set((15 + Math.sin(t * 0.15) * 3) * far, 5.2 * far, 16 * far);
      camera.lookAt(0.6, 1.8, 0.6);
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ---------- the renderer ---------- */

export function createFreight(canvas: HTMLCanvasElement, opts: { still: boolean; onFirstFrame: () => void }): Freight | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 2, 0.5, 8000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  // a real sky, and a sun to match it
  const sky = new Sky();
  sky.scale.setScalar(6000);
  const u = sky.material.uniforms;
  u.turbidity.value = 5;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 24), THREE.MathUtils.degToRad(150));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  const sunLight = new THREE.DirectionalLight("#fff3e2", 3.2);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight, sunLight.target);
  scene.add(new THREE.HemisphereLight("#cfe3f2", "#6f6a5c", 0.7));

  const builders: Record<FreightMode, () => Stage> = { sea: () => seaStage(sunDir), air: airStage, road: roadStage };
  const stages: Partial<Record<FreightMode, Stage>> = {};
  let stage: Stage | null = null;
  let t = 0;
  let last = performance.now();
  let raf = 0;
  let onScreen = true;
  let firstFrame = false;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => {
    resize();
    if (opts.still) draw(0);
  });
  ro.observe(canvas);
  resize();

  function draw(dt: number) {
    if (!stage) return;
    stage.update(t, dt, camera, camera.aspect);
    const f = stage.focus;
    sunLight.position.set(f.x + sunDir.x * 120, f.y + sunDir.y * 120, f.z + sunDir.z * 120);
    sunLight.target.position.copy(f);
    const s = stage.shadowSize;
    const sc = sunLight.shadow.camera;
    if (sc.right !== s) {
      Object.assign(sc, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 400 });
      sc.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    if (!firstFrame) {
      firstFrame = true;
      opts.onFirstFrame();
    }
  }

  const loop = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    draw(dt);
    schedule();
  };
  function schedule() {
    if (!raf && !opts.still && onScreen && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    schedule();
  });
  io.observe(canvas);
  const onVisibility = () => schedule();
  document.addEventListener("visibilitychange", onVisibility);

  return {
    set(mode) {
      if (stage) scene.remove(stage.root);
      stage = stages[mode] ??= builders[mode]();
      scene.add(stage.root);
      scene.fog = stage.fog;
      t = opts.still ? 2.2 : 0;
      draw(0);
      schedule();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      Object.values(stages).forEach((s) => s?.dispose());
      sky.geometry.dispose();
      sky.material.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
