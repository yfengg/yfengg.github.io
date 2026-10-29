// Drawn "screenshots" for the monitor, one per project id.
// Used whenever a project has no "image" file in content.json.
// Each draws into a 960 x 540 canvas.
import { rng } from "../util.js";

function scanlate(g, w, h) {
  g.fillStyle = "#e9e4d8"; g.fillRect(0, 0, w, h);
  const panel = (x, y, pw, ph) => { g.fillStyle = "#fbfaf6"; g.fillRect(x, y, pw, ph); g.strokeStyle = "#222"; g.lineWidth = 3; g.strokeRect(x, y, pw, ph); };
  panel(30, 24, 330, 220); panel(380, 24, 250, 220); panel(30, 262, 600, 250);
  g.fillStyle = "#c9c2b2"; g.fillRect(60, 60, 140, 160); g.fillRect(420, 70, 170, 150); g.fillRect(70, 300, 520, 180);
  const bubble = (x, y, rw, rh, txt) => {
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, 7); g.fill();
    g.strokeStyle = "#222"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#222"; g.font = "600 22px Georgia, serif"; g.textAlign = "center"; g.fillText(txt, x, y + 7);
  };
  bubble(270, 80, 80, 40, "Hold on!"); bubble(520, 300, 110, 46, "Not like that."); bubble(230, 440, 120, 40, "We go tonight.");
  g.fillStyle = "#b3261e"; g.fillRect(660, 24, 270, 488);
  g.fillStyle = "#fff"; g.font = "600 24px Georgia, serif"; g.textAlign = "left"; g.fillText("Glossary", 684, 66);
  g.font = "20px Georgia, serif";
  ["ちょっと → hold on", "やめて → stop it", "先輩 → (keep)", "今夜 → tonight"].forEach((s, i) => g.fillText(s, 684, 110 + i * 38));
}

function heatmap(g, w, h) {
  g.fillStyle = "#120d1c"; g.fillRect(0, 0, w, h);
  const cols = 24, rows = 13, cw = w / cols, ch = h / rows, r = rng(8);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const v = Math.min(1, Math.exp(-(((x - 7) ** 2) / 18 + ((y - 6) ** 2) / 10)) + 0.7 * Math.exp(-(((x - 18) ** 2) / 8 + ((y - 4) ** 2) / 6)) + r() * 0.06);
    g.fillStyle = `hsl(${50 - v * 50}, 90%, ${12 + v * 50}%)`;
    g.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
  }
}

function citygen(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#161a3a"); sky.addColorStop(1, "#5a2f4a");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const r = rng(4);
  let x = 0;
  while (x < w) {
    const bw = 40 + r() * 70, bh = h * (0.3 + r() * 0.55);
    g.fillStyle = "#0e0f1c"; g.fillRect(x, h - bh, bw, bh);
    for (let yy = h - bh + 10; yy < h - 8; yy += 14) for (let xx = x + 8; xx < x + bw - 10; xx += 14) {
      if (r() < 0.45) { g.fillStyle = r() < 0.7 ? "#ffd38a" : "#d8fff2"; g.fillRect(xx, yy, 7, 6); }
    }
    x += bw + 2;
  }
}

function finance(g, w, h) {
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, w, h);
  g.font = "600 26px Georgia, serif"; g.textAlign = "left";
  [["Rent", 0.61], ["Groceries", 0.22], ["Transit", 0.08], ["Takeout", 0.09]].forEach(([label, v], i) => {
    const y = 80 + i * 105;
    g.fillStyle = "#333"; g.fillText(label, 40, y + 32);
    g.fillStyle = v > 0.3 ? "#b3261e" : "#3a6b8f"; g.fillRect(220, y, (w - 330) * v, 48);
    g.fillStyle = "#333"; g.fillText(Math.round(v * 100) + "%", 232 + (w - 330) * v, y + 32);
  });
}

export const ILLUSTRATIONS = { SCANLATE: scanlate, HEATMAP: heatmap, CITYGEN: citygen, FINANCE: finance };
