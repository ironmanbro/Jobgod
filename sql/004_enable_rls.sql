-- Supabase exposes public tables over its REST API; lock them down.
-- The backend connects as the table owner (postgres), which bypasses RLS.
ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
