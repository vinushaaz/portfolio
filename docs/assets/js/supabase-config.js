// ============================================================================
// SUPABASE CONFIG
// Paste your project values below. Find them in:
// Supabase Dashboard → Project Settings → API
// ============================================================================
const SUPABASE_URL ="https://uakelejwhdcyrnvcwknn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LyT-KhiBQSXTvnZrKBQiUA_T_lFaclo";

// Storage bucket used for all uploaded media (avatar, thumbnails, resume, pdfs...)
const MEDIA_BUCKET = "portfolio-media";

// Creates one shared Supabase client for every page that includes this file.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
