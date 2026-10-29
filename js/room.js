// Loads the room from the .glb and adds what Blender doesn't hold:
// lights (placed at the "Hooks" empties), glows, small animations, and the street outside.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { pixelate, glow, canvasTexture } from "./util.js";
import { createStreet } from "./city.js";

export async function loadRoom(url, objectsConfig) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#090b1a");
  scene.fog = new THREE.FogExp2("#0c0f22", 0.04);

  const gltf = await new GLTFLoader().loadAsync(url);
  const room = gltf.scene;
  scene.add(room);

  room.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = !o.material.transparent;
    o.receiveShadow = true;
    for (const key of ["map", "emissiveMap"]) if (o.material[key]) pixelate(o.material[key]);
  });

  // Hooks are empties in the .glb: move them in Blender and the lights/camera follow.
  const hook = (name, fallback) => {
    const o = room.getObjectByName(name);
    if (o) return o.getWorldPosition(new THREE.Vector3());
    console.warn(`Hook "${name}" not found in the model, using a default position.`);
    return new THREE.Vector3(...fallback);
  };
  const seat = hook("CameraSeat", [0.08, 1.3, 0.66]);
  const look = hook("CameraLook", [0.14, 1.16, -1.0]);

  // ---- named parts the code animates or needs ----
  const fanBlades = room.getObjectByName("FanBlades");
  const fanHead = room.getObjectByName("FanHead");
  const rainGlass = room.getObjectByName("RainGlass");
  const screen = room.getObjectByName("Screen");
  showTodayOnCalendar(room);

  // ---- lights ----
  scene.add(new THREE.HemisphereLight("#3a4470", "#1a1410", 0.32));

  const lamp = new THREE.SpotLight("#ffc278", 4.2, 3.5, 0.9, 0.55, 2);
  lamp.position.copy(hook("LampBulb", [0.45, 1.18, -0.7]));
  lamp.target.position.copy(hook("LampTarget", [0.15, 0.75, -0.55]));
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0006;
  lamp.shadow.camera.near = 0.05;
  scene.add(lamp, lamp.target);
  glow(scene, "#ffcf87", 0.35, 0.9, lamp.position);

  const point = (name, fallback, color, intensity, distance) => {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.copy(hook(name, fallback));
    scene.add(l);
    return l;
  };
  const shrine = point("ShrineGlow", [-1.18, 1.9, -0.78], "#ff4a2a", 1.1, 2.6);
  glow(scene, "#ff3a20", 0.3, 0.6, shrine.position.clone().add(new THREE.Vector3(-0.08, -0.02, 0)));
  point("BoardFill", [-0.62, 1.95, -0.62], "#ffbd7a", 0.8, 2.2);
  if (screen) { // soft spill from the monitor so its case reads up close
    const spill = new THREE.PointLight("#cfeedd", 0.18, 1.2, 2);
    spill.position.copy(screen.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.05, 0.35));
    scene.add(spill);
  }
  const neonPink = point("NeonPink", [-0.4, 1.9, -2.2], "#ff3d8a", 3.2, 5);
  point("NeonBlue", [1.3, 1.3, -2.4], "#38d8ff", 2.4, 5);


  const street = createStreet(scene);

  // ---- clickable objects, as listed in content.json "objects" ----
  const clickables = [];
  for (const [name, cfg] of Object.entries(objectsConfig)) {
    let target = room.getObjectByName(name);
    if (name === "Window") target = makeWindowHitbox(scene, hook("Window", [0.35, 1.52, -1.12]));
    if (!target) { console.warn(`Clickable "${name}" not found in the model.`); continue; }
    // give clickables their own materials so hover highlighting doesn't light up shared ones
    target.traverse((m) => {
      if (m.isMesh && m.material.emissive) { m.material = m.material.clone(); m.userData.baseEmissive = m.material.emissive.clone(); }
    });
    clickables.push({ name, object: target, ...cfg });
  }

  return {
    scene, seat, look, screen, clickables,
    regenerateStreet: street.regenerate,
    update(t, dt) {
      street.update(t, dt);
      if (fanBlades) fanBlades.rotation.z -= dt * 22;
      if (fanHead) fanHead.rotation.y = Math.sin(t * 0.5) * 0.6;
      if (rainGlass?.material.map) rainGlass.material.map.offset.y = (t * 0.03) % 1;
      neonPink.intensity = 3.2 + Math.sin(t * 1.3) * 0.4;
      shrine.intensity = 1.1 + Math.sin(t * 3.1) * 0.05;
    }
  };
}

// The tear-off calendar on the right wall shows the visitor's date.
// It repaints the calendar's picture, so the page in Blender can say anything.
const MONTHS_ZH = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
function showTodayOnCalendar(room) {
  let page = null;
  room.traverse((o) => { if (!page && o.isMesh && o.name.startsWith("Calendar")) page = o; });
  if (!page) return;
  const now = new Date();
  const tex = canvasTexture(48, 64, (g, w) => {
    g.fillStyle = "#f1ece0"; g.fillRect(0, 0, w, 64);
    g.fillStyle = "#c22c22"; g.fillRect(0, 0, w, 14);
    g.textAlign = "center";
    g.fillStyle = "#f1ece0"; g.font = "900 11px 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif";
    g.fillText(MONTHS_ZH[now.getMonth()], w / 2, 11);
    g.fillStyle = "#c22c22"; g.font = "bold 30px Georgia, serif";
    g.fillText(String(now.getDate()), w / 2, 46);
    g.fillStyle = "#3a3a3a"; g.fillRect(8, 52, 32, 1); g.fillRect(12, 56, 24, 1);
  });
  page.material = page.material.clone();
  page.material.map = tex;
}

// The window has no single mesh to click, so an invisible pane stands in for it.
function makeWindowHitbox(scene, at) {
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
  pane.position.copy(at);
  pane.name = "WindowHitbox";
  scene.add(pane);
  return pane;
}