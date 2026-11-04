-- Full-text search over title (A), company name (B), description (C).
-- A generated column can't read another table, so company_name is denormalised
-- onto job_listings (the POST /api/jobs upsert now writes it).
-- Existing DBs: psql "$DATABASE_URL" -f sql/003_search_index.sql
-- Rewrites the table: run in a quiet period (or build the index CONCURRENTLY on huge tables).
BEGIN;

ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS company_name TEXT;
UPDATE job_listings j SET company_name = c.name
  FROM companies c WHERE c.id = j.company_id AND j.company_name IS NULL;
ALTER TABLE job_listings ALTER COLUMN company_name SET NOT NULL;

DROP INDEX IF EXISTS idx_jobs_search_tsv;
ALTER TABLE job_listings DROP COLUMN IF EXISTS search_tsv;
ALTER TABLE job_listings ADD COLUMN search_tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(company_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;
CREATE INDEX idx_jobs_search_tsv ON job_listings USING GIN (search_tsv);

COMMIT;
