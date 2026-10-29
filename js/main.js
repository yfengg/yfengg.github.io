// Starts everything: reads content.json, loads the room, then runs the render loop.
import * as THREE from "three";
import { loadRoom } from "./room.js";
import { createRig } from "./rig.js";
import { createUI } from "./ui.js";

const MODEL = "assets/models/kowloon-room.glb";
const PIXEL_SIZE = 3; // each rendered pixel covers 3x3 screen pixels
const HIGHLIGHT = new THREE.Color("#3d2a0e");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("view");
const loading = document.getElementById("loading");

async function start() {
  const content = await (await fetch("content.json")).json();
  document.getElementById("signZh").textContent = content.nameZh;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(1);

  // neon signs are drawn with this font, so wait for it (but not forever)
  await Promise.race([document.fonts.load("900 22px 'Noto Sans TC'"), new Promise((r) => setTimeout(r, 2500))]);

  const room = await loadRoom(MODEL, content.objects);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.02, 60);
  const rig = createRig(camera, room);

  let focused = null, hovered = null;
  const ui = createUI({ content, room, camera, onPutDown: putDown });
  ui.buildIndex(pickUp);

  function pickUp(item) {
    const again = focused === item;
    focused = item;
    setHover(null);
    if (item.view === "city") room.regenerateStreet();
    if (again && item.view === "city") return;
    rig.focus(item);
    ui.pickUp(item, item.view === "projects" ? 750 : 420);
  }
  function putDown() { focused = null; rig.focus(null); ui.close(); }

  // ---- hover and click on 3D objects ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(room.clickables.map((c) => c.object), true)[0];
    if (!hit) return null;
    return room.clickables.find((c) => c.object === hit.object || c.object.getObjectById(hit.object.id)) || null;
  }
  function setHover(item, x, y) {
    if (hovered !== item) {
      const paint = (it, on) => it?.object.traverse((m) => {
        if (m.isMesh && m.userData.baseEmissive) m.material.emissive.copy(m.userData.baseEmissive).add(on ? HIGHLIGHT : new THREE.Color(0));
      });
      paint(hovered, false); paint(item, true);
      hovered = item;
      canvas.classList.toggle("hot", !!item);
    }
    ui.setTip(item, x, y);
  }
  canvas.addEventListener("pointermove", (e) => {
    rig.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    if (!focused) setHover(pick(e.clientX, e.clientY), e.clientX, e.clientY);
  });
  canvas.addEventListener("pointerleave", () => setHover(null));
  canvas.addEventListener("click", (e) => {
    const item = pick(e.clientX, e.clientY);
    if (item) pickUp(item); else if (focused) putDown();
  });

  // ---- size and loop ----
  function resize() {
    renderer.setSize(Math.max(1, Math.floor(innerWidth / PIXEL_SIZE)), Math.max(1, Math.floor(innerHeight / PIXEL_SIZE)), false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.8 ? 82 : camera.aspect < 1.2 ? 70 : 58;
    camera.updateProjectionMatrix();
    if (focused) rig.focus(focused);
  }
  addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const still = focused && (focused.view === "projects" || ui.isOpen);
    rig.update(t, dt, still, reduceMotion);
    room.update(t, reduceMotion ? dt * 0.3 : dt);
    renderer.render(room.scene, camera);
    ui.onFrame();
  });
  loading.classList.add("gone");
}

start().catch((err) => {
  console.error(err);
  document.getElementById("loadingText").innerHTML =
    `The room couldn't load here.<br>Everything is still in the index, bottom right.`;
  document.getElementById("indexBtn").addEventListener("click", () => document.getElementById("loading").classList.add("gone"), { once: true });
  loading.style.pointerEvents = "none";
  loading.style.background = "rgba(10,11,18,0.92)";
  fallbackIndex();
});

// If WebGL or the model fails, still offer plain links.
async function fallbackIndex() {
  try {
    const content = await (await fetch("content.json")).json();
    const nav = document.getElementById("index");
    nav.innerHTML = `<h2>作品 · PROJECTS</h2>` + content.projects.map((p) =>
      `<a href="${p.links.site || p.links.source}" target="_blank" rel="noopener"><span class="t">${p.title}</span></a>`).join("") +
      `<p class="mail">${content.contact.email}</p>`;
    document.getElementById("indexBtn").onclick = () => { nav.hidden = !nav.hidden; };
  } catch { /* nothing more we can do */ }
}
