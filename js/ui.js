// The paper layer on top of the room: hover tag, index, picked-up views, full-size art.
import { openProjects } from "./views/crt.js";
import { openArt } from "./views/sketchbook.js";
import { openContact, openAbout, openCity } from "./views/paper.js";
import { el, esc } from "./views/dom.js";

const VIEWS = { projects: openProjects, art: openArt, contact: openContact, about: openAbout, city: openCity };

const $ = (id) => document.getElementById(id);
const held = $("held"), full = $("full"), putdown = $("putdown"), tip = $("tip");
const indexNav = $("index"), indexBtn = $("indexBtn"), hint = $("hint");

export function createUI({ content, room, camera, onPutDown }) {
  let current = null, timer = 0;

  function openFull(src, title, medium) {
    full.replaceChildren(
      Object.assign(new Image(), { src, alt: `${title}, ${medium}` }),
      el(`<p>${esc(title.toUpperCase())} · ${esc(medium.toUpperCase())} · CLICK ANYWHERE TO CLOSE</p>`)
    );
    full.hidden = false;
  }
  function closeFull() { full.hidden = true; full.replaceChildren(); }
  full.addEventListener("click", closeFull);

  // show the picked-up version of an object, after the camera has had a moment to lean in
  function pickUp(item, delay) {
    close();
    hint.classList.add("gone");
    indexNav.hidden = true; indexBtn.setAttribute("aria-expanded", "false");
    timer = setTimeout(() => {
      const view = VIEWS[item.view]?.({ content, room, camera, openFull });
      if (!view) return;
      current = view;
      held.className = view.clear ? "clear" : "";
      held.replaceChildren(view.el);
      held.hidden = false; putdown.hidden = false;
      requestAnimationFrame(() => held.classList.add("on"));
      view.mounted?.();
    }, delay);
  }
  function close() {
    clearTimeout(timer);
    current?.dispose?.();
    current = null;
    held.hidden = true; held.classList.remove("on"); held.replaceChildren();
    putdown.hidden = true; closeFull();
  }
  held.addEventListener("click", (e) => { if (e.target === held) onPutDown(); });
  putdown.addEventListener("click", onPutDown);
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!full.hidden) closeFull(); else onPutDown();
  });

  function setTip(item, x, y) {
    tip.hidden = !item;
    if (item) {
      tip.innerHTML = `<span class="zh">${esc(item.zh)}</span><span class="en">${esc(item.en)}</span>`;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    }
  }

  // plain-text index: the quick way in for anyone who doesn't want to explore
  function buildIndex(onPick) {
    indexNav.replaceChildren(el(`<h2>桌上 · ON THE DESK</h2>`));
    room.clickables.forEach((item, i) => {
      const b = el(`<button type="button" id="idx-${i}"><span class="zh">${esc(item.zh)}</span><span class="en">${esc(item.en)}</span></button>`);
      b.addEventListener("click", () => onPick(item));
      indexNav.appendChild(b);
    });
    indexNav.appendChild(el(`<h2>作品 · PROJECTS</h2>`));
    content.projects.forEach((p) => {
      const url = p.links.site || p.links.source;
      indexNav.appendChild(el(`<a href="${esc(url)}" target="_blank" rel="noopener"><span class="t">${esc(p.title)} <small>${p.links.site ? "site" : "GitHub"}</small></span></a>`));
    });
    indexNav.appendChild(el(`<p class="mail">${esc(content.contact.email)}</p>`));
  }
  indexBtn.addEventListener("click", () => {
    indexNav.hidden = !indexNav.hidden;
    indexBtn.setAttribute("aria-expanded", String(!indexNav.hidden));
  });
  setTimeout(() => hint.classList.add("gone"), 7000);

  return {
    pickUp, close, setTip, buildIndex,
    get isOpen() { return !held.hidden; },
    onFrame() { current?.onFrame?.(); }
  };
}
