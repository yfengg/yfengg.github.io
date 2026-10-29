// Projects: a real HTML screen laid over the 3D monitor glass and kept aligned every frame.
import * as THREE from "three";
import { el, esc } from "./dom.js";
import { ILLUSTRATIONS } from "./illustrations.js";

export function openProjects({ content, room, camera }) {
  const screen = el(`<div class="crt"><div class="inner">
      <p>C:\\WORK&gt; dir</p>
      <div class="cols"><ul></ul><div class="detail" aria-live="polite"></div></div>
      <p class="foot">ESC = put it down</p>
    </div></div>`);
  const list = screen.querySelector("ul"), detail = screen.querySelector(".detail");

  function show(i) {
    const p = content.projects[i];
    list.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", String(i === j)));
    const links = [["site", "VISIT SITE"], ["source", "SOURCE"], ["more", "READ MORE"]]
      .filter(([k]) => p.links?.[k])
      .map(([k, label]) => `<a href="${esc(p.links[k])}" target="_blank" rel="noopener">[ ${label} ]</a>`).join("");
    detail.innerHTML = `<h3>${esc(p.title)}</h3><p class="meta">${esc(p.meta)}</p><div class="links">${links}</div>
      <div class="shot"></div>
      <p>${esc(p.summary)}</p>`;
    const shot = detail.querySelector(".shot");
    const drawn = () => {
      const draw = ILLUSTRATIONS[p.id];
      if (!draw) { shot.replaceChildren(el(`<div class="none">[ NO IMAGE ]</div>`)); return; }
      const cv = el(`<canvas width="960" height="540" role="img" aria-label="Illustration of ${esc(p.title)}"></canvas>`);
      draw(cv.getContext("2d"), 960, 540);
      shot.replaceChildren(cv);
    };
    if (!p.image) return drawn();
    // a real image file, if one is set; falls back to the drawing if the file is missing
    const img = Object.assign(new Image(), { alt: `Screenshot of ${p.title}`, onerror: drawn });
    img.src = p.image;
    shot.replaceChildren(img);
  }

  content.projects.forEach((p, i) => {
    const li = el(`<li><button type="button" id="crt-${esc(p.id)}">${esc(p.id)}</button></li>`);
    li.firstElementChild.addEventListener("click", () => show(i));
    list.appendChild(li);
  });
  show(0);

  // keep the screen glued to the monitor's glass
  const corners = [0, 1, 2, 3].map(() => new THREE.Vector3());
  room.screen.geometry.computeBoundingBox();
  const { min, max } = room.screen.geometry.boundingBox;
  function onFrame() {
    [[min.x, min.y], [max.x, min.y], [max.x, max.y], [min.x, max.y]].forEach(([x, y], i) => {
      corners[i].set(x, y, 0);
      room.screen.localToWorld(corners[i]).project(camera);
    });
    const xs = corners.map((c) => (c.x * 0.5 + 0.5) * innerWidth);
    const ys = corners.map((c) => (-c.y * 0.5 + 0.5) * innerHeight);
    const left = Math.min(...xs), top = Math.min(...ys);
    Object.assign(screen.style, { left: left + "px", top: top + "px", width: Math.max(...xs) - left + "px", height: Math.max(...ys) - top + "px" });
  }
  onFrame();
  return { el: screen, clear: true, onFrame };
}
