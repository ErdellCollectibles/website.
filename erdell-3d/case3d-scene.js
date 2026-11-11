/* Erdell Collectibles – 3D-Ansicht Premium ETB Case
   Maße in Zentimetern (1 Einheit = 1 cm). Lädt nur lokale Dateien (DSGVO). */
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const TEX = (name) => new URL('./textures/' + name, import.meta.url).href;

// ---------- Maße ----------
const CASE = { w: 20.1, d: 10.1, wall: 0.5, plate: 0.8, innerH: 16.9 };
CASE.bodyH = CASE.plate + CASE.innerH;              // 17.7 = Oberkante Korpus
const BOX = { w: 21.0, d: 11.0, h: 19.2, t: 0.05 };  // Faltschachtel 210 × 110 × 192 mm
const ETB = { w: 18.8, d: 8.8, h: 16.6 };            // neutrale Top-Trainer-Box
const LID_PARK_X = 24.5;                              // abgelegter Deckel rechts neben dem Case
const MAGNET_X = [-8.6, 0, 8.6];

const STAGES = [
  { chip: 'Karton',    action: 'Auspacken',        status: 'Das Case in seiner Faltschachtel.' },
  { chip: 'Case',      action: 'Deckel abnehmen',  status: 'Ausgepackt: das Premium ETB Case.' },
  { chip: 'Deckel ab', action: 'ETB einsetzen',    status: 'Der Magnetdeckel ist abgenommen.' },
  { chip: 'ETB drin',  action: 'Deckel schließen', status: 'Eine Top-Trainer-Box steht im Case.' },
  { chip: 'Fertig',    action: 'Nochmal ansehen',  status: 'Deckel zu – deine ETB ist geschützt.' },
];
const SEG_DUR = [4.6, 1.9, 1.8, 1.8];

const CALLOUTS = [
  { id: 'uv', prio: 0.30, title: 'UV-Schutz &gt;99&nbsp;%', text: 'UVA + UVB – schützt vor dem Ausbleichen',
    obj: 'body', anchors: [[[0, 12.5, 5.05], [0, 0, 1]], [[0, 12.5, -5.05], [0, 0, -1]]] },
  { id: 'dicke', prio: 0.25, title: '5 + 8&nbsp;mm stark', text: '5&nbsp;mm Wände, 8&nbsp;mm Boden und Deckel',
    obj: 'lid', anchors: [[[10.05, 0.8, 5.05], [0.5, 1, 0.5]], [[-10.05, 0.8, 5.05], [-0.5, 1, 0.5]],
                          [[10.05, 0.8, -5.05], [0.5, 1, -0.5]], [[-10.05, 0.8, -5.05], [-0.5, 1, -0.5]]] },
  { id: 'acryl', prio: 0.20, title: 'Gegossenes Acryl', text: 'Kristallklar, polierte Kanten',
    obj: 'body', anchors: [[[10.05, 7, 0], [1, 0, 0]], [[-10.05, 7, 0], [-1, 0, 0]]] },
  { id: 'magnete', prio: 0.15, title: '12 Magnete', text: 'Der Deckel rastet sicher ein',
    obj: 'body', anchors: [[[8.6, 17.55, 4.8], [0, 0.6, 1]], [[-8.6, 17.55, -4.8], [0, 0.6, -1]],
                           [[-8.6, 17.55, 4.8], [0, 0.6, 1]], [[8.6, 17.55, -4.8], [0, 0.6, -1]]] },
  { id: 'mass', prio: 0.05, title: 'Innenmaß 19,1 × 9,1 × 16,9&nbsp;cm', text: 'Passt für Top-Trainer-Boxen',
    obj: 'body', anchors: [[[-6.5, 2.2, 5.05], [0, 0, 1]], [[6.5, 2.2, -5.05], [0, 0, -1]]] },
];

// ---------- Helfer ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const ramp = (u, a, b) => ease(clamp01((u - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;

// Zeitachse: t = 0 … 4, jede ganze Zahl ist ein Schritt
function poseAt(t) {
  const s0 = clamp01(t), s1 = clamp01(t - 1), s2 = clamp01(t - 2), s3 = clamp01(t - 3);
  const riseH = BOX.h + 1.8;
  const rise = ramp(s0, 0.36, 0.6), drop = ramp(s0, 0.8, 1.0);
  return {
    tuck: ramp(s0, 0.0, 0.14),
    boxLid: ramp(s0, 0.08, 0.32),
    dust: ramp(s0, 0.2, 0.38),
    caseY: BOX.t + rise * riseH - drop * (riseH + BOX.t),
    cartonFade: ramp(s0, 0.6, 0.8),
    lidOff: s1 - s3,
    etbIn: s2,
    click: s3 > 0.86 ? Math.sin(Math.PI * clamp01((s3 - 0.86) / 0.14)) : 0,
  };
}

function lidPose(s) {
  const a = ramp(s, 0, 0.32), b = ramp(s, 0.22, 0.78), c = ramp(s, 0.68, 1);
  return { x: LID_PARK_X * b, y: CASE.bodyH + 6 * a - (CASE.bodyH + 6) * c, rz: -0.16 * Math.sin(Math.PI * b) };
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// ---------- Mount ----------
export async function mount(root) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // vorhandenen Inhalt (z. B. die Zeichnung) als Fallback aufbewahren
  const fallback = el('div', 'ec3d-fallback');
  while (root.firstChild) fallback.appendChild(root.firstChild);
  root.appendChild(fallback);
  fallback.hidden = true;

  const stage = el('div', 'ec3d-stage');
  stage.tabIndex = 0;
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', '3D-Ansicht des Premium ETB Case. Mit Maus, Finger oder Pfeiltasten drehen.');
  const canvas = el('canvas', 'ec3d-canvas');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ec3d-lines');
  svg.setAttribute('aria-hidden', 'true');
  const labelsBox = el('div', 'ec3d-labels');
  labelsBox.setAttribute('aria-hidden', 'true');
  const head = el('p', 'ec3d-head', 'Der perfekte Schutz für deine ETB.');
  const hint = el('div', 'ec3d-hint', '<span aria-hidden="true">⟷</span> Ziehen zum Drehen');
  const loading = el('div', 'ec3d-loading', '3D-Ansicht wird geladen …');
  stage.append(canvas, svg, labelsBox, head, hint, loading);

  const bar = el('div', 'ec3d-bar');
  const steps = el('ol', 'ec3d-steps');
  steps.setAttribute('aria-label', 'Schritte');
  const chipBtns = STAGES.map((s, i) => {
    const li = el('li');
    const b = el('button', 'ec3d-step', '<span class="ec3d-step-l">' + s.chip + '</span>');
    b.type = 'button';
    b.addEventListener('click', () => goTo(i));
    li.appendChild(b); steps.appendChild(li);
    return b;
  });
  const next = el('button', 'ec3d-next');
  next.type = 'button';
  bar.append(steps, next);
  const status = el('p', 'ec3d-status');
  status.setAttribute('aria-live', 'polite');
  root.append(stage, bar, status);

  // ---------- Renderer ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    stage.remove(); bar.remove(); status.remove();
    fallback.hidden = false;
    root.classList.add('ec3d--nowebgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 600);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-28, 52, 34);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 160 });
  key.shadow.bias = -0.0008;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e1d8, 0.55));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShadowMaterial({ opacity: 0.11 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- Texturen ----------
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  const loadTex = (n) => {
    const t = loader.load(TEX(n));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };
  const texFront = loadTex('karton_front.jpg');
  const texBack = loadTex('karton_rueck.jpg');
  const texLeft = loadTex('karton_seite_links.jpg');
  const texRight = loadTex('karton_seite_rechts.jpg');
  const texLid = loadTex('karton_deckel.jpg');
  texLid.center.set(0.5, 0.5); texLid.rotation = Math.PI;
  const texLogo = loadTex('logo_weiss.png');
  const loaded = new Promise((res) => { manager.onLoad = res; manager.onError = res; });

  // ---------- Acryl-Case ----------
  const acrylFace = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.16,
    envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.49, specularIntensity: 1,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const acrylEdge = new THREE.MeshPhysicalMaterial({
    color: 0xcfe6e0, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.62,
    envMapIntensity: 1.8, clearcoat: 1, depthWrite: false,
  });
  const edgeLine = new THREE.LineBasicMaterial({ color: 0x8aa39d, transparent: true, opacity: 0.45, depthWrite: false });

  function acrylBox(sx, sy, sz) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const thin = sx <= sy && sx <= sz ? 0 : sy <= sz ? 1 : 2; // dünne Achse = große Flächen
    const mats = [0, 1, 2, 3, 4, 5].map((i) => (Math.floor(i / 2) === thin ? acrylFace : acrylEdge));
    const m = new THREE.Mesh(g, mats);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeLine));
    return m;
  }

  const magnetMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.28, emissive: 0xffc861, emissiveIntensity: 0 });
  const magnetGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 20);

  const caseGroup = new THREE.Group();
  const body = new THREE.Group();
  caseGroup.add(body);
  const bottom = acrylBox(CASE.w, CASE.plate, CASE.d);
  bottom.position.y = CASE.plate / 2;
  body.add(bottom);
  for (const sz of [1, -1]) {
    const w = acrylBox(CASE.w, CASE.innerH, CASE.wall);
    w.position.set(0, CASE.plate + CASE.innerH / 2, sz * (CASE.d / 2 - CASE.wall / 2));
    body.add(w);
    for (const x of MAGNET_X) {
      const m = new THREE.Mesh(magnetGeo, magnetMat);
      m.position.set(x, CASE.bodyH - 0.15, sz * (CASE.d / 2 - CASE.wall / 2));
      body.add(m);
    }
  }
  for (const sx of [1, -1]) {
    const w = acrylBox(CASE.wall, CASE.innerH, CASE.d - 2 * CASE.wall);
    w.position.set(sx * (CASE.w / 2 - CASE.wall / 2), CASE.plate + CASE.innerH / 2, 0);
    body.add(w);
  }
  // Logo: innen auf dem Boden, gespiegelt gedruckt (von unten lesbar), 38 mm breit
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 3.8 * 322 / 1024),
    new THREE.MeshStandardMaterial({ map: texLogo, transparent: true, roughness: 0.55, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff })
  );
  logo.rotation.x = -Math.PI / 2;
  logo.scale.x = -1;
  logo.position.y = CASE.plate + 0.012;
  body.add(logo);

  const lid = new THREE.Group();
  const lidPlate = acrylBox(CASE.w, CASE.plate, CASE.d);
  lidPlate.position.y = CASE.plate / 2;
  lid.add(lidPlate);
  for (const sz of [1, -1]) for (const x of MAGNET_X) {
    const m = new THREE.Mesh(magnetGeo, magnetMat);
    m.position.set(x, 0.15, sz * (CASE.d / 2 - CASE.wall / 2));
    lid.add(m);
  }
  caseGroup.add(lid);
  scene.add(caseGroup);

  // weiche Kontaktschatten unter Case und Deckel
  const blobTex = canvasTex(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.55, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const blob = (w, d) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.3 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = -1;
    scene.add(m); return m;
  };
  const caseBlob = blob(CASE.w * 1.45, CASE.d * 1.9);
  const lidBlob = blob(CASE.w * 1.3, CASE.d * 1.6);

  // ---------- Neutrale Top-Trainer-Box (ohne Marken, ohne Motive) ----------
  const ppcm = 26;
  const etbFace = (wcm, hcm, kind) => canvasTex(Math.round(wcm * ppcm), Math.round(hcm * ppcm), (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#34457d'); g.addColorStop(1, '#161d3b');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.07)';
    c.lineWidth = ppcm * 0.35;
    const r0 = Math.max(w, h);
    for (let i = 1; i <= 5; i++) { c.beginPath(); c.arc(w * 0.78, h * 0.3, r0 * 0.14 * i, 0, Math.PI * 2); c.stroke(); }
    const inset = ppcm * 0.6;
    c.strokeStyle = '#c8a659'; c.lineWidth = ppcm * 0.08;
    c.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
    if (kind === 'side') {
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(0, h - ppcm * 2.2, w, ppcm * 0.06);
    }
    if (kind === 'top') {
      c.strokeStyle = 'rgba(200,166,89,0.55)'; c.lineWidth = ppcm * 0.1;
      c.beginPath(); c.arc(w / 2, h / 2, h * 0.28, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(w / 2, h / 2, h * 0.18, 0, Math.PI * 2); c.stroke();
    }
  });
  const etbMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.05 });
  const etb = new THREE.Mesh(new THREE.BoxGeometry(ETB.w, ETB.h, ETB.d), [
    etbMat(etbFace(ETB.d, ETB.h, 'side')), etbMat(etbFace(ETB.d, ETB.h, 'side')),
    etbMat(etbFace(ETB.w, ETB.d, 'top')), etbMat(etbFace(ETB.w, ETB.d, 'plain')),
    etbMat(etbFace(ETB.w, ETB.h, 'side')), etbMat(etbFace(ETB.w, ETB.h, 'side')),
  ]);
  etb.castShadow = true;
  const etbGroup = new THREE.Group();
  etb.position.y = ETB.h / 2;
  etbGroup.add(etb);
  caseGroup.add(etbGroup);

  // ---------- Faltschachtel ----------
  const inner = new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.9 });
  const printed = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
  const cartonMats = [inner];
  const panel = (sx, sy, sz, outerIndex, map) => {
    const mats = [inner, inner, inner, inner, inner, inner];
    if (map) { const p = printed(map); mats[outerIndex] = p; cartonMats.push(p); }
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mats);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const carton = new THREE.Group();
  const t = BOX.t;
  const pFront = panel(BOX.w, BOX.h, t, 4, texFront); pFront.position.set(0, BOX.h / 2, BOX.d / 2 - t / 2);
  const pBack = panel(BOX.w, BOX.h, t, 5, texBack); pBack.position.set(0, BOX.h / 2, -BOX.d / 2 + t / 2);
  const pLeft = panel(t, BOX.h, BOX.d - 2 * t, 1, texLeft); pLeft.position.set(-BOX.w / 2 + t / 2, BOX.h / 2, 0);
  const pRight = panel(t, BOX.h, BOX.d - 2 * t, 0, texRight); pRight.position.set(BOX.w / 2 - t / 2, BOX.h / 2, 0);
  const pBottom = panel(BOX.w, t, BOX.d, 2, null); pBottom.position.y = t / 2;
  carton.add(pFront, pBack, pLeft, pRight, pBottom);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, BOX.h, -BOX.d / 2);
  const pLid = panel(BOX.w, t, BOX.d, 2, texLid); pLid.position.set(0, t / 2, BOX.d / 2);
  lidPivot.add(pLid);
  const tuckPivot = new THREE.Group();
  tuckPivot.position.set(0, 0, BOX.d);
  const pTuck = panel(BOX.w - 0.6, 1.9, t, 4, null); pTuck.position.set(0, -0.95, -t / 2);
  tuckPivot.add(pTuck);
  lidPivot.add(tuckPivot);
  carton.add(lidPivot);

  const dustL = new THREE.Group(); dustL.position.set(-BOX.w / 2 + t, BOX.h - 1.5 * t, 0);
  const pDL = panel(4.6, t, BOX.d - 0.5, 2, null); pDL.position.x = 2.3; dustL.add(pDL);
  const dustR = new THREE.Group(); dustR.position.set(BOX.w / 2 - t, BOX.h - 1.5 * t, 0);
  const pDR = panel(4.6, t, BOX.d - 0.5, 2, null); pDR.position.x = -2.3; dustR.add(pDR);
  carton.add(dustL, dustR);
  scene.add(carton);

  // ---------- Zustand ----------
  let tCur = 0, tTarget = 0;
  let yaw = 0.62, pitch = 0.3, vYaw = 0, vPitch = 0;
  let dragging = false, lastX = 0, lastY = 0, lastMoveT = 0, moved = 0;
  let lastInteract = -1e9;
  let active = false;            // Technik-Hinweise freigeschaltet
  const camTarget = new THREE.Vector3(0, 9.6, 0);
  let camDist = 70;
  let visible = true, running = false, lastFrame = 0;
  let cartonAlpha = 1;
  let firstFit = true;

  function applyPose(p) {
    tuckPivot.rotation.x = -0.58 * Math.PI * p.tuck;
    lidPivot.rotation.x = -0.66 * Math.PI * p.boxLid;
    dustL.rotation.z = 0.62 * Math.PI * p.dust;
    dustR.rotation.z = -0.62 * Math.PI * p.dust;
    caseGroup.position.y = p.caseY;

    const a = 1 - p.cartonFade;
    if (a !== cartonAlpha) {
      const needT = a < 0.999;
      for (const m of cartonMats) {
        if (m.transparent !== needT) { m.transparent = needT; m.needsUpdate = true; }
        m.opacity = a;
      }
      cartonAlpha = a;
    }
    carton.visible = a > 0.01;

    const lp = lidPose(p.lidOff);
    lid.position.set(lp.x, lp.y, 0);
    lid.rotation.z = lp.rz;

    etbGroup.visible = p.etbIn > 0.0001;
    etbGroup.position.y = CASE.plate + 0.02 + 30 * (1 - easeOut(p.etbIn));
    etbGroup.rotation.y = 0.25 * (1 - easeOut(p.etbIn));

    magnetMat.emissiveIntensity = 1.6 * p.click;

    caseBlob.material.opacity = (carton.visible ? 0 : 0.3) * (1 - clamp01(p.caseY / 12));
    lidBlob.visible = lp.y < CASE.bodyH - 0.5;
    lidBlob.position.set(lp.x, 0.025, 0);
    lidBlob.material.opacity = 0.22 * (1 - clamp01(Math.max(0, lp.y) / 10));
  }

  // Kamera-Rahmen aus den sichtbaren Objekten
  const box3 = new THREE.Box3(), tmpBox = new THREE.Box3();
  const fitCenter = new THREE.Vector3(), fitSize = new THREE.Vector3();
  function fitTarget() {
    box3.makeEmpty();
    if (carton.visible) box3.union(tmpBox.setFromObject(carton));
    box3.union(tmpBox.setFromObject(body));
    box3.union(tmpBox.setFromObject(lid));
    box3.getCenter(fitCenter);
    box3.getSize(fitSize);
    const radius = fitSize.length() / 2;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const fov = Math.min(vfov, hfov);
    // Mit Überschrift etwas mehr Abstand und das Modell leicht nach unten rücken
    const withHead = head.classList.contains('is-on');
    const narrowStage = stage.clientWidth < 560;
    if (withHead && !narrowStage) fitCenter.y += fitSize.y * 0.1;
    return { center: fitCenter, dist: (radius / Math.sin(fov / 2)) * (withHead ? (narrowStage ? 1.3 : 1.08) : 0.92) };
  }

  const prevTarget = new THREE.Vector3();
  function updateCamera(dt) {
    const f = fitTarget();
    const k = firstFit ? 1 : 1 - Math.exp(-dt * 3.2);
    firstFit = false;
    prevTarget.copy(camTarget);
    camTarget.lerp(f.center, k);
    const d0 = camDist;
    camDist = lerp(camDist, f.dist, k);
    camera.position.set(
      camTarget.x + camDist * Math.sin(yaw) * Math.cos(pitch),
      camTarget.y + camDist * Math.sin(pitch),
      camTarget.z + camDist * Math.cos(yaw) * Math.cos(pitch)
    );
    camera.lookAt(camTarget);
    return prevTarget.distanceTo(camTarget) > 0.002 || Math.abs(d0 - camDist) > 0.002;
  }

  // ---------- Technik-Hinweise ----------
  const objOf = { body, lid };
  const labelEls = CALLOUTS.map((c) => {
    const lab = el('div', 'ec3d-label', '<strong>' + c.title + '</strong><span>' + c.text + '</span>');
    const dot = el('div', 'ec3d-dot');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    labelsBox.append(lab, dot); svg.appendChild(line);
    return { c, lab, dot, line, shown: false, w: 0, h: 0 };
  });
  const vA = new THREE.Vector3(), vN = new THREE.Vector3(), vC = new THREE.Vector3(), q = new THREE.Quaternion();

  const setShown = (L, on) => {
    if (L.shown === on) return;
    L.shown = on;
    L.lab.classList.toggle('is-on', on); L.dot.classList.toggle('is-on', on); L.line.classList.toggle('is-on', on);
  };

  function updateLabels() {
    const W = stage.clientWidth, H = stage.clientHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const settled = tCur === tTarget && Math.round(tCur) >= 1;
    if (!active || !settled) { for (const L of labelEls) setShown(L, false); return; }
    const narrow = W < 560;
    const maxN = narrow ? 2 : 4;
    const cand = [];
    for (const L of labelEls) {
      const o = objOf[L.c.obj];
      o.getWorldQuaternion(q);
      let best = null;
      for (const [p, n] of L.c.anchors) {
        vA.set(p[0], p[1], p[2]); o.localToWorld(vA);
        vN.set(n[0], n[1], n[2]).normalize().applyQuaternion(q);
        vC.copy(camera.position).sub(vA).normalize();
        const s = vN.dot(vC);
        if (!best || s > best.s) best = { s, p: vA.clone() };
      }
      if (best && best.s > 0.22) cand.push({ L, s: best.s + L.c.prio, p: best.p });
    }
    cand.sort((a, b) => b.s - a.s);
    const placed = [];
    const topLimit = head.classList.contains('is-on') ? head.offsetTop + head.offsetHeight + 10 : 10;
    const pad = narrow ? 10 : 16;
    if (narrow) {
      // Handy: zwei Karten nebeneinander unten in der Ansicht, Linie hoch zum Punkt
      const colW = Math.floor((W - 2 * pad - 8) / 2);
      const pts = cand.slice(0, maxN).map((it) => {
        const v = it.p.project(camera);
        return { L: it.L, sx: (v.x + 1) / 2 * W, sy: (1 - v.y) / 2 * H };
      }).sort((a, b) => a.sx - b.sx);
      const shownNarrow = new Set();
      pts.forEach((P, i) => {
        const L = P.L;
        if (L.w !== colW) { L.lab.style.width = colW + 'px'; L.lab.style.maxWidth = 'none'; L.w = colW; L.h = L.lab.offsetHeight; }
        const x = pts.length === 1 ? pad : pad + i * (colW + 8);
        const y = H - L.h - 12;
        shownNarrow.add(L);
        L.lab.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
        L.dot.style.transform = 'translate(' + Math.round(P.sx) + 'px,' + Math.round(P.sy) + 'px)';
        L.line.setAttribute('x1', P.sx); L.line.setAttribute('y1', P.sy);
        L.line.setAttribute('x2', Math.min(Math.max(P.sx, x + 14), x + colW - 14)); L.line.setAttribute('y2', y);
        setShown(L, true);
      });
      for (const L of labelEls) if (!shownNarrow.has(L)) setShown(L, false);
      return;
    }
    for (const it of cand.slice(0, maxN)) {
      const L = it.L;
      if (!L.w || L.lab.style.width) { L.lab.style.width = ''; L.lab.style.maxWidth = ''; L.w = L.lab.offsetWidth; L.h = L.lab.offsetHeight; }
      const v = it.p.project(camera);
      const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H;
      const left = sx < W / 2;
      const colX = left ? pad : W - pad - L.w;
      const inCol = left ? sx < colX + L.w + 28 : sx > colX - 28;
      let x, y;
      if (!inCol) { x = colX; y = sy - L.h / 2; }
      else { x = Math.min(Math.max(sx - L.w / 2, pad), W - pad - L.w); y = sy - L.h - 26; }
      y = Math.min(Math.max(y, topLimit), H - L.h - 16);
      placed.push({ L, sx, sy, x, y, left, inCol });
    }
    // Überlappungen auflösen
    placed.sort((a, b) => a.y - b.y);
    for (let i = 1; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        const A = placed[j], B = placed[i];
        const ox = A.x < B.x + B.L.w && B.x < A.x + A.L.w;
        if (ox && B.y < A.y + A.L.h + 8) B.y = A.y + A.L.h + 8;
      }
    }
    const shownNow = new Set();
    for (const P of placed) {
      if (P.y + P.L.h > H - 8) continue;
      const L = P.L;
      shownNow.add(L);
      L.lab.style.transform = 'translate(' + Math.round(P.x) + 'px,' + Math.round(P.y) + 'px)';
      L.dot.style.transform = 'translate(' + Math.round(P.sx) + 'px,' + Math.round(P.sy) + 'px)';
      let ex, ey;
      if (P.inCol) { ex = Math.min(Math.max(P.sx, P.x + 12), P.x + L.w - 12); ey = P.y + L.h; }
      else { ex = P.left ? P.x + L.w : P.x; ey = P.y + L.h / 2; }
      L.line.setAttribute('x1', P.sx); L.line.setAttribute('y1', P.sy);
      L.line.setAttribute('x2', ex); L.line.setAttribute('y2', ey);
      setShown(L, true);
    }
    for (const L of labelEls) if (!shownNow.has(L)) setShown(L, false);
  }

  function activate() {
    if (active) return;
    active = true;
    head.classList.add('is-on');
    hint.classList.add('is-off');
    for (const L of labelEls) L.w = 0;
    wake();
  }

  // ---------- Schritte / Buttons ----------
  const stageIndex = () => Math.round(tTarget);
  function syncUI() {
    const i = stageIndex();
    chipBtns.forEach((b, k) => {
      b.classList.toggle('is-done', k < i);
      b.classList.toggle('is-current', k === i);
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    next.innerHTML = STAGES[i].action + (i < STAGES.length - 1 ? ' <span aria-hidden="true">→</span>' : ' <span aria-hidden="true">↺</span>');
    status.textContent = 'Schritt ' + (i + 1) + ' von ' + STAGES.length + ': ' + STAGES[i].status;
  }
  function goTo(i) {
    tTarget = Math.max(0, Math.min(STAGES.length - 1, i));
    syncUI(); wake();
  }
  next.addEventListener('click', () => {
    const i = stageIndex();
    goTo(i >= STAGES.length - 1 ? 0 : i + 1);
  });

  // ---------- Drehen ----------
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY; lastMoveT = performance.now();
    vYaw = vPitch = 0;
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* egal */ }
    stage.classList.add('is-grabbing');
    lastInteract = performance.now();
    wake();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    const dYaw = -dx * 0.0085;
    const dPitch = e.pointerType === 'touch' ? 0 : dy * 0.006; // Touch: vertikal scrollt die Seite
    yaw += dYaw;
    pitch = Math.min(1.05, Math.max(0.05, pitch + dPitch));
    const ms = Math.max(8, now - lastMoveT); lastMoveT = now;
    vYaw = dYaw / ms * 16; vPitch = dPitch / ms * 16;
    moved += Math.abs(dYaw) + Math.abs(dPitch);
    if (moved > 0.25) activate();
    lastInteract = now;
    wake();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-grabbing');
    if (performance.now() - lastMoveT > 80) vYaw = vPitch = 0;
    lastInteract = performance.now();
    wake();
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('keydown', (e) => {
    const step = 0.18;
    if (e.key === 'ArrowLeft') yaw += step;
    else if (e.key === 'ArrowRight') yaw -= step;
    else if (e.key === 'ArrowUp') pitch = Math.min(1.05, pitch + step * 0.6);
    else if (e.key === 'ArrowDown') pitch = Math.max(0.05, pitch - step * 0.6);
    else return;
    e.preventDefault();
    moved += step; if (moved > 0.25) activate();
    lastInteract = performance.now();
    wake();
  });

  // ---------- Loop (rendert nur, wenn sich etwas bewegt) ----------
  function update(dt, now) {
    let busy = false;
    if (tCur !== tTarget) {
      const dir = Math.sign(tTarget - tCur);
      const seg = dir > 0 ? Math.floor(tCur) : Math.ceil(tCur) - 1;
      const far = Math.abs(tTarget - tCur) > 1.001;
      let dur = SEG_DUR[Math.min(Math.max(seg, 0), SEG_DUR.length - 1)];
      if (dir < 0) dur *= 0.4; else if (far) dur *= 0.6;
      if (reduced) dur *= 0.5;
      tCur += dir * dt / dur;
      if ((dir > 0 && tCur >= tTarget) || (dir < 0 && tCur <= tTarget)) tCur = tTarget;
      busy = true;
    }
    applyPose(poseAt(tCur));

    if (!dragging) {
      if (Math.abs(vYaw) > 1e-4 || Math.abs(vPitch) > 1e-4) {
        const decay = Math.pow(0.9, dt * 60);
        yaw += vYaw * dt * 60;
        pitch = Math.min(1.05, Math.max(0.05, pitch + vPitch * dt * 60));
        vYaw *= decay; vPitch *= decay; busy = true;
      } else { vYaw = vPitch = 0; }
      if (!reduced && tCur === tTarget && now - lastInteract > 5000) { yaw += 0.16 * dt; busy = true; }
    } else busy = true;

    if (updateCamera(dt)) busy = true;
    return busy;
  }

  function frame(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    const busy = update(dt, now);
    renderer.render(scene, camera);
    updateLabels();
    if (busy && visible) requestAnimationFrame(frame);
    else running = false;
  }
  function wake() {
    if (running || !visible) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const L of labelEls) L.w = 0;
    wake();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((ents) => {
    visible = ents.some((e) => e.isIntersecting);
    if (visible) wake();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(); });

  syncUI();
  resize();
  await loaded;
  loading.classList.add('is-off');
  root.classList.add('ec3d--ready');
  lastInteract = performance.now() - 3000;
  wake();

  // für Tests in der Browser-Konsole
  root.ec3d = {
    goTo, activate,
    get t() { return tCur; },
    seek(x) { tCur = tTarget = x; firstFit = true; syncUI(); wake(); },
    setView(y, p) { yaw = y; pitch = p; vYaw = vPitch = 0; lastInteract = performance.now() + 1e6; firstFit = true; wake(); },
  };
}
