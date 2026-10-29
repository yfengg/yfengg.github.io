// The street outside the window: the Random City Generator, plus rain and a plane on approach.
// Everything here is generated, so it lives in code rather than in the .glb.
import * as THREE from "three";
import { rng, canvasTexture, glow } from "./util.js";

const SIGNS = ["大押", "酒家", "冰室", "旅館", "藥房", "麻雀", "茶餐廳", "金舖"];
const NEON = ["#ff3d6e", "#33e6ff", "#ffcf3a", "#b06bff", "#ff8a3d"];
const WINDOW_LIGHTS = ["#ffd38a", "#ffd38a", "#d8fff2", "#ffb26b", "#f0f4ff"];

// Rows of buildings, nearest first. z is how far behind the window wall each row stands.
const ROWS = [
  { z: -3.0, h: [5, 9], w: [1.0, 2.2], lit: 0.42, base: "#1b1a24", signs: true },
  { z: -5.8, h: [6, 11], w: [1.2, 2.6], lit: 0.36, base: "#181826", signs: true },
  { z: -10, h: [7, 13], w: [1.6, 3.2], lit: 0.3, base: "#15172a", signs: false },
  { z: -17, h: [8, 15], w: [2, 4], lit: 0.25, base: "#12142a", signs: false }
];

export function createStreet(scene) {
  const city = new THREE.Group();
  city.name = "Street";
  scene.add(city);
  let neons = [];

  function build(seed) {
    city.traverse((o) => { if (o.material) { o.material.map?.dispose(); o.material.dispose(); } o.geometry?.dispose(); });
    city.clear();
    neons = [];
    const r = rng(seed);

    for (const row of ROWS) {
      let x = -9 + r() * 1.5;
      while (x < 9) {
        const bw = row.w[0] + r() * (row.w[1] - row.w[0]);
        const bh = row.h[0] + r() * (row.h[1] - row.h[0]);
        const cols = Math.max(2, Math.round(bw * 3.2));
        const floors = Math.max(4, Math.round(bh * 2.6));

        const facade = canvasTexture(cols * 8, floors * 8, (g, w, h) => {
          g.fillStyle = row.base; g.fillRect(0, 0, w, h);
          for (let fy = 0; fy < floors; fy++) for (let fx = 0; fx < cols; fx++) {
            g.fillStyle = r() < row.lit ? WINDOW_LIGHTS[Math.floor(r() * WINDOW_LIGHTS.length)] : "#0a0b12";
            g.fillRect(fx * 8 + 1, fy * 8 + 2, 6, 4);
            if (r() < 0.12) { g.fillStyle = "#3e3c46"; g.fillRect(fx * 8 + 2, fy * 8 + 6, 4, 2); } // AC unit
          }
        });
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(bw - 0.06, bh, 1.6),
          new THREE.MeshStandardMaterial({ map: facade, emissiveMap: facade, emissive: "#ffffff", emissiveIntensity: 0.9, color: "#777777", roughness: 0.9 })
        );
        building.position.set(x + bw / 2, -3 + bh / 2, row.z - 0.8);
        city.add(building);

        if (r() < 0.6) { // rooftop water tank
          const tank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: "#1a1a22" }));
          tank.position.set(x + bw * r(), -3 + bh + 0.15, row.z - 0.6);
          city.add(tank);
        }

        if (row.signs && r() < 0.75) neons.push(makeSign(city, r, x + bw - 0.1, 0.5 + r() * 3.2, row.z + 0.15));
        x += bw;
      }
    }
  }

  function makeSign(parent, r, x, y, z) {
    const word = SIGNS[Math.floor(r() * SIGNS.length)];
    const color = NEON[Math.floor(r() * NEON.length)];
    const tex = canvasTexture(32, 32 * word.length, (g, w, h) => {
      g.fillStyle = "#0b0507"; g.fillRect(0, 0, w, h);
      g.strokeStyle = color; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
      g.fillStyle = color; g.font = "900 22px 'Noto Sans TC', sans-serif"; g.textAlign = "center";
      [...word].forEach((ch, i) => g.fillText(ch, w / 2, 25 + i * 32));
    });
    const height = 0.42 * word.length;
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, height, 0.06),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: "#ffffff", emissiveIntensity: 2.2, color: "#222222" })
    );
    sign.position.set(x, y, z);
    parent.add(sign);
    const halo = glow(parent, color, 1.6 + height, 0.28, new THREE.Vector3(x, y, z + 0.1));
    return { sign, halo, flicky: r() < 0.3, phase: r() * 10 };
  }

  // rain falling past the window
  const DROPS = 700;
  const rain = new Float32Array(DROPS * 6);
  const rr = rng(7);
  for (let i = 0; i < DROPS; i++) {
    const x = -6 + rr() * 12, y = -3 + rr() * 11, z = -1.5 - rr() * 7;
    rain.set([x, y, z, x, y - 0.18, z], i * 6);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rain, 3));
  scene.add(new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: "#9fb8d8", transparent: true, opacity: 0.45 })));

  // a plane coming in low every ~22 seconds
  const plane = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: "#2a2a35" });
  plane.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.14), body));
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 1.1), body);
  wing.position.x = 0.05;
  plane.add(wing);
  const beacon = glow(plane, "#ff3b3b", 0.6, 0.9, new THREE.Vector3(-0.6, 0, 0));
  glow(plane, "#ffffff", 0.4, 0.7, new THREE.Vector3(0.6, 0, 0));
  scene.add(plane);

  build(12);

  return {
    regenerate: () => build(Math.floor(Math.random() * 1e6)),
    update(t, dt) {
      const p = rainGeo.attributes.position.array;
      for (let i = 0; i < DROPS; i++) {
        const k = i * 6;
        p[k + 1] -= dt * 7; p[k + 4] -= dt * 7;
        if (p[k + 4] < -3) { p[k + 1] += 11; p[k + 4] += 11; }
      }
      rainGeo.attributes.position.needsUpdate = true;

      for (const n of neons) {
        if (!n.flicky) continue;
        const on = Math.sin(t * 13 + n.phase) > -0.85 || Math.sin(t * 2.1 + n.phase) > 0.2;
        n.sign.material.emissiveIntensity = on ? 2.2 : 0.2;
        n.halo.material.opacity = on ? 0.28 : 0.03;
      }

      const cycle = (t % 22) / 22;
      plane.visible = cycle < 0.45;
      plane.position.set(14 - (cycle / 0.45) * 30, 7.5 - (cycle / 0.45) * 2.2, -14);
      beacon.material.opacity = Math.sin(t * 9) > 0.3 ? 0.9 : 0;
    }
  };
}
