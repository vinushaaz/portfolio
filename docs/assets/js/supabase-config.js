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
var SUPABASE_URL = "sb_publishable_LyT-KhiBQSXTvnZrKBQiUA_T_lFaclo";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2VsZWp3aGRjeXJudmN3a25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNTQyNzgsImV4cCI6MjEwMTgzMDI3OH0.Uu7f0PyfZmNON1tI14lMaUkHNVbqN1kr9hXszFp9VC4";

// Storage bucket used for all uploaded media (avatar, thumbnails, resume, pdfs...)
var MEDIA_BUCKET = "portfolio-media";

// One shared Supabase client, reused even if this script is accidentally
// included more than once on the same page.
if (typeof window.sb === "undefined") {
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var sb = window.sb;
