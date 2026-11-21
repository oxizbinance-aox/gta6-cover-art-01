// Sunset Cover Studio — GTA-style cover art maker.
// All drawing happens on canvas, offline, from files under app/ only.
// Photos are read on the user's own machine and never uploaded anywhere.

"use strict";

const $ = (id) => document.getElementById(id);
const canvas = $("coverCanvas");
const ctx = canvas.getContext("2d");

// ---------------------------------------------------------------- state

const GRADES = {
  sunset: {
    label: "Vice City Sunset",
    filter: "saturate(1.3) contrast(1.06)",
    tint: [[0, "rgba(255,150,50,0.20)"], [0.55, "rgba(255,60,110,0.16)"], [1, "rgba(120,40,200,0.24)"]],
    sun: true,
  },
  neon: {
    label: "Neon Night",
    filter: "saturate(1.5) hue-rotate(-12deg) contrast(1.12)",
    tint: [[0, "rgba(0,240,255,0.16)"], [0.5, "rgba(255,46,166,0.20)"], [1, "rgba(123,47,255,0.26)"]],
    sun: false,
  },
  golden: {
    label: "Golden Hour",
    filter: "sepia(0.32) saturate(1.35) contrast(1.06)",
    tint: [[0, "rgba(255,215,110,0.22)"], [1, "rgba(200,110,20,0.22)"]],
    sun: true,
  },
  noir: {
    label: "Noir",
    filter: "grayscale(1) contrast(1.22) brightness(1.04)",
    tint: [[0, "rgba(255,255,255,0.05)"], [1, "rgba(0,0,0,0.30)"]],
    sun: false,
  },
};

const LAYOUTS = {
  "hero-duo": { label: "Hero + Duo", panels: 3 },
  quad: { label: "Quad", panels: 4 },
  duo: { label: "Duo", panels: 2 },
  solo: { label: "Solo", panels: 1 },
};

const SIZES = {
  "1080x1080": [1080, 1080],
  "1080x1350": [1080, 1350],
  "1920x1080": [1920, 1080],
};

const state = {
  layout: "hero-duo",
  grade: "sunset",
  title: "SUNSET DRIVE",
  tagline: "One city. One night. No brakes.",
  titleColor: "#ffffff",
  size: "1080x1080",
  photos: [], // { img, name, url }
  panels: [], // { photo, scale, dx, dy } — dx/dy in fractions of panel size
  selected: 0,
};

function freshPanel(photo, index, total) {
  // Same photo in several panels still reads as a poster when each panel
  // crops a different slice of it: spread the default pan across panels.
  // A slight zoom gives the pan room to move without exposing an edge.
  const offset = total > 1 ? (index - (total - 1) / 2) * 0.18 : 0;
  return { photo, scale: total > 1 ? 1.2 : 1, dx: offset, dy: 0 };
}

function rebuildPanels() {
  const count = LAYOUTS[state.layout].panels;
  const old = state.panels;
  const next = [];
  for (let i = 0; i < count; i++) {
    if (old[i]) next.push(old[i]);
    else next.push(freshPanel(state.photos.length ? i % state.photos.length : 0, i, count));
  }
  state.panels = next;
  if (state.selected >= count) state.selected = 0;
}

// ------------------------------------------------------- panel geometry

function panelRects(layout, W, H) {
  const f = Math.round(Math.min(W, H) * 0.018); // outer frame
  const g = Math.round(Math.min(W, H) * 0.016); // gutter between panels
  const x0 = f, y0 = f, w = W - 2 * f, h = H - 2 * f;
  if (layout === "solo") return [{ x: x0, y: y0, w, h }];
  if (layout === "duo") {
    const wL = Math.round((w - g) * 0.58);
    return [
      { x: x0, y: y0, w: wL, h },
      { x: x0 + wL + g, y: y0, w: w - wL - g, h },
    ];
  }
  if (layout === "quad") {
    const cw = Math.round((w - g) / 2), ch = Math.round((h - g) / 2);
    return [
      { x: x0, y: y0, w: cw, h: ch },
      { x: x0 + cw + g, y: y0, w: w - cw - g, h: ch },
      { x: x0, y: y0 + ch + g, w: cw, h: h - ch - g },
      { x: x0 + cw + g, y: y0 + ch + g, w: w - cw - g, h: h - ch - g },
    ];
  }
  // hero-duo: one big hero on top, two small panels below
  const hHero = Math.round((h - g) * 0.62);
  const cw = Math.round((w - g) / 2);
  return [
    { x: x0, y: y0, w, h: hHero },
    { x: x0, y: y0 + hHero + g, w: cw, h: h - hHero - g },
    { x: x0 + cw + g, y: y0 + hHero + g, w: w - cw - g, h: h - hHero - g },
  ];
}

// ------------------------------------------------------------ cover draw

function drawPhotoInto(c, rect, img, transform, filter) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih) * transform.scale;
  const dw = iw * base, dh = ih * base;
  // Never pan past the photo's edge: clamp the offset to the real overflow,
  // so no empty band can ever show inside a panel.
  const maxDx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxDy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const dx = Math.max(-maxDx, Math.min(maxDx, transform.dx));
  const dy = Math.max(-maxDy, Math.min(maxDy, transform.dy));
  const px = rect.x + (rect.w - dw) / 2 + dx * rect.w;
  const py = rect.y + (rect.h - dh) / 2 + dy * rect.h;
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  c.filter = filter;
  c.drawImage(img, px, py, dw, dh);
  c.restore();
}

function drawPlaceholder(c, rect, index) {
  const grad = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, "#3a2b5c");
  grad.addColorStop(0.55, "#c94b7c");
  grad.addColorStop(1, "#ff8c42");
  c.fillStyle = grad;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.fillStyle = "rgba(255,255,255,0.85)";
  c.font = `700 ${Math.round(rect.h * 0.1)}px sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("ADD A PHOTO", rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawCover(c, W, H, st, opts) {
  const grade = GRADES[st.grade];
  const rects = panelRects(st.layout, W, H);
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#0d0b14";
  c.fillRect(0, 0, W, H);

  // 1. photos
  rects.forEach((rect, i) => {
    const p = st.panels[i] || freshPanel(0, i, rects.length);
    const photo = st.photos[p.photo];
    if (photo && photo.img) drawPhotoInto(c, rect, photo.img, p, grade.filter);
    else drawPlaceholder(c, rect, i);
  });

  // 2. grade tint, top to bottom
  const tint = c.createLinearGradient(0, 0, 0, H);
  for (const [stop, color] of grade.tint) tint.addColorStop(stop, color);
  c.fillStyle = tint;
  c.fillRect(0, 0, W, H);

  // 3. low sun for the warm grades
  if (grade.sun) {
    const sx = W * 0.78, sy = H * 0.2, sr = W * 0.1;
    const sun = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sun.addColorStop(0, "rgba(255,224,130,0.95)");
    sun.addColorStop(0.55, "rgba(255,150,80,0.55)");
    sun.addColorStop(1, "rgba(255,120,60,0)");
    c.globalCompositeOperation = "screen";
    c.fillStyle = sun;
    c.beginPath();
    c.arc(sx, sy, sr, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = "source-over";
  }

  // 4. vignette
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.34)");
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  // 5. bottom scrim + caption
  const bandH = H * 0.3;
  const scrim = c.createLinearGradient(0, H - bandH, 0, H);
  scrim.addColorStop(0, "rgba(5,2,12,0)");
  scrim.addColorStop(0.45, "rgba(5,2,12,0.55)");
  scrim.addColorStop(1, "rgba(5,2,12,0.88)");
  c.fillStyle = scrim;
  c.fillRect(0, H - bandH, W, bandH);

  const pad = W * 0.045;
  const titleSize = Math.round(W * (st.size === "1080x1350" ? 0.095 : 0.085));
  const tagSize = Math.round(W * 0.026);
  // accent bar above the title
  const bar = c.createLinearGradient(pad, 0, pad + W * 0.17, 0);
  bar.addColorStop(0, "#ffb347");
  bar.addColorStop(1, "#ff5ab0");
  c.fillStyle = bar;
  c.fillRect(pad, H - bandH * 0.62, W * 0.17, Math.max(4, H * 0.007));

  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  const titleY = H - pad - tagSize * 1.6;
  c.font = `${titleSize}px Anton, "Arial Narrow", sans-serif`;
  c.lineJoin = "round";
  c.strokeStyle = "rgba(0,0,0,0.6)";
  c.lineWidth = Math.max(3, W * 0.004);
  c.strokeText(st.title.toUpperCase(), pad, titleY);
  c.fillStyle = st.titleColor;
  c.fillText(st.title.toUpperCase(), pad, titleY);

  c.font = `600 ${tagSize}px "Segoe UI", system-ui, sans-serif`;
  c.fillStyle = "rgba(255,255,255,0.92)";
  c.fillText(st.tagline, pad, H - pad * 0.7);

  // 6. poster frame
  const f = Math.round(Math.min(W, H) * 0.018);
  c.strokeStyle = "#f8f4ff";
  c.lineWidth = f * 1.1;
  c.strokeRect(f * 0.55, f * 0.55, W - f * 1.1, H - f * 1.1);
  c.strokeStyle = "rgba(10,5,20,0.85)";
  c.lineWidth = Math.max(2, f * 0.22);
  c.strokeRect(f * 1.6, f * 1.6, W - f * 3.2, H - f * 3.2);

  // 7. selected-panel outline (preview only, never on export)
  if (opts && opts.highlight && rects[st.selected]) {
    const r = rects[st.selected];
    c.save();
    c.setLineDash([Math.max(8, W * 0.012), Math.max(6, W * 0.008)]);
    c.strokeStyle = "#ffffff";
    c.lineWidth = Math.max(3, W * 0.004);
    c.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    c.setLineDash([]);
    const label = `PANEL ${st.selected + 1}`;
    c.font = `700 ${Math.round(W * 0.022)}px sans-serif`;
    const tw = c.measureText(label).width;
    c.fillStyle = "#ff5ab0";
    c.fillRect(r.x + 6, r.y + 6, tw + 16, Math.round(W * 0.032));
    c.fillStyle = "#ffffff";
    c.textBaseline = "middle";
    c.fillText(label, r.x + 14, r.y + 6 + Math.round(W * 0.016));
    c.restore();
  }
}

// ------------------------------------------------------- preview render

function previewSize() {
  const [W, H] = SIZES[state.size];
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(W, H));
  return [Math.round(W * scale), Math.round(H * scale)];
}

function render() {
  const [pw, ph] = previewSize();
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  drawCover(ctx, pw, ph, state, { highlight: true });
  updateStatus();
}

function updateStatus() {
  const [W, H] = SIZES[state.size];
  $("sizeLine").textContent = `${W} × ${H}`;
  $("statusLine").textContent =
    `${state.photos.length} photo${state.photos.length === 1 ? "" : "s"} · ` +
    `${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label} · Panel ${state.selected + 1} selected`;
}

// ------------------------------------------------------------ photo load

function addPhotoFromURL(url, name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      state.photos.push({ img, name, url });
      refreshStrip();
      rebuildPanels();
      render();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function addPhotoFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => addPhotoFromURL(reader.result, file.name);
  reader.readAsDataURL(file);
}

function loadSampleArt() {
  if (state.photos.some((p) => p.name === "sample.svg")) return;
  addPhotoFromURL("sample.svg", "sample.svg").then((ok) => {
    if (ok) $("statusLine").textContent = "Sample art loaded — add your own photos to begin.";
  });
}

function refreshStrip() {
  const strip = $("photoStrip");
  strip.innerHTML = "";
  if (!state.photos.length) {
    const span = document.createElement("span");
    span.className = "empty";
    span.textContent = "No photos yet — add some, or use the sample art.";
    strip.appendChild(span);
    return;
  }
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement("img");
    thumb.src = photo.url;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    const inSelected = state.panels[state.selected] && state.panels[state.selected].photo === i;
    if (inSelected) thumb.classList.add("active");
    thumb.addEventListener("click", () => {
      state.panels[state.selected].photo = i;
      refreshStrip();
      refreshPanelSelect();
      render();
    });
    strip.appendChild(thumb);
  });
}

function refreshPanelSelect() {
  const sel = $("panelPhotoSelect");
  sel.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${photo.name}`;
    sel.appendChild(opt);
  });
  const current = state.panels[state.selected];
  if (current) {
    sel.value = String(current.photo);
    $("zoomSlider").value = String(Math.round(current.scale * 100));
  }
  sel.disabled = !state.photos.length;
}

// ------------------------------------------------------------ export

function renderOffscreen(sizeLabel) {
  const [W, H] = SIZES[sizeLabel];
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  drawCover(off.getContext("2d"), W, H, state, { highlight: false });
  return off;
}

function downloadPNG() {
  const off = renderOffscreen(state.size);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sunset-cover-${state.size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    $("statusLine").textContent = `Exported sunset-cover-${state.size}.png — share it anywhere.`;
  }, "image/png");
}

// Automation hook used by the maker's own screenshot tooling: returns a
// data URL of the exact PNG the app exports, at the requested post size.
function exportDataURL(sizeLabel) {
  const off = renderOffscreen(sizeLabel || state.size);
  return off.toDataURL("image/png");
}

// --------------------------------------------------------- interactions

function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
    y: ((ev.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let dragging = null;

canvas.addEventListener("pointerdown", (ev) => {
  const p = canvasPoint(ev);
  const idx = panelAt(p.x, p.y);
  if (idx < 0) return;
  state.selected = idx;
  refreshStrip();
  refreshPanelSelect();
  const panel = state.panels[idx];
  const rect = panelRects(state.layout, canvas.width, canvas.height)[idx];
  dragging = { startX: p.x, startY: p.y, dx: panel.dx, dy: panel.dy, w: rect.w, h: rect.h };
  canvas.setPointerCapture(ev.pointerId);
  render();
});

canvas.addEventListener("pointermove", (ev) => {
  if (!dragging) return;
  const p = canvasPoint(ev);
  const panel = state.panels[state.selected];
  panel.dx = dragging.dx + (p.x - dragging.startX) / dragging.w;
  panel.dy = dragging.dy + (p.y - dragging.startY) / dragging.h;
  panel.dx = Math.max(-0.6, Math.min(0.6, panel.dx));
  panel.dy = Math.max(-0.6, Math.min(0.6, panel.dy));
  render();
});

canvas.addEventListener("pointerup", () => { dragging = null; });
canvas.addEventListener("pointercancel", () => { dragging = null; });

canvas.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.scale = Math.max(1, Math.min(2.6, panel.scale * Math.exp(-ev.deltaY * 0.0012)));
  $("zoomSlider").value = String(Math.round(panel.scale * 100));
  render();
}, { passive: false });

$("zoomSlider").addEventListener("input", (ev) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.scale = Number(ev.target.value) / 100;
  render();
});

$("panelPhotoSelect").addEventListener("change", (ev) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.photo = Number(ev.target.value);
  refreshStrip();
  render();
});

$("swapBtn").addEventListener("click", () => {
  const n = state.panels.length;
  if (n < 2) return;
  const a = state.selected, b = (a + 1) % n;
  const tmp = state.panels[a];
  state.panels[a] = state.panels[b];
  state.panels[b] = tmp;
  state.selected = b;
  refreshStrip();
  refreshPanelSelect();
  render();
});

$("resetPanelBtn").addEventListener("click", () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.scale = 1;
  panel.dx = 0;
  panel.dy = 0;
  $("zoomSlider").value = "100";
  render();
});

// ------------------------------------------------------------ controls

function wireToggleButtons(containerId, attr, apply) {
  const container = $(containerId);
  container.addEventListener("click", (ev) => {
    const btn = ev.target.closest(`[data-${attr}]`);
    if (!btn) return;
    apply(btn.dataset[attr]);
    container.querySelectorAll(".active").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
}

wireToggleButtons("layoutGrid", "layout", (value) => {
  state.layout = value;
  rebuildPanels();
  refreshPanelSelect();
});

wireToggleButtons("gradeGrid", "grade", (value) => { state.grade = value; });
wireToggleButtons("sizeGrid", "size", (value) => { state.size = value; });

$("colorSwatches").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-color]");
  if (!btn) return;
  state.titleColor = btn.dataset.color;
  $("colorSwatches").querySelectorAll(".active").forEach((el) => el.classList.remove("active"));
  btn.classList.add("active");
  render();
});

$("titleInput").addEventListener("input", (ev) => {
  state.title = ev.target.value || "UNTITLED";
  render();
});
$("taglineInput").addEventListener("input", (ev) => {
  state.tagline = ev.target.value;
  render();
});

$("photoInput").addEventListener("change", (ev) => {
  for (const file of ev.target.files) addPhotoFile(file);
  ev.target.value = "";
});
$("sampleBtn").addEventListener("click", loadSampleArt);
$("exportBtn").addEventListener("click", downloadPNG);

$("shuffleBtn").addEventListener("click", () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const colors = ["#ffffff", "#ffd23e", "#ff5ab0", "#39d5ff"];
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.titleColor = colors[Math.floor(Math.random() * colors.length)];
  rebuildPanels();
  state.panels.forEach((p) => {
    if (state.photos.length > 1) p.photo = Math.floor(Math.random() * state.photos.length);
    p.scale = 1 + Math.random() * 0.5;
    p.dx = (Math.random() - 0.5) * 0.2;
    p.dy = (Math.random() - 0.5) * 0.2;
  });
  document.querySelector(`[data-layout="${state.layout}"]`).classList.add("active");
  document.querySelectorAll("#layoutGrid .active").forEach((el) => {
    if (el.dataset.layout !== state.layout) el.classList.remove("active");
  });
  document.querySelectorAll("#gradeGrid .active").forEach((el) => {
    el.classList.toggle("active", el.dataset.grade === state.grade);
  });
  document.querySelectorAll("#colorSwatches .swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.color === state.titleColor);
  });
  refreshPanelSelect();
  render();
});

// Drag files straight onto the preview to add them.
const wrap = document.querySelector(".canvas-wrap");
wrap.addEventListener("dragover", (ev) => ev.preventDefault());
wrap.addEventListener("drop", (ev) => {
  ev.preventDefault();
  for (const file of ev.dataTransfer.files) addPhotoFile(file);
});

// ------------------------------------------------------------------ boot

rebuildPanels();
refreshStrip();
refreshPanelSelect();
document.querySelector('[data-layout="hero-duo"]').classList.add("active");
document.querySelector('[data-grade="sunset"]').classList.add("active");
document.querySelector('[data-size="1080x1080"]').classList.add("active");
document.querySelector('[data-color="#ffffff"]').classList.add("active");
loadSampleArt();
render();
if (document.fonts && document.fonts.ready) {
  document.fonts.load('100px Anton').then(render).catch(() => {});
  document.fonts.ready.then(render);
}

window.SunsetCover = { state, render, exportDataURL, exportCover: renderOffscreen };
