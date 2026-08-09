# Portfolio CMS — plain HTML + Supabase

No React, no build step, no Next.js. Just static HTML/CSS/JS files you can host
on GitHub Pages, with Supabase as the database + auth + file storage. Edit
everything from `admin.html`; visitors only ever see `index.html`.

```
index.html          → public portfolio (reads from Supabase)
admin.html           → owner-only CMS dashboard (writes to Supabase)
login.html            → admin sign-in
assets/css/styles.css → the whole design system
assets/js/
  supabase-config.js  → paste your project URL + anon key here (only file you must edit)
  common.js           → shared helpers (toast, uploads, nav, command palette)
  richtext.js          → lightweight rich-text editor (no Tiptap/React needed)
  main.js               → renders the public site
  admin.js              → CMS logic (auth guard + CRUD for every section)
supabase/schema.sql      → run once in the Supabase SQL editor
```

## 1. Create a Supabase project
1. Go to supabase.com → New project. Note the project's **Project URL** and **anon public key** (Project Settings → API).

## 2. Run the schema
1. Open **SQL Editor** in the Supabase dashboard → New query.
2. Paste the entire contents of `supabase/schema.sql` and run it.
   This creates every table (profile, about, projects, skills, certificates,
   notes, learning, gallery, settings), row-level-security policies (public
   read, owner-only write), the `portfolio-media` storage bucket, and a
   visitor-counter function.

## 3. Create your admin login
1. **Authentication → Users → Add user** — create your own email + password. This is the only account that should exist.
2. **Authentication → Settings** — turn **off** "Allow new users to sign up." This is a single-owner CMS; nobody else should be able to register.

## 4. Connect the site to your project
Open `assets/js/supabase-config.js` and replace the two placeholders:
```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```
That's the only code change required. Everything else is edited later from
the admin dashboard — no redeploys needed for content changes.

## 5. Try it locally (optional)
Any static server works, e.g.:
```
npx serve .
```
Open `/login.html`, sign in with the account from step 3, and start filling
in Home, About, Projects, Skills, etc. Then open `/index.html` to see it live.

## 6. Deploy to GitHub Pages
1. Push this folder to a GitHub repo.
2. Repo → **Settings → Pages** → Source: deploy from branch → pick `main` and `/ (root)`.
3. Your site is live at `https://<username>.github.io/<repo>/`.
   `index.html` is the public portfolio; `/admin.html` is your private dashboard
   (protected by the Supabase login — not by obscurity, so it's safe to be public).

## Notes
- **Images/files**: every upload (avatar, thumbnails, resume PDF, certificate
  PDFs, gallery photos) goes to the `portfolio-media` Supabase Storage bucket
  and is referenced by public URL — nothing is stored in the git repo.
- **Rich text**: About, Projects, and Tech Notes use a small built-in editor
  (bold/italic/headings/lists/quote/code block/table/links/images) — it saves
  plain HTML to the database, no external editor library required.
- **Visitor counter**: increments via a `security definer` Postgres function
  so anonymous visitors can bump the count without write access to the table.
- **Command palette**: press `Ctrl/Cmd + K` on the public site to jump to any section.
- **RLS model**: since this is a single-owner site, "authenticated" = you.
  If you ever want multiple editors, tighten the policies in `schema.sql` to
  check a specific `auth.uid()` allow-list instead of any authenticated user.
