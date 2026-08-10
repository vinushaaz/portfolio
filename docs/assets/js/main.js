// ============================================================================
// PUBLIC PORTFOLIO — reads from Supabase, renders every section.
// Nothing here is hardcoded content; only fallback placeholders when empty.
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  paintPcbTraces();
  initNavToggle();
  initScrollSpy();
  document.getElementById("footYear").textContent = new Date().getFullYear();
  loadEverything();
  bumpVisitorCount();
});

async function bumpVisitorCount() {
  try { await sb.rpc("increment_visitor_count"); } catch (e) { /* function optional */ }
}

async function loadEverything() {
  await Promise.all([
    loadProfile(),
    loadAbout(),
    loadProjects(),
    loadSkills(),
    loadCertificates(),
    loadNotes(),
    loadLearning(),
    loadGallery(),
    loadSettings(),
  ]);
  initCommandPalette([
    { label: "Dashboard", href: "#home", group: "Section" },
    { label: "About", href: "#about", group: "Section" },
    { label: "Experience", href: "#experience", group: "Section" },
    { label: "Projects", href: "#projects", group: "Section" },
    { label: "Skills", href: "#skills", group: "Section" },
    { label: "Certifications", href: "#certifications", group: "Section" },
    { label: "Tech Notes", href: "#notes", group: "Section" },
    { label: "Learning", href: "#learning", group: "Section" },
    { label: "Gallery", href: "#gallery", group: "Section" },
    { label: "Résumé", href: "#resume", group: "Section" },
    { label: "Contact", href: "#contact", group: "Section" },
    { label: "Admin dashboard", href: "admin.html", group: "Owner" },
  ]);
}

/* ---------------------------------------------------------------------- */
async function loadProfile() {
  const { data: p } = await sb.from("profile").select("*").eq("id", 1).single();
  if (!p) return;
  document.getElementById("pageTitle").textContent = `${p.name || "Portfolio"} — ${p.role || ""}`;
  document.getElementById("navBrand").textContent = (p.name || "PORTFOLIO").toUpperCase();
  if (p.logo_url) {
    document.getElementById("brandDot").outerHTML = `<img src="${p.logo_url}" alt="" style="width:22px; height:22px; border-radius:6px; object-fit:cover;">`;
  }
  document.getElementById("heroName").innerHTML = p.name ? esc(p.name) : "Your Name";
  document.getElementById("heroRole").textContent = p.role || "Embedded Systems & Industrial IoT Engineer";
  document.getElementById("heroBio").textContent = p.bio || "Add a short bio from the admin dashboard.";
  document.getElementById("heroStatus").textContent = p.status || "Available for opportunities";
  document.getElementById("scopeStatus").textContent = (p.status || "ONLINE").toUpperCase().slice(0, 16);
  if (p.avatar_url) document.getElementById("heroAvatar").src = p.avatar_url;

  const socials = [
    { key: "github", label: "GH" }, { key: "linkedin", label: "in" },
    { key: "leetcode", label: "LC" }, { key: "hackerrank", label: "HR" },
    { key: "email", label: "@", prefix: "mailto:" }, { key: "phone", label: "☎", prefix: "tel:" },
    { key: "portfolio_url", label: "🌐" },
  ];
  const socialsHost = document.getElementById("heroSocials");
  const extraLinks = (p.extra_links || []).filter(l => l.url);
  socialsHost.innerHTML =
    socials.filter(s => p[s.key]).map(s =>
      `<a class="social-btn mono" href="${s.prefix || ""}${esc(p[s.key])}" target="_blank" rel="noopener">${s.label}</a>`
    ).join("") +
    extraLinks.map(l =>
      `<a class="social-btn mono" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label||"")}">${esc((l.label||"?").slice(0,2).toUpperCase())}</a>`
    ).join("");

  // Resume section
  if (p.resume_url) {
    document.getElementById("resumePreviewBtn").href = p.resume_url;
    document.getElementById("resumeDownloadBtn").href = p.resume_url;
    document.getElementById("resumeUpdated").textContent = "Available — preview or download below.";
    document.getElementById("resumeBtn").href = p.resume_url;
    document.getElementById("resumeBtn").removeAttribute("download");
    document.getElementById("resumeBtn").setAttribute("target", "_blank");
  }

  // Contact card
  const contactRows = [
    ["Email", p.email, `mailto:${p.email}`],
    ["Phone", p.phone, `tel:${p.phone}`],
    ["LinkedIn", p.linkedin, p.linkedin],
    ["GitHub", p.github, p.github],
    ["LeetCode", p.leetcode, p.leetcode],
    ["Portfolio", p.portfolio_url, p.portfolio_url],
    ...extraLinks.map(l => [l.label || "Link", l.url, l.url]),
  ].filter(r => r[1]);
  document.getElementById("contactCard").innerHTML = `<h4 class="font-display" style="margin-top:0;">Reach out</h4>` +
    (contactRows.length ? contactRows.map(([label, val, href]) =>
      `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--line-soft); font-size:13.5px;">
        <span class="mono" style="color:var(--text-faint)">${label}</span>
        <a href="${esc(href)}" target="_blank" style="color:var(--emerald-brt)">${esc(val)}</a>
      </div>`).join("")
      : `<p class="card-desc">Contact details will appear here once added in the admin dashboard.</p>`);
  document.getElementById("contactLocation").textContent = p.location || "Location not set.";
}

/* ---------------------------------------------------------------------- */
async function loadAbout() {
  const { data: a } = await sb.from("about").select("*").eq("id", 1).single();
  if (!a) return;
  document.getElementById("aboutContent").innerHTML = a.content_html || `<p class="card-desc">Write your story from the admin dashboard.</p>`;

  const facts = [
    ["Education", (a.education || []).length], ["Experience", (a.experience || []).length],
    ["Achievements", (a.achievements || []).length], ["Interests", (a.interests || []).map(i => i.name || i).join(", ")],
  ];
  document.getElementById("aboutFacts").innerHTML = facts.map(([k, v]) =>
    `<div style="display:flex; justify-content:space-between; font-size:13px;"><span class="mono" style="color:var(--text-faint)">${k}</span><span>${v || "—"}</span></div>`
  ).join("");

  document.getElementById("experienceTimeline").innerHTML = renderTimeline(a.experience, "role", "company");
  document.getElementById("educationTimeline").innerHTML = renderTimeline(a.education, "degree", "institution");
  document.getElementById("achievementsList").innerHTML = (a.achievements || []).length
    ? a.achievements.map(x => `<span class="chip on">🏆 ${esc(x.title || x)}</span>`).join("")
    : `<span class="card-desc">None added yet.</span>`;
  document.getElementById("languagesList").innerHTML = (a.languages || []).length
    ? a.languages.map(x => `<span class="chip">${esc(x.name || x)}${x.level ? " · " + esc(x.level) : ""}</span>`).join("")
    : `<span class="card-desc">None added yet.</span>`;
}

function renderTimeline(list, titleKey, subKey) {
  if (!list || !list.length) return `<div class="empty-state"><div class="glyph">::</div>Nothing added yet.</div>`;
  return list.map(item => `
    <div class="timeline-item">
      <div class="period mono">${esc(item.period || "")}</div>
      <h4>${esc(item[titleKey] || item.title || "")}</h4>
      <p>${esc(item[subKey] || "")}${item.description ? " — " + esc(item.description) : ""}</p>
    </div>`).join("");
}

/* ---------------------------------------------------------------------- */
let ALL_PROJECTS = [];
async function loadProjects() {
  const { data } = await sb.from("projects").select("*").order("featured", { ascending: false }).order("sort_order");
  ALL_PROJECTS = data || [];
  const tags = [...new Set(ALL_PROJECTS.flatMap(p => p.tags || []))];
  document.getElementById("projectFilters").innerHTML = ["All", ...tags].map((t, i) =>
    `<button class="filter-chip${i === 0 ? " active" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`).join("");
  document.querySelectorAll("#projectFilters .filter-chip").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll("#projectFilters .filter-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProjects();
    }));
  document.getElementById("projectSearch").addEventListener("input", renderProjects);
  renderProjects();
}
function renderProjects() {
  const q = (document.getElementById("projectSearch").value || "").toLowerCase();
  const activeTag = document.querySelector("#projectFilters .filter-chip.active")?.dataset.tag || "All";
  const list = ALL_PROJECTS.filter(p =>
    (activeTag === "All" || (p.tags || []).includes(activeTag)) &&
    (`${p.title} ${p.summary} ${(p.tech_stack||[]).join(" ")}`.toLowerCase().includes(q))
  );
  const host = document.getElementById("projectsGrid");
  if (!list.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="glyph">◇</div>No projects match.</div>`; return; }
  host.innerHTML = list.map(p => `
    <div class="card glass glass-hover">
      <div class="card-thumb" style="cursor:pointer;" onclick="openProjectDetail('${p.id}')">
        ${p.featured ? '<span class="featured-tag">★ FEATURED</span>' : ""}
        <img src="${p.thumbnail_url || `https://placehold.co/500x300/0f1614/22c58b?text=${encodeURIComponent(p.title)}`}" alt="${esc(p.title)}">
      </div>
      <div class="card-body">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div class="card-title" style="cursor:pointer;" onclick="openProjectDetail('${p.id}')">${esc(p.title)}</div>
          <span class="chip cyan">${esc(p.status || "")}</span>
        </div>
        <div class="card-desc">${esc(p.summary || "")}</div>
        <div class="card-tags">${(p.tech_stack || []).slice(0, 5).map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
        <div class="card-links">
          ${p.github_url ? `<a href="${esc(p.github_url)}" target="_blank" class="btn btn-ghost btn-sm">Code</a>` : ""}
          ${p.demo_url ? `<a href="${esc(p.demo_url)}" target="_blank" class="btn btn-cyan btn-sm">Live demo</a>` : ""}
          ${p.docs_url ? `<a href="${esc(p.docs_url)}" target="_blank" class="btn btn-ghost btn-sm">Docs</a>` : ""}
          <button class="btn btn-ghost btn-sm" onclick="openProjectDetail('${p.id}')" type="button">Details →</button>
        </div>
      </div>
    </div>`).join("");
}

function openProjectDetail(id) {
  const p = ALL_PROJECTS.find(x => x.id === id);
  if (!p) return;
  const gallery = Array.isArray(p.gallery) ? p.gallery : [];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.innerHTML = `<div class="modal-box wide glass">
    <div class="modal-head">
      <h3>${esc(p.title)} ${p.featured ? "★" : ""}</h3>
      <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <img src="${p.thumbnail_url || ""}" style="width:100%; border-radius:10px; margin-bottom:16px; ${p.thumbnail_url ? "" : "display:none;"}">
    <div class="card-tags" style="margin-bottom:14px;">${(p.tech_stack || []).map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
    <div class="prose">${p.content_html || `<p>${esc(p.summary || "")}</p>`}</div>
    ${gallery.length ? `<h4 class="font-display" style="margin:20px 0 10px;">Gallery</h4>
      <div class="grid grid-3">${gallery.map(url => `<img src="${url}" style="width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:8px; border:1px solid var(--line); cursor:pointer;" onclick="window.open('${url}','_blank')">`).join("")}</div>` : ""}
    <div class="card-links" style="margin-top:20px;">
      ${p.github_url ? `<a href="${esc(p.github_url)}" target="_blank" class="btn btn-ghost btn-sm">Code</a>` : ""}
      ${p.demo_url ? `<a href="${esc(p.demo_url)}" target="_blank" class="btn btn-cyan btn-sm">Live demo</a>` : ""}
      ${p.docs_url ? `<a href="${esc(p.docs_url)}" target="_blank" class="btn btn-ghost btn-sm">Docs</a>` : ""}
      ${p.diagram_url ? `<a href="${esc(p.diagram_url)}" target="_blank" class="btn btn-ghost btn-sm">Architecture diagram</a>` : ""}
    </div>
  </div>`;
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/* ---------------------------------------------------------------------- */
async function loadSkills() {
  const { data } = await sb.from("skills").select("*").order("sort_order");
  const byCategory = {};
  (data || []).forEach(s => { (byCategory[s.category] ||= []).push(s); });
  const host = document.getElementById("skillsGrid");
  const cats = Object.keys(byCategory);
  if (!cats.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="glyph">▦</div>No skills added yet.</div>`; return; }
  host.innerHTML = cats.map(cat => `
    <div class="glass" style="padding:22px;">
      <h4 class="font-display" style="margin-top:0; color:var(--emerald-brt)">${esc(cat)}</h4>
      ${byCategory[cat].map(s => `
        <div class="skill-row">
          <div class="skill-logo">${s.logo_url ? `<img src="${s.logo_url}" alt="">` : `<span class="mono" style="font-size:11px;">${esc((s.name||"?").slice(0,2).toUpperCase())}</span>`}</div>
          <div style="flex:1;">
            <div class="skill-name">${esc(s.name)}</div>
            <div class="skill-meta">${s.years ? s.years + " yrs" : ""}${s.description ? " · " + esc(s.description) : ""}</div>
          </div>
          <div class="skill-level">${[1,2,3,4,5].map(i => `<i class="${i <= (s.level||0) ? "fill" : ""}"></i>`).join("")}</div>
        </div>`).join("")}
    </div>`).join("");
}

/* ---------------------------------------------------------------------- */
async function loadCertificates() {
  const { data } = await sb.from("certificates").select("*").order("sort_order");
  const host = document.getElementById("certsGrid");
  if (!data || !data.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="glyph">◈</div>No certifications added yet.</div>`; return; }
  host.innerHTML = data.map(c => `
    <div class="card glass glass-hover">
      <div class="card-thumb">
        <img src="${c.image_url || `https://placehold.co/500x300/0f1614/35d4e8?text=${encodeURIComponent(c.title)}`}" alt="${esc(c.title)}">
      </div>
      <div class="card-body">
        <div class="card-title">${esc(c.title)}</div>
        <div class="card-desc">${esc(c.issuer || "")} ${c.issued_date ? "· " + fmtDate(c.issued_date) : ""}</div>
        <div class="card-links">
          ${c.credential_url ? `<a href="${esc(c.credential_url)}" target="_blank" class="btn btn-ghost btn-sm">Verify</a>` : ""}
          ${c.pdf_url ? `<a href="${esc(c.pdf_url)}" target="_blank" class="btn btn-cyan btn-sm">PDF</a>` : ""}
        </div>
      </div>
    </div>`).join("");
}

/* ---------------------------------------------------------------------- */
let ALL_NOTES = [];
async function loadNotes() {
  const { data } = await sb.from("notes").select("*").eq("published", true).order("created_at", { ascending: false });
  ALL_NOTES = data || [];
  const cats = [...new Set(ALL_NOTES.map(n => n.category))];
  document.getElementById("notesFilters").innerHTML = ["All", ...cats].map((c, i) =>
    `<button class="filter-chip${i === 0 ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  document.querySelectorAll("#notesFilters .filter-chip").forEach(btn =>
    btn.addEventListener("click", () => {
      document.querySelectorAll("#notesFilters .filter-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active"); renderNotes();
    }));
  document.getElementById("notesSearch").addEventListener("input", renderNotes);
  renderNotes();
}
function renderNotes() {
  const q = (document.getElementById("notesSearch").value || "").toLowerCase();
  const activeCat = document.querySelector("#notesFilters .filter-chip.active")?.dataset.cat || "All";
  const list = ALL_NOTES.filter(n => (activeCat === "All" || n.category === activeCat) &&
    `${n.title} ${(n.tags||[]).join(" ")}`.toLowerCase().includes(q));
  const host = document.getElementById("notesGrid");
  if (!list.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="glyph">✎</div>No notes match.</div>`; return; }
  host.innerHTML = list.map(n => `
    <div class="glass glass-hover" style="padding:20px; cursor:pointer;" onclick="openNote('${n.id}')">
      <span class="chip on">${esc(n.category)}</span>
      <h4 style="margin:12px 0 6px;">${esc(n.title)}</h4>
      <div class="card-desc mono" style="font-size:11.5px;">${fmtDate(n.created_at)}</div>
      <div class="card-tags" style="margin-top:10px;">${(n.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
    </div>`).join("");
}
function openNote(id) {
  const n = ALL_NOTES.find(x => x.id === id);
  if (!n) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.innerHTML = `<div class="modal-box wide glass">
    <div class="modal-head"><h3>${esc(n.title)}</h3><button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="prose">${n.content_html || ""}</div>
  </div>`;
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/* ---------------------------------------------------------------------- */
async function loadLearning() {
  const { data } = await sb.from("learning").select("*").order("sort_order");
  const host = document.getElementById("learningGrid");
  if (!data || !data.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="glyph">↻</div>Nothing being tracked yet.</div>`; return; }
  host.innerHTML = data.map(l => `
    <div class="glass" style="padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="card-title" style="font-size:15px;">${l.completed ? "✅ " : ""}${esc(l.title)}</div>
        <span class="chip">${esc(l.category)}</span>
      </div>
      <div style="margin:12px 0 6px;" class="progress-track"><div class="progress-fill" style="width:${l.progress||0}%;"></div></div>
      <div class="mono" style="font-size:11.5px; color:var(--text-faint);">${l.progress||0}% complete</div>
      ${l.notes ? `<p class="card-desc" style="margin-top:8px;">${esc(l.notes)}</p>` : ""}
      ${(l.resources||[]).length ? `<div class="card-links" style="margin-top:10px;">${l.resources.map(r=>`<a href="${esc(r.url)}" target="_blank" class="btn btn-ghost btn-sm">${esc(r.label||"Resource")}</a>`).join("")}</div>` : ""}
    </div>`).join("");
}

/* ---------------------------------------------------------------------- */
async function loadGallery() {
  const { data } = await sb.from("gallery").select("*").order("sort_order");
  const host = document.getElementById("galleryGrid");
  if (!data || !data.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="glyph">▤</div>No images uploaded yet.</div>`; return; }
  host.innerHTML = data.map(g => `
    <div class="glass" style="overflow:hidden; padding:0;">
      <div class="card-thumb" style="aspect-ratio:1/1;"><img src="${g.image_url}" alt="${esc(g.caption||"")}"></div>
      ${g.caption ? `<div style="padding:10px 12px; font-size:12.5px; color:var(--text-dim);">${esc(g.caption)}</div>` : ""}
    </div>`).join("");
}

/* ---------------------------------------------------------------------- */
async function loadSettings() {
  const { data: s } = await sb.from("settings").select("*").eq("id", 1).single();
  if (!s) return;
  if (s.seo_title) document.getElementById("pageTitle").textContent = s.seo_title;
  if (s.seo_description) document.getElementById("pageDesc").setAttribute("content", s.seo_description);
  if (s.footer_text) document.getElementById("footerText").innerHTML = esc(s.footer_text) + ` · <span id="footYear2">${new Date().getFullYear()}</span>`;
}
