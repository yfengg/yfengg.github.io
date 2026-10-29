// Art: a sketchbook you flip through. Pages are normal HTML at screen resolution,
// so the art stays sharp while the room around it stays pixelated.
//
// How a piece sits on its page is decided from the image's shape (or "layout" in content.json):
//   bleed  - the art runs to the page edges (when its shape is close to the page's)
//   plate  - the art sits inside the page with a paper margin (never cropped)
//   spread - wide art runs across both pages
import { el, esc, probeImage } from "./dom.js";

const PAGE_RATIO = 3 / 4;          // width / height of one page
const BLEED_TOLERANCE = 0.12;      // how far off the page shape a piece can be and still bleed
const SPREAD_FROM = 1.3;           // pieces wider than this run across both pages

function layoutFor(item, size) {
  if (item.layout && item.layout !== "auto") return item.layout;
  if (!size) return "missing";
  const ratio = size.w / size.h;
  if (ratio >= SPREAD_FROM) return "spread";
  return Math.abs(ratio - PAGE_RATIO) / PAGE_RATIO <= BLEED_TOLERANCE ? "bleed" : "plate";
}

export function openArt({ content, openFull }) {
  const wrap = el(`<div class="bookwrap obj">
    <div class="bookstage"><div class="book" id="book"></div></div>
    <div class="bookctl">
      <button type="button" class="tagbtn" id="bookPrev"><span class="zh">上一頁</span><span class="en">PREV</span></button>
      <button type="button" class="tagbtn" id="bookNext"><span class="zh">下一頁</span><span class="en">NEXT</span></button>
    </div>
  </div>`);
  let flip = null;

  async function mounted() {
    const sizes = await Promise.all(content.art.map((a) => probeImage(a.file)));
    const book = wrap.querySelector("#book");
    const pages = [];
    const page = (cls, html, hard) => {
      const p = el(`<div class="pg ${cls}"${hard ? ' data-density="hard"' : ""}><div class="in">${html}</div></div>`);
      pages.push(p);
      return p;
    };

    page("cover", `<div class="label"><b>畫簿</b><span>sketchbook · ${esc(content.name)}</span></div>`, true);
    page("l", `<div class="text"><h3><span class="zh">畫簿</span>sketchbook</h3>
      <p class="notes">Digital paintings, sketches and studies. Flip with the corners, the buttons below, or the arrow keys.</p></div>`);
    const contents = page("r", `<div class="text"><h3>contents</h3><ol class="contents"></ol></div>`);

    content.art.forEach((a, i) => {
      const layout = layoutFor(a, sizes[i]);
      const n = 3 + i * 2;
      const caption = `<h3>${esc(a.title)}</h3><p class="medium">${esc(a.medium)}</p>${a.note ? `<p class="notes">${esc(a.note)}</p>` : ""}`;
      const fullBtn = `<button type="button" class="tagbtn viewfull" data-art="${i}"><span class="zh">看大圖</span><span class="en">FULL SIZE</span></button>`;
      const img = `<img src="${esc(a.file)}" alt="${esc(a.title)}, ${esc(a.medium)}">`;

      if (layout === "spread") {
        page("spread l", `<div class="art">${img}</div><div class="caption">${caption}${fullBtn}</div>`);
        page("spread r", `<div class="art">${img}</div>`);
      } else {
        page("l", `<div class="text">${caption}${fullBtn}</div><span class="num">${n}</span>`);
        page(`r ${layout}`, layout === "missing"
          ? `<div class="missing">${esc(a.file)}<br>not found yet</div>`
          : `<div class="art">${img}</div>`);
      }
      const li = el(`<li><button type="button" data-page="${n}">${esc(a.title)}<i>${n}</i></button></li>`);
      contents.querySelector("ol").appendChild(li);
    });
    page("cover", "", true);

    pages.forEach((p) => book.appendChild(p));
    flip = new St.PageFlip(book, {
      width: 450, height: 600, size: "stretch",
      minWidth: 260, maxWidth: 1200, minHeight: 346, maxHeight: 1600,
      showCover: true, usePortrait: true, mobileScrollSupport: false,
      maxShadowOpacity: 0.4, flippingTime: 650
    });
    flip.loadFromHTML(pages);

    book.addEventListener("click", (e) => {
      const go = e.target.closest("[data-page]");
      if (go) flip.flip(+go.dataset.page);
      const full = e.target.closest("[data-art]");
      if (full) {
        const a = content.art[+full.dataset.art];
        openFull(a.full || a.file, a.title, a.medium);
      }
    });
  }

  wrap.querySelector("#bookPrev").addEventListener("click", () => flip?.flipPrev());
  wrap.querySelector("#bookNext").addEventListener("click", () => flip?.flipNext());
  const keys = (e) => {
    if (e.key === "ArrowRight") flip?.flipNext();
    if (e.key === "ArrowLeft") flip?.flipPrev();
  };
  addEventListener("keydown", keys);

  return {
    el: wrap,
    mounted,
    dispose() { removeEventListener("keydown", keys); flip?.destroy(); }
  };
}
