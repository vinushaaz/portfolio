// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
let CURRENT_ABOUT = { content_html: "", education: [], experience: [], achievements: [], interests: [], languages: [] };
let CURRENT_EXTRA_LINKS = [];

document.addEventListener("DOMContentLoaded", async () => {
  paintPcbTraces && null; // decorative bg not used in admin (kept minimal/functional)
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) { window.location.href = "login.html"; return; }
  document.getElementById("adminShell").style.display = "flex";

  initPanelRouting();
  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    window.location.href = "login.html";
  });

  await Promise.all([loadOverview(), loadProfileForm(), loadAboutForm(), loadResumeForm(), loadSettingsForm()]);
  await Promise.all([loadProjectsTable(), loadSkillsTable(), loadCertsTable(), loadNotesTable(), loadLearningTable(), loadGalleryAdmin()]);

  bindStaticButtons();
});

/* ---------------------------------------------------------------------- */
/* PANEL ROUTING                                                          */
/* ---------------------------------------------------------------------- */
function initPanelRouting() {
  const nav = document.querySelectorAll("#adminNav a[data-panel]");
  function show(name) {
    document.querySelectorAll(".admin-panel").forEach(p => p.style.display = "none");
    const target = document.getElementById(`panel-${name}`);
    if (target) target.style.display = "block";
    nav.forEach(a => a.classList.toggle("active", a.dataset.panel === name));
  }
  nav.forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); show(a.dataset.panel); history.replaceState(null, "", `#${a.dataset.panel}`); }));
  show((location.hash || "#overview").slice(1));
}

/* ---------------------------------------------------------------------- */
/* OVERVIEW                                                                */
/* ---------------------------------------------------------------------- */
async function loadOverview() {
  const [{ count: pc }, { count: nc }, { count: sc }, { data: settings }] = await Promise.all([
    sb.from("projects").select("*", { count: "exact", head: true }),
    sb.from("notes").select("*", { count: "exact", head: true }),
    sb.from("skills").select("*", { count: "exact", head: true }),
    sb.from("settings").select("visitor_count").eq("id", 1).single(),
  ]);
  const nums = [pc || 0, nc || 0, sc || 0, settings?.data?.visitor_count ?? settings?.visitor_count ?? 0];
  document.querySelectorAll("#statsGrid .num").forEach((el, i) => { el.classList.remove("skel"); el.textContent = nums[i]; });
}

/* ---------------------------------------------------------------------- */
/* DROPZONE HELPER — click/drag to upload to Supabase Storage             */
/* ---------------------------------------------------------------------- */
function mountDropzone(zoneEl, hiddenInput, folder, { accept = "image/*", label = "Click or drop a file to upload" } = {}) {
  if (!zoneEl) return;
  zoneEl.innerHTML = hiddenInput.value
    ? (accept.includes("image") ? `<img class="upload-preview" src="${hiddenInput.value}"><div class="mono" style="font-size:11px;">Click to replace</div>` : `<div>📄 File uploaded — click to replace</div>`)
    : label;

  const input = document.createElement("input");
  input.type = "file"; input.accept = accept; input.style.display = "none";
  zoneEl.appendChild(input);

  async function handleFile(file) {
    if (!file) return;
    try {
      zoneEl.innerHTML = "Uploading…";
      const url = await uploadToStorage(file, folder);
      hiddenInput.value = url;
      zoneEl.innerHTML = accept.includes("image") ? `<img class="upload-preview" src="${url}"><div class="mono" style="font-size:11px;">Click to replace</div>` : `<div>📄 File uploaded — click to replace</div>`;
      zoneEl.appendChild(input);
      toast("Uploaded", "ok");
    } catch (err) { toast("Upload failed: " + err.message, "err"); zoneEl.textContent = label; zoneEl.appendChild(input); }
  }
  zoneEl.addEventListener("click", () => input.click());
  input.addEventListener("change", () => handleFile(input.files[0]));
  ["dragover", "dragleave", "drop"].forEach(evt => zoneEl.addEventListener(evt, e => e.preventDefault()));
  zoneEl.addEventListener("dragover", () => zoneEl.classList.add("drag"));
  zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("drag"));
  zoneEl.addEventListener("drop", (e) => { zoneEl.classList.remove("drag"); handleFile(e.dataTransfer.files[0]); });
}

/* ---------------------------------------------------------------------- */
/* PROFILE / HOME                                                          */
/* ---------------------------------------------------------------------- */
async function loadProfileForm() {
  const { data: p } = await sb.from("profile").select("*").eq("id", 1).single();
  if (!p) return;
  ["name","role","bio","status","email","phone","github","linkedin","leetcode","hackerrank","portfolio_url","location"]
    .forEach(k => { const el = document.getElementById(`f_${k}`); if (el) el.value = p[k] || ""; });
  document.getElementById("f_avatar_url").value = p.avatar_url || "";
  document.getElementById("f_cover_url").value = p.cover_url || "";
  document.getElementById("f_logo_url").value = p.logo_url || "";
  mountDropzone(document.getElementById("avatarDrop"), document.getElementById("f_avatar_url"), "avatar");
  mountDropzone(document.getElementById("coverDrop"), document.getElementById("f_cover_url"), "cover");
  mountDropzone(document.getElementById("logoDrop"), document.getElementById("f_logo_url"), "logo");

  CURRENT_EXTRA_LINKS = Array.isArray(p.extra_links) ? p.extra_links : [];
  mountListEditor("extraLinksList", () => CURRENT_EXTRA_LINKS, [{ key: "label", placeholder: "Label (e.g. Twitter)" }, { key: "url", placeholder: "https://…" }]);
  document.getElementById("addExtraLinkBtn").addEventListener("click", () => {
    CURRENT_EXTRA_LINKS.push({ label: "", url: "" });
    mountListEditor("extraLinksList", () => CURRENT_EXTRA_LINKS, [{ key: "label", placeholder: "Label (e.g. Twitter)" }, { key: "url", placeholder: "https://…" }]);
  });

  document.getElementById("saveProfileBtn").addEventListener("click", async () => {
    const payload = { id: 1 };
    ["name","role","bio","status","email","phone","github","linkedin","leetcode","hackerrank","portfolio_url","location"]
      .forEach(k => payload[k] = document.getElementById(`f_${k}`).value.trim());
    payload.avatar_url = document.getElementById("f_avatar_url").value;
    payload.cover_url = document.getElementById("f_cover_url").value;
    payload.logo_url = document.getElementById("f_logo_url").value;
    payload.extra_links = CURRENT_EXTRA_LINKS.filter(l => l.label || l.url);
    payload.updated_at = new Date().toISOString();
    const { error } = await sb.from("profile").upsert(payload);
    toast(error ? "Save failed: " + error.message : "Profile saved", error ? "err" : "ok");
  });
}

/* ---------------------------------------------------------------------- */
/* ABOUT                                                                   */
/* ---------------------------------------------------------------------- */
let aboutEditor;
async function loadAboutForm() {
  const { data: a } = await sb.from("about").select("*").eq("id", 1).single();
  if (a) CURRENT_ABOUT = { ...CURRENT_ABOUT, ...a };

  aboutEditor = initRichText(document.getElementById("aboutToolbar"), document.getElementById("aboutBody"), { uploadFolder: "about" });
  aboutEditor.setHTML(CURRENT_ABOUT.content_html);

  mountListEditor("interestsList", () => CURRENT_ABOUT.interests, [{ key: "name", placeholder: "Interest (e.g. RF design)" }]);
  mountListEditor("languagesEditList", () => CURRENT_ABOUT.languages, [{ key: "name", placeholder: "Language" }, { key: "level", placeholder: "Fluency (e.g. Native)" }]);
  mountListEditor("achievementsEditList", () => CURRENT_ABOUT.achievements, [{ key: "title", placeholder: "Achievement" }]);
  mountListEditor("experienceEditList", () => CURRENT_ABOUT.experience, [
    { key: "period", placeholder: "Period (e.g. 2023 — Present)" }, { key: "role", placeholder: "Role / title" },
    { key: "company", placeholder: "Company" }, { key: "description", placeholder: "Short description" },
  ]);
  mountListEditor("educationEditList", () => CURRENT_ABOUT.education, [
    { key: "period", placeholder: "Period (e.g. 2018 — 2022)" }, { key: "degree", placeholder: "Degree" },
    { key: "institution", placeholder: "Institution" }, { key: "description", placeholder: "Notes" },
  ]);

  document.getElementById("addInterestBtn").addEventListener("click", () => { CURRENT_ABOUT.interests.push({ name: "" }); mountListEditor("interestsList", () => CURRENT_ABOUT.interests, [{ key: "name", placeholder: "Interest" }]); });
  document.getElementById("addLanguageBtn").addEventListener("click", () => { CURRENT_ABOUT.languages.push({ name: "", level: "" }); mountListEditor("languagesEditList", () => CURRENT_ABOUT.languages, [{ key: "name", placeholder: "Language" }, { key: "level", placeholder: "Fluency" }]); });
  document.getElementById("addAchievementBtn").addEventListener("click", () => { CURRENT_ABOUT.achievements.push({ title: "" }); mountListEditor("achievementsEditList", () => CURRENT_ABOUT.achievements, [{ key: "title", placeholder: "Achievement" }]); });
  document.getElementById("addExperienceBtn").addEventListener("click", () => { CURRENT_ABOUT.experience.push({ period: "", role: "", company: "", description: "" }); mountListEditor("experienceEditList", () => CURRENT_ABOUT.experience, [{ key: "period", placeholder: "Period" }, { key: "role", placeholder: "Role" }, { key: "company", placeholder: "Company" }, { key: "description", placeholder: "Description" }]); });
  document.getElementById("addEducationBtn").addEventListener("click", () => { CURRENT_ABOUT.education.push({ period: "", degree: "", institution: "", description: "" }); mountListEditor("educationEditList", () => CURRENT_ABOUT.education, [{ key: "period", placeholder: "Period" }, { key: "degree", placeholder: "Degree" }, { key: "institution", placeholder: "Institution" }, { key: "description", placeholder: "Notes" }]); });

  const saveAbout = async () => {
    CURRENT_ABOUT.content_html = aboutEditor.getHTML();
    const { error } = await sb.from("about").upsert({ id: 1, ...CURRENT_ABOUT, updated_at: new Date().toISOString() });
    toast(error ? "Save failed: " + error.message : "About saved", error ? "err" : "ok");
  };
  document.getElementById("saveAboutBtn").addEventListener("click", saveAbout);
  document.getElementById("saveExpEduBtn").addEventListener("click", saveAbout);
}

function mountListEditor(containerId, getArr, fields) {
  const host = document.getElementById(containerId);
  const arr = getArr();
  host.innerHTML = arr.length ? arr.map((item, idx) => `
    <div class="glass" style="padding:12px; display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;" data-idx="${idx}">
      ${fields.map(f => `<input class="input" style="flex:1; min-width:140px;" data-field="${f.key}" placeholder="${esc(f.placeholder)}" value="${esc(item[f.key] || "")}">`).join("")}
      <button class="btn btn-icon btn-danger btn-sm" data-remove type="button">✕</button>
    </div>`).join("") : `<p class="card-desc">None added yet.</p>`;
  host.querySelectorAll("[data-idx]").forEach(row => {
    const idx = +row.dataset.idx;
    row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => { arr[idx][inp.dataset.field] = inp.value; }));
    row.querySelector("[data-remove]").addEventListener("click", () => { arr.splice(idx, 1); mountListEditor(containerId, getArr, fields); });
  });
}

/* ---------------------------------------------------------------------- */
/* RESUME                                                                  */
/* ---------------------------------------------------------------------- */
async function loadResumeForm() {
  const { data: p } = await sb.from("profile").select("resume_url").eq("id", 1).single();
  const hidden = document.getElementById("f_resume_url");
  hidden.value = p?.resume_url || "";
  mountDropzone(document.getElementById("resumeDrop"), hidden, "resume", { accept: "application/pdf", label: "Click or drop a PDF to upload" });
  if (hidden.value) {
    document.getElementById("resumeCurrentRow").style.display = "flex";
    document.getElementById("resumeCurrentLink").href = hidden.value;
  }
  // auto-save resume as soon as it's uploaded
  document.getElementById("resumeDrop").addEventListener("click", () => {
    setTimeout(async () => {
      if (!hidden.value) return;
      await sb.from("profile").upsert({ id: 1, resume_url: hidden.value, updated_at: new Date().toISOString() });
    }, 1200);
  });
}

/* ---------------------------------------------------------------------- */
/* SETTINGS                                                                */
/* ---------------------------------------------------------------------- */
async function loadSettingsForm() {
  const { data: s } = await sb.from("settings").select("*").eq("id", 1).single();
  if (s) {
    document.getElementById("f_seo_title").value = s.seo_title || "";
    document.getElementById("f_seo_description").value = s.seo_description || "";
    document.getElementById("f_footer_text").value = s.footer_text || "";
    document.getElementById("f_visitor_count").value = s.visitor_count || 0;
  }
  document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    const { error } = await sb.from("settings").upsert({
      id: 1,
      seo_title: document.getElementById("f_seo_title").value.trim(),
      seo_description: document.getElementById("f_seo_description").value.trim(),
      footer_text: document.getElementById("f_footer_text").value.trim(),
      updated_at: new Date().toISOString(),
    });
    toast(error ? "Save failed: " + error.message : "Settings saved", error ? "err" : "ok");
  });
}

/* ---------------------------------------------------------------------- */
/* GENERIC MODAL                                                           */
/* ---------------------------------------------------------------------- */
function openModal(title, bodyHtml) {
  document.getElementById("modalBox").innerHTML = `
    <div class="modal-head"><h3>${esc(title)}</h3><button class="btn btn-icon btn-ghost" id="modalClose" type="button">✕</button></div>
    ${bodyHtml}`;
  document.getElementById("modal").classList.add("open");
  document.getElementById("modalClose").addEventListener("click", closeModal);
}
function closeModal() { document.getElementById("modal").classList.remove("open"); }
document.addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

async function confirmDelete(table, id, reload) {
  if (!confirm("Delete this item? This cannot be undone.")) return;
  const { error } = await sb.from(table).delete().eq("id", id);
  toast(error ? "Delete failed: " + error.message : "Deleted", error ? "err" : "ok");
  if (!error) reload();
}

/* ---------------------------------------------------------------------- */
/* PROJECTS                                                                */
/* ---------------------------------------------------------------------- */
async function loadProjectsTable() {
  const { data } = await sb.from("projects").select("*").order("sort_order");
  const host = document.getElementById("projectsTable");
  host.innerHTML = (data || []).map(p => `
    <tr>
      <td><img class="thumb-sm" src="${p.thumbnail_url || "https://placehold.co/80x80/0f1614/22c58b?text=%2B"}"></td>
      <td>${esc(p.title)}</td>
      <td><span class="chip">${esc(p.status || "")}</span></td>
      <td>${p.featured ? "★" : "—"}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="5" class="card-desc" style="padding:20px;">No projects yet — click "New project" to add one.</td></tr>`;
  host.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openProjectModal((data || []).find(x => x.id === b.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDelete("projects", b.dataset.del, loadProjectsTable)));
}

function openProjectModal(existing) {
  const p = existing || { title: "", thumbnail_url: "", gallery: [], summary: "", content_html: "", github_url: "", demo_url: "", docs_url: "", diagram_url: "", tech_stack: [], tags: [], category: "", status: "In Progress", featured: false, sort_order: 0 };
  openModal(existing ? "Edit project" : "New project", `
    <div class="field"><label>Title</label><input type="text" id="m_title" value="${esc(p.title)}"></div>
    <div class="field"><label>Thumbnail</label><div id="m_thumbDrop" class="drop-zone"></div><input type="hidden" id="m_thumbnail_url" value="${esc(p.thumbnail_url)}"></div>
    <div class="field">
      <label>Gallery <span class="hint" style="font-weight:400;">(extra screenshots/photos shown when someone opens this project)</span></label>
      <div id="m_galleryGrid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;"></div>
      <button class="btn btn-ghost btn-sm" id="m_addGalleryImg" type="button">+ Add image</button>
    </div>
    <div class="field"><label>Summary</label><textarea id="m_summary">${esc(p.summary)}</textarea></div>
    <div class="field"><label>Full description</label><div class="rte-toolbar" id="m_toolbar"></div><div class="rte-body" id="m_body" data-placeholder="Architecture, design decisions, results…"></div></div>
    <div class="field-row">
      <div class="field"><label>GitHub link</label><input type="url" id="m_github_url" value="${esc(p.github_url)}"></div>
      <div class="field"><label>Live demo link</label><input type="url" id="m_demo_url" value="${esc(p.demo_url)}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Documentation link</label><input type="url" id="m_docs_url" value="${esc(p.docs_url)}"></div>
      <div class="field"><label>Architecture diagram URL</label><input type="url" id="m_diagram_url" value="${esc(p.diagram_url)}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Category</label><input type="text" id="m_category" value="${esc(p.category)}"></div>
      <div class="field"><label>Status</label>
        <select id="m_status">
          ${["Planned","In Progress","Completed","Archived"].map(s => `<option value="${s}" ${p.status===s?"selected":""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Tech stack (comma separated)</label><input type="text" id="m_tech_stack" value="${esc((p.tech_stack||[]).join(", "))}"></div>
      <div class="field"><label>Tags (comma separated)</label><input type="text" id="m_tags" value="${esc((p.tags||[]).join(", "))}"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="m_featured" ${p.featured?"checked":""} style="width:auto; margin-right:8px;">Featured project</label></div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-ghost" id="m_cancel" type="button">Cancel</button>
      <button class="btn btn-primary" id="m_save" type="button">${existing ? "Save changes" : "Create project"}</button>
    </div>
  `);
  mountDropzone(document.getElementById("m_thumbDrop"), document.getElementById("m_thumbnail_url"), "projects");
  const rte = initRichText(document.getElementById("m_toolbar"), document.getElementById("m_body"), { uploadFolder: "projects" });
  rte.setHTML(p.content_html);

  let galleryUrls = Array.isArray(p.gallery) ? [...p.gallery] : [];
  function renderGallery() {
    const host = document.getElementById("m_galleryGrid");
    host.innerHTML = galleryUrls.map((url, idx) => `
      <div style="position:relative;">
        <img src="${url}" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px; border:1px solid var(--line);">
        <button type="button" data-rm="${idx}" class="btn btn-icon btn-danger btn-sm" style="position:absolute; top:4px; right:4px; width:24px; height:24px; font-size:11px;">✕</button>
      </div>`).join("");
    host.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { galleryUrls.splice(+b.dataset.rm, 1); renderGallery(); }));
  }
  renderGallery();
  document.getElementById("m_addGalleryImg").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try { toast("Uploading…"); const url = await uploadToStorage(file, "projects"); galleryUrls.push(url); renderGallery(); toast("Image added", "ok"); }
      catch (err) { toast("Upload failed: " + err.message, "err"); }
    };
    input.click();
  });

  document.getElementById("m_cancel").addEventListener("click", closeModal);
  document.getElementById("m_save").addEventListener("click", async () => {
    const payload = {
      title: document.getElementById("m_title").value.trim() || "Untitled project",
      thumbnail_url: document.getElementById("m_thumbnail_url").value,
      gallery: galleryUrls,
      summary: document.getElementById("m_summary").value.trim(),
      content_html: rte.getHTML(),
      github_url: document.getElementById("m_github_url").value.trim(),
      demo_url: document.getElementById("m_demo_url").value.trim(),
      docs_url: document.getElementById("m_docs_url").value.trim(),
      diagram_url: document.getElementById("m_diagram_url").value.trim(),
      category: document.getElementById("m_category").value.trim(),
      status: document.getElementById("m_status").value,
      tech_stack: document.getElementById("m_tech_stack").value.split(",").map(s => s.trim()).filter(Boolean),
      tags: document.getElementById("m_tags").value.split(",").map(s => s.trim()).filter(Boolean),
      featured: document.getElementById("m_featured").checked,
      updated_at: new Date().toISOString(),
    };
    payload.slug = slugify(payload.title) + "-" + Math.random().toString(36).slice(2, 6);
    let error;
    if (existing) ({ error } = await sb.from("projects").update(payload).eq("id", existing.id));
    else ({ error } = await sb.from("projects").insert(payload));
    if (error) { toast("Save failed: " + error.message, "err"); return; }
    toast("Project saved", "ok"); closeModal(); loadProjectsTable(); loadOverview();
  });
}

/* ---------------------------------------------------------------------- */
/* SKILLS                                                                  */
/* ---------------------------------------------------------------------- */
async function loadSkillsTable() {
  const { data } = await sb.from("skills").select("*").order("sort_order");
  const host = document.getElementById("skillsTable");
  host.innerHTML = (data || []).map(s => `
    <tr>
      <td><img class="thumb-sm" src="${s.logo_url || "https://placehold.co/60x60/0f1614/35d4e8?text=%2B"}"></td>
      <td>${esc(s.name)}</td><td>${esc(s.category)}</td><td>${"●".repeat(s.level||0)}${"○".repeat(5-(s.level||0))}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${s.id}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="5" class="card-desc" style="padding:20px;">No skills yet.</td></tr>`;
  host.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openSkillModal((data || []).find(x => x.id === b.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDelete("skills", b.dataset.del, loadSkillsTable)));
}
function openSkillModal(existing) {
  const s = existing || { name: "", category: "Embedded Systems", logo_url: "", description: "", level: 3, years: 0, sort_order: 0 };
  openModal(existing ? "Edit skill" : "New skill", `
    <div class="field"><label>Name</label><input type="text" id="m_name" value="${esc(s.name)}"></div>
    <div class="field"><label>Category</label><input type="text" id="m_category" value="${esc(s.category)}" placeholder="Embedded Systems / Firmware / Programming / Cloud / Electronics / Industrial IoT / Tools / Soft Skills"></div>
    <div class="field"><label>Logo</label><div id="m_logoDrop" class="drop-zone"></div><input type="hidden" id="m_logo_url" value="${esc(s.logo_url)}"></div>
    <div class="field"><label>Description</label><textarea id="m_description">${esc(s.description)}</textarea></div>
    <div class="field-row">
      <div class="field"><label>Level (1-5)</label><input type="number" id="m_level" min="1" max="5" value="${s.level}"></div>
      <div class="field"><label>Years of experience</label><input type="number" id="m_years" step="0.5" value="${s.years}"></div>
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-ghost" id="m_cancel" type="button">Cancel</button>
      <button class="btn btn-primary" id="m_save" type="button">${existing ? "Save changes" : "Create skill"}</button>
    </div>`);
  mountDropzone(document.getElementById("m_logoDrop"), document.getElementById("m_logo_url"), "skills");
  document.getElementById("m_cancel").addEventListener("click", closeModal);
  document.getElementById("m_save").addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("m_name").value.trim(), category: document.getElementById("m_category").value.trim() || "General",
      logo_url: document.getElementById("m_logo_url").value, description: document.getElementById("m_description").value.trim(),
      level: +document.getElementById("m_level").value || 0, years: +document.getElementById("m_years").value || 0,
    };
    let error;
    if (existing) ({ error } = await sb.from("skills").update(payload).eq("id", existing.id));
    else ({ error } = await sb.from("skills").insert(payload));
    if (error) { toast("Save failed: " + error.message, "err"); return; }
    toast("Skill saved", "ok"); closeModal(); loadSkillsTable(); loadOverview();
  });
}

/* ---------------------------------------------------------------------- */
/* CERTIFICATES                                                            */
/* ---------------------------------------------------------------------- */
async function loadCertsTable() {
  const { data } = await sb.from("certificates").select("*").order("sort_order");
  const host = document.getElementById("certsTable");
  host.innerHTML = (data || []).map(c => `
    <tr>
      <td><img class="thumb-sm" src="${c.image_url || "https://placehold.co/60x60/0f1614/e8b94f?text=%2B"}"></td>
      <td>${esc(c.title)}</td><td>${esc(c.issuer||"")}</td><td>${fmtDate(c.issued_date)}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${c.id}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="5" class="card-desc" style="padding:20px;">No certificates yet.</td></tr>`;
  host.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openCertModal((data || []).find(x => x.id === b.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDelete("certificates", b.dataset.del, loadCertsTable)));
}
function openCertModal(existing) {
  const c = existing || { title: "", issuer: "", issued_date: "", credential_url: "", pdf_url: "", image_url: "" };
  openModal(existing ? "Edit certificate" : "New certificate", `
    <div class="field"><label>Title</label><input type="text" id="m_title" value="${esc(c.title)}"></div>
    <div class="field-row">
      <div class="field"><label>Issuer</label><input type="text" id="m_issuer" value="${esc(c.issuer)}"></div>
      <div class="field"><label>Date issued</label><input type="date" id="m_issued_date" value="${c.issued_date ? String(c.issued_date).slice(0,10) : ""}"></div>
    </div>
    <div class="field"><label>Certificate image</label><div id="m_imgDrop" class="drop-zone"></div><input type="hidden" id="m_image_url" value="${esc(c.image_url)}"></div>
    <div class="field"><label>Certificate PDF</label><div id="m_pdfDrop" class="drop-zone"></div><input type="hidden" id="m_pdf_url" value="${esc(c.pdf_url)}"></div>
    <div class="field"><label>Credential verification link</label><input type="url" id="m_credential_url" value="${esc(c.credential_url)}"></div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-ghost" id="m_cancel" type="button">Cancel</button>
      <button class="btn btn-primary" id="m_save" type="button">${existing ? "Save changes" : "Create certificate"}</button>
    </div>`);
  mountDropzone(document.getElementById("m_imgDrop"), document.getElementById("m_image_url"), "certificates");
  mountDropzone(document.getElementById("m_pdfDrop"), document.getElementById("m_pdf_url"), "certificates", { accept: "application/pdf", label: "Click or drop a PDF to upload" });
  document.getElementById("m_cancel").addEventListener("click", closeModal);
  document.getElementById("m_save").addEventListener("click", async () => {
    const payload = {
      title: document.getElementById("m_title").value.trim(), issuer: document.getElementById("m_issuer").value.trim(),
      issued_date: document.getElementById("m_issued_date").value || null,
      image_url: document.getElementById("m_image_url").value, pdf_url: document.getElementById("m_pdf_url").value,
      credential_url: document.getElementById("m_credential_url").value.trim(),
    };
    let error;
    if (existing) ({ error } = await sb.from("certificates").update(payload).eq("id", existing.id));
    else ({ error } = await sb.from("certificates").insert(payload));
    if (error) { toast("Save failed: " + error.message, "err"); return; }
    toast("Certificate saved", "ok"); closeModal(); loadCertsTable();
  });
}

/* ---------------------------------------------------------------------- */
/* TECH NOTES                                                              */
/* ---------------------------------------------------------------------- */
async function loadNotesTable() {
  const { data } = await sb.from("notes").select("*").order("created_at", { ascending: false });
  const host = document.getElementById("notesTable");
  host.innerHTML = (data || []).map(n => `
    <tr>
      <td>${esc(n.title)}</td><td><span class="chip">${esc(n.category)}</span></td>
      <td>${n.published ? "✅" : "—"}</td><td class="mono" style="font-size:12px;">${fmtDate(n.created_at)}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${n.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${n.id}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="5" class="card-desc" style="padding:20px;">No notes yet.</td></tr>`;
  host.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openNoteModal((data || []).find(x => x.id === b.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDelete("notes", b.dataset.del, loadNotesTable)));
}
function openNoteModal(existing) {
  const n = existing || { title: "", category: "General", tags: [], content_html: "", published: true };
  openModal(existing ? "Edit note" : "New tech note", `
    <div class="field-row">
      <div class="field"><label>Title</label><input type="text" id="m_title" value="${esc(n.title)}"></div>
      <div class="field"><label>Category</label><input type="text" id="m_category" value="${esc(n.category)}"></div>
    </div>
    <div class="field"><label>Tags (comma separated)</label><input type="text" id="m_tags" value="${esc((n.tags||[]).join(", "))}"></div>
    <div class="field"><label>Content</label><div class="rte-toolbar" id="m_toolbar"></div><div class="rte-body" id="m_body" data-placeholder="Write your note — bold, code, tables, callouts…"></div></div>
    <div class="field"><label><input type="checkbox" id="m_published" ${n.published?"checked":""} style="width:auto; margin-right:8px;">Published (visible on public site)</label></div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-ghost" id="m_cancel" type="button">Cancel</button>
      <button class="btn btn-primary" id="m_save" type="button">${existing ? "Save changes" : "Create note"}</button>
    </div>`);
  const rte = initRichText(document.getElementById("m_toolbar"), document.getElementById("m_body"), { uploadFolder: "notes" });
  rte.setHTML(n.content_html);
  document.getElementById("m_cancel").addEventListener("click", closeModal);
  document.getElementById("m_save").addEventListener("click", async () => {
    const title = document.getElementById("m_title").value.trim() || "Untitled note";
    const payload = {
      title, category: document.getElementById("m_category").value.trim() || "General",
      tags: document.getElementById("m_tags").value.split(",").map(s => s.trim()).filter(Boolean),
      content_html: rte.getHTML(), published: document.getElementById("m_published").checked,
      updated_at: new Date().toISOString(), slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
    };
    let error;
    if (existing) ({ error } = await sb.from("notes").update(payload).eq("id", existing.id));
    else ({ error } = await sb.from("notes").insert(payload));
    if (error) { toast("Save failed: " + error.message, "err"); return; }
    toast("Note saved", "ok"); closeModal(); loadNotesTable(); loadOverview();
  });
}

/* ---------------------------------------------------------------------- */
/* LEARNING                                                                 */
/* ---------------------------------------------------------------------- */
async function loadLearningTable() {
  const { data } = await sb.from("learning").select("*").order("sort_order");
  const host = document.getElementById("learningTable");
  host.innerHTML = (data || []).map(l => `
    <tr>
      <td>${esc(l.title)}</td><td><span class="chip">${esc(l.category)}</span></td>
      <td>${l.progress||0}%</td><td>${l.completed ? "✅" : "—"}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${l.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${l.id}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="5" class="card-desc" style="padding:20px;">Nothing tracked yet.</td></tr>`;
  host.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openLearningModal((data || []).find(x => x.id === b.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDelete("learning", b.dataset.del, loadLearningTable)));
}
function openLearningModal(existing) {
  const l = existing || { title: "", category: "Embedded Systems", resources: [], progress: 0, completed: false, notes: "" };
  openModal(existing ? "Edit learning item" : "New learning item", `
    <div class="field-row">
      <div class="field"><label>Title</label><input type="text" id="m_title" value="${esc(l.title)}"></div>
      <div class="field"><label>Category</label><input type="text" id="m_category" value="${esc(l.category)}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Progress (%)</label><input type="number" id="m_progress" min="0" max="100" value="${l.progress}"></div>
      <div class="field" style="align-self:end;"><label><input type="checkbox" id="m_completed" ${l.completed?"checked":""} style="width:auto; margin-right:8px;">Completed</label></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="m_notes">${esc(l.notes)}</textarea></div>
    <div class="field"><label>Resources — one per line, "Label | URL"</label><textarea id="m_resources">${esc((l.resources||[]).map(r => `${r.label} | ${r.url}`).join("\n"))}</textarea></div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
      <button class="btn btn-ghost" id="m_cancel" type="button">Cancel</button>
      <button class="btn btn-primary" id="m_save" type="button">${existing ? "Save changes" : "Create item"}</button>
    </div>`);
  document.getElementById("m_cancel").addEventListener("click", closeModal);
  document.getElementById("m_save").addEventListener("click", async () => {
    const resources = document.getElementById("m_resources").value.split("\n").map(l2 => l2.trim()).filter(Boolean).map(line => {
      const [label, url] = line.split("|").map(s => s.trim());
      return { label: label || "Resource", url: url || "#" };
    });
    const payload = {
      title: document.getElementById("m_title").value.trim(), category: document.getElementById("m_category").value.trim() || "General",
      progress: +document.getElementById("m_progress").value || 0, completed: document.getElementById("m_completed").checked,
      notes: document.getElementById("m_notes").value.trim(), resources,
    };
    let error;
    if (existing) ({ error } = await sb.from("learning").update(payload).eq("id", existing.id));
    else ({ error } = await sb.from("learning").insert(payload));
    if (error) { toast("Save failed: " + error.message, "err"); return; }
    toast("Saved", "ok"); closeModal(); loadLearningTable();
  });
}

/* ---------------------------------------------------------------------- */
/* GALLERY                                                                  */
/* ---------------------------------------------------------------------- */
async function loadGalleryAdmin() {
  const { data } = await sb.from("gallery").select("*").order("sort_order");
  const host = document.getElementById("galleryAdminGrid");
  host.innerHTML = (data || []).map(g => `
    <div class="glass" style="overflow:hidden; padding:0;">
      <div class="card-thumb" style="aspect-ratio:1/1;"><img src="${g.image_url}"></div>
      <div style="padding:10px; display:flex; justify-content:space-between; align-items:center; gap:6px;">
        <span class="card-desc" style="font-size:11.5px;">${esc(g.caption||"No caption")}</span>
        <button class="btn btn-icon btn-danger btn-sm" data-del="${g.id}">✕</button>
      </div>
    </div>`).join("") || `<div class="empty-state" style="grid-column:1/-1;">No images yet — click "Upload image".</div>`;
  host.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDelete("gallery", b.dataset.del, loadGalleryAdmin)));
}
function bindGalleryUpload() {
  document.getElementById("addGalleryBtn").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try {
        toast("Uploading…");
        const url = await uploadToStorage(file, "gallery");
        const caption = prompt("Caption (optional):", "") || "";
        const { error } = await sb.from("gallery").insert({ image_url: url, caption, category: "General" });
        if (error) throw error;
        toast("Image added", "ok"); loadGalleryAdmin();
      } catch (err) { toast("Upload failed: " + err.message, "err"); }
    };
    input.click();
  });
}

/* ---------------------------------------------------------------------- */
/* STATIC BUTTON BINDINGS                                                  */
/* ---------------------------------------------------------------------- */
function bindStaticButtons() {
  document.getElementById("addProjectBtn").addEventListener("click", () => openProjectModal(null));
  document.getElementById("addSkillBtn").addEventListener("click", () => openSkillModal(null));
  document.getElementById("addCertBtn").addEventListener("click", () => openCertModal(null));
  document.getElementById("addNoteBtn").addEventListener("click", () => openNoteModal(null));
  document.getElementById("addLearningBtn").addEventListener("click", () => openLearningModal(null));
  bindGalleryUpload();
}

function slugify(str) {
  return (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
