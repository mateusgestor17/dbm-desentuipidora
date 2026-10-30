/* =========================================================
   Hero: "câmera de inspeção" percorrendo uma tubulação (Three.js)
   Túnel com textura procedural, anéis de luz nas cores da marca
   e gotas de água correndo em direção à câmera.
   ========================================================= */
import * as THREE from "three";

const canvas = document.getElementById("tubo-3d");
const hero = document.querySelector(".hero");
const isMobile = matchMedia("(max-width: 760px)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false, powerPreference: "high-performance" });
} catch (e) {
  canvas.remove();
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050b);
scene.fog = new THREE.FogExp2(0x02050b, 0.085);
const camera = new THREE.PerspectiveCamera(isMobile ? 78 : 66, 1, 0.05, 80);

function resize() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
addEventListener("resize", resize);

/* ---------- caminho da tubulação (laço fechado e sinuoso) ---------- */
const pts = [];
const N = 14;
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2;
  const r = 34 + Math.sin(a * 3) * 7;
  pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 2) * 6 + Math.cos(a * 5) * 2.5, Math.sin(a) * r));
}
const path = new THREE.CatmullRomCurve3(pts, true, "centripetal");
const LEN = path.getLength();
const SEG = 900;
const RADIUS = 1;
const tube = new THREE.TubeGeometry(path, SEG, RADIUS, isMobile ? 32 : 48, true);

/* ---------- textura procedural (parede de cano usado) ---------- */
function pipeTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#56606f"); grd.addColorStop(.5, "#6b7584"); grd.addColorStop(1, "#4b5462");
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  // granulado
  for (let i = 0; i < 26000; i++) {
    const v = Math.random() * 60 | 0;
    g.fillStyle = `rgba(${v},${v},${v + 8},${Math.random() * 0.18})`;
    g.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }
  // manchas e escorridos de sujeira ao longo do cano
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 512, x = Math.random() * 1024, w = 80 + Math.random() * 420, h = 4 + Math.random() * 26;
    const s = g.createLinearGradient(x, 0, x + w, 0);
    const col = Math.random() < .55 ? "60,44,26" : "24,30,38";
    s.addColorStop(0, `rgba(${col},0)`); s.addColorStop(.5, `rgba(${col},${0.25 + Math.random() * 0.35})`); s.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = s; g.fillRect(x, y, w, h);
  }
  // juntas (anéis) a cada 256 px
  for (let x = 0; x < 1024; x += 256) {
    g.fillStyle = "rgba(10,14,20,.75)"; g.fillRect(x, 0, 14, 512);
    g.fillStyle = "rgba(220,230,240,.35)"; g.fillRect(x + 14, 0, 3, 512);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x - 6, 0, 6, 512);
  }
  // linha de água (faixa molhada)
  const wet = g.createLinearGradient(0, 300, 0, 470);
  wet.addColorStop(0, "rgba(40,120,170,0)"); wet.addColorStop(.5, "rgba(40,120,170,.35)"); wet.addColorStop(1, "rgba(40,120,170,0)");
  g.fillStyle = wet; g.fillRect(0, 300, 1024, 170);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.round(LEN / 6), 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const tex = pipeTexture();
const wall = new THREE.Mesh(tube, new THREE.MeshStandardMaterial({
  map: tex, bumpMap: tex, bumpScale: 0.04,
  roughness: 0.42, metalness: 0.35, side: THREE.BackSide,
}));
scene.add(wall);

/* ---------- amostras do caminho (posição + referencial) ---------- */
const frames = { P: [], T: tube.tangents, Nn: tube.normals, B: tube.binormals };
for (let k = 0; k <= SEG; k++) frames.P.push(path.getPointAt(k / SEG));
const at = (s) => (((s % 1) + 1) % 1) * SEG;
function sample(s, out) {
  const f = at(s), k = f | 0, k2 = (k + 1) % (SEG + 1), u = f - k;
  out.p.lerpVectors(frames.P[k], frames.P[k2], u);
  out.n.copy(frames.Nn[k]); out.b.copy(frames.B[k]); out.t.copy(frames.T[k]);
  return out;
}

/* ---------- anéis de luz nas cores da marca ---------- */
const RINGS = 40;
const ringGeo = new THREE.TorusGeometry(RADIUS * 0.965, 0.014, 8, 96);
const red = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
const blue = new THREE.MeshBasicMaterial({ color: 0x3fc0ff });
const tmp = { p: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3(), t: new THREE.Vector3() };
for (let i = 0; i < RINGS; i++) {
  const s = i / RINGS;
  sample(s, tmp);
  const ring = new THREE.Mesh(ringGeo, i % 2 ? blue : red);
  ring.position.copy(tmp.p);
  ring.lookAt(tmp.p.clone().add(tmp.t));
  scene.add(ring);
}

/* ---------- gotas de água correndo ---------- */
const DROPS = isMobile ? 900 : 2200;
const dGeo = new THREE.BufferGeometry();
const dPos = new Float32Array(DROPS * 3);
const dData = [];
for (let i = 0; i < DROPS; i++) {
  const bottom = Math.random() < 0.7; // a maior parte corre no "fundo" do cano
  dData.push({
    s: Math.random(),
    a: bottom ? Math.PI * 1.5 + (Math.random() - 0.5) * 1.3 : Math.random() * Math.PI * 2,
    r: bottom ? 0.82 + Math.random() * 0.14 : 0.2 + Math.random() * 0.7,
    v: 0.006 + Math.random() * 0.01,
  });
}
dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
const dropTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(170,225,255,.9)"); r.addColorStop(1, "rgba(60,160,230,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const drops = new THREE.Points(dGeo, new THREE.PointsMaterial({
  map: dropTex, size: isMobile ? 0.05 : 0.04, transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, color: 0x9fdcff, opacity: 0.9, sizeAttenuation: true,
}));
drops.frustumCulled = false;
scene.add(drops);

/* ---------- luzes ---------- */
scene.add(new THREE.AmbientLight(0x223044, 1.2));
const head = new THREE.PointLight(0xdfefff, 26, 14, 1.6);
scene.add(head);
const lRed = new THREE.PointLight(0xff2a2a, 30, 10, 1.6);
const lBlue = new THREE.PointLight(0x2aa8ff, 30, 10, 1.6);
scene.add(lRed, lBlue);

/* ---------- interação ---------- */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
document.addEventListener("visibilitychange", () => { if (document.hidden) visible = false; else visible = hero.getBoundingClientRect().bottom > 0; });

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const cam = { s: 0.02, speed: 0 };
const look = new THREE.Vector3(), up = new THREE.Vector3();
const c1 = { p: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3(), t: new THREE.Vector3() };
const c2 = { p: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3(), t: new THREE.Vector3() };

function tick() {
  requestAnimationFrame(tick);
  if (!visible) { clock.getDelta(); return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const boost = window.__heroBoost || 0; // vindo do scroll (main.js)
  const target = reduced ? 0 : (6.5 + boost * 22) / LEN; // unidades por segundo
  cam.speed += (target - cam.speed) * Math.min(1, dt * 2);
  cam.s = (cam.s + cam.speed * dt) % 1;
  mouse.x += (mouse.tx - mouse.x) * dt * 2.5;
  mouse.y += (mouse.ty - mouse.y) * dt * 2.5;

  sample(cam.s, c1);
  sample(cam.s + 0.012, c2);
  // leve balanço da câmera (como uma sonda real)
  const wob = 0.12;
  camera.position.copy(c1.p)
    .addScaledVector(c1.n, Math.sin(t * 0.7) * wob + mouse.y * 0.18)
    .addScaledVector(c1.b, Math.cos(t * 0.5) * wob + mouse.x * 0.25);
  look.copy(c2.p).addScaledVector(c2.b, mouse.x * 0.4).addScaledVector(c2.n, mouse.y * 0.25);
  up.copy(c1.n).applyAxisAngle(c1.t, Math.sin(t * 0.3) * 0.25);
  camera.up.copy(up);
  camera.lookAt(look);

  head.position.copy(camera.position);
  sample(cam.s + 0.03, c2);
  lRed.position.copy(c2.p).addScaledVector(c2.b, 0.5);
  sample(cam.s + 0.06, c2);
  lBlue.position.copy(c2.p).addScaledVector(c2.b, -0.5);
  lRed.intensity = 26 + Math.sin(t * 2.1) * 6;
  lBlue.intensity = 26 + Math.cos(t * 1.7) * 6;

  // gotas: só as próximas da câmera são posicionadas, o resto fica escondido
  const pos = dGeo.attributes.position.array;
  for (let i = 0; i < DROPS; i++) {
    const d = dData[i];
    d.s -= d.v * dt * (1 + boost * 2);
    let rel = d.s - cam.s;
    rel -= Math.floor(rel);
    if (rel > 0.08) { d.s = cam.s + 0.004 + Math.random() * 0.075; rel = d.s - cam.s; }
    sample(d.s, tmp);
    const ca = Math.cos(d.a), sa = Math.sin(d.a);
    pos[i * 3] = tmp.p.x + (tmp.n.x * ca + tmp.b.x * sa) * d.r;
    pos[i * 3 + 1] = tmp.p.y + (tmp.n.y * ca + tmp.b.y * sa) * d.r;
    pos[i * 3 + 2] = tmp.p.z + (tmp.n.z * ca + tmp.b.z * sa) * d.r;
  }
  dGeo.attributes.position.needsUpdate = true;
  tex.offset.x = 0;

  renderer.render(scene, camera);
}
tick();
document.documentElement.classList.add("has-3d");
