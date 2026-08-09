// ============================================================================
// SHARED UTILITIES — used by index.html and admin.html
// ============================================================================

/* ---------- Toast ---------- */
function toast(msg, type = "ok") {
  let host = document.getElementById("toast");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast-item ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------- PCB trace decorative SVG (signature background element) ---------- */
function paintPcbTraces(containerSelector = ".pcb-trace-overlay") {
  const host = document.querySelector(containerSelector);
  if (!host) return;
  const w = 1600, h = 900;
  const paths = [];
  const rng = (seed => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(42);
  for (let i = 0; i < 9; i++) {
    let x = rng() * w, y = rng() * h;
    let d = `M${x.toFixed(0)},${y.toFixed(0)}`;
    const segs = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < segs; s++) {
      const horiz = rng() > 0.5;
      const len = 60 + rng() * 160;
      if (horiz) x += (rng() > 0.5 ? 1 : -1) * len; else y += (rng() > 0.5 ? 1 : -1) * len;
      d += ` L${x.toFixed(0)},${y.toFixed(0)}`;
    }
    paths.push(`<path d="${d}" />`);
    paths.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4" class="pad" />`);
  }
  host.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style="position:absolute;inset:0;">
      <g fill="none" stroke="#22c58b" stroke-width="1.2" opacity="0.14">${paths.join("")}</g>
      <g fill="#35d4e8" opacity="0.16">${paths.filter(p=>p.includes('circle')).join("")}</g>
    </svg>`;
}

/* ---------- Mobile nav toggle ---------- */
function initNavToggle() {
  const btn = document.getElementById("navToggle");
  const links = document.querySelector(".nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
}

/* ---------- Highlight active nav link on scroll ---------- */
function initScrollSpy() {
  const sections = [...document.querySelectorAll("main section[id]")];
  const links = [...document.querySelectorAll(".nav-links a")];
  if (!sections.length || !links.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = links.find(l => l.getAttribute("href") === `#${entry.target.id}`);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px" });
  sections.forEach(s => obs.observe(s));
}

/* ---------- Supabase Storage upload helper ---------- */
async function uploadToStorage(file, folder = "misc") {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/* ---------- Command palette (Ctrl/Cmd + K) ---------- */
function initCommandPalette(items) {
  const overlay = document.getElementById("cmdk-overlay");
  const input = document.getElementById("cmdk-input");
  const results = document.getElementById("cmdk-results");
  if (!overlay || !input || !results) return;

  function render(filter = "") {
    const f = filter.toLowerCase();
    const matches = items.filter(i => i.label.toLowerCase().includes(f));
    results.innerHTML = matches.length
      ? matches.map((i, idx) => `<div class="cmdk-item${idx===0?' sel':''}" data-href="${i.href}"><span>${i.label}</span><span class="mono" style="opacity:.5">${i.group||''}</span></div>`).join("")
      : `<div class="cmdk-item" style="cursor:default">No results</div>`;
    results.querySelectorAll(".cmdk-item[data-href]").forEach(el => {
      el.addEventListener("click", () => { window.location.href = el.dataset.href; close(); });
    });
  }
  function open() { overlay.classList.add("open"); input.value = ""; render(); setTimeout(() => input.focus(), 10); }
  function close() { overlay.classList.remove("open"); }

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); overlay.classList.contains("open") ? close() : open(); }
    if (e.key === "Escape") close();
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const sel = results.querySelector(".cmdk-item.sel"); if (sel) sel.click(); }
  });
}

/* ---------- Escape text for safe HTML insertion ---------- */
function esc(str = "") {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Format date ---------- */
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

/* ---------- Simple skeleton loader block ---------- */
function skeletonCards(n = 3, heightClass = "220px") {
  return Array.from({ length: n }).map(() => `<div class="skel" style="height:${heightClass}; border-radius:14px;"></div>`).join("");
}
