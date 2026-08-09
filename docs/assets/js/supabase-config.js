// ============================================================================
// SUPABASE CONFIG
// Paste your project values below. Find them in:
// Supabase Dashboard → Project Settings → API
//
// NOTE: this file uses `var` instead of `const` on purpose. If this script
// tag ever ends up on the page twice (easy to do by accident while editing
// HTML), `var` can be safely redeclared — `const`/`let` cannot, and that
// mistake is exactly what causes a blank white/dark screen with a
// "Identifier has already been declared" error in the console.
// ============================================================================
var SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
var SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Storage bucket used for all uploaded media (avatar, thumbnails, resume, pdfs...)
var MEDIA_BUCKET = "portfolio-media";

// One shared Supabase client, reused even if this script is accidentally
// included more than once on the same page.
if (typeof window.sb === "undefined") {
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var sb = window.sb;
