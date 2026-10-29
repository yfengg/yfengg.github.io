// The name card (contact), the pinned note (about) and the window caption (city).
import { el, esc } from "./dom.js";

export function openContact({ content }) {
  const c = content.contact;
  const wrap = el(`<div class="cardwrap">
    <div class="card obj" style="--r:-2.5deg">
      <div class="chop" aria-hidden="true">${esc(content.nameZh)}</div>
      <p class="cname">${esc(content.name.toUpperCase())}</p>
      <p class="crole">${c.role.map(esc).join("<br>")}</p>
      <dl>
        <div><dt>電郵</dt><dd id="cardEmail">${esc(c.email)}</dd></div>
        <div><dt>GitHub</dt><dd><a href="${esc(c.github)}" target="_blank" rel="noopener">${esc(c.github.replace(/^https?:\/\//, ""))}</a></dd></div>
      </dl>
    </div>
    <button type="button" class="tagbtn" id="copyEmail"><span class="zh">抄低</span><span class="en">COPY EMAIL</span></button>
  </div>`);
  wrap.querySelector("#copyEmail").addEventListener("click", async (e) => {
    const label = e.currentTarget.querySelector(".en");
    try { await navigator.clipboard.writeText(c.email); label.textContent = "COPIED"; }
    catch { getSelection().selectAllChildren(wrap.querySelector("#cardEmail")); label.textContent = "SELECTED, PRESS CTRL+C"; }
    setTimeout(() => { label.textContent = "COPY EMAIL"; }, 2200);
  });
  return { el: wrap };
}

export function openAbout({ content }) {
  const a = content.about;
  const wrap = el(`<div class="noteobj obj" style="--r:0.8deg">
    <figure class="polaroid"><div class="ph"><span aria-hidden="true">${esc(content.nameZh)}</span></div><figcaption>${esc(a.photoCaption)}</figcaption></figure>
    <div class="note"><span class="pinhead" aria-hidden="true"></span>${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  </div>`);
  const img = new Image();
  img.alt = `Photo of ${content.name}`;
  img.onload = () => wrap.querySelector(".ph").replaceChildren(img);
  img.src = a.photo;
  return { el: wrap };
}

export function openCity() {
  const tag = el(`<div class="wintag"><b>隨機城市 · Random City Generator</b><span>this whole street is generated. click the glass for a new one.</span></div>`);
  return { el: tag, clear: true };
}
