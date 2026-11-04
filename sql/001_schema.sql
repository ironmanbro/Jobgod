CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE companies (
    id          BIGSERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    website     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_sources (
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ats_type        TEXT NOT NULL CHECK (ats_type IN ('greenhouse','lever','ashby','workday','other')),
    board_url       TEXT NOT NULL UNIQUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_scraped_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_sources_company ON job_sources (company_id);

CREATE TABLE job_listings (
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    source_id       BIGINT REFERENCES job_sources(id) ON DELETE SET NULL,
    external_id     TEXT,
    title           TEXT NOT NULL,
    location        TEXT,
    department      TEXT,
    employment_type TEXT,
    description     TEXT,
    url             TEXT NOT NULL,
    posted_at       TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_tsv      TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('english', coalesce(description,'')), 'C')
    ) STORED,
    CONSTRAINT uq_job_listings_url UNIQUE (url)
);

CREATE INDEX idx_jobs_search_tsv   ON job_listings USING GIN (search_tsv);
CREATE INDEX idx_jobs_title_trgm   ON job_listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_jobs_location_trgm ON job_listings USING GIN (location gin_trgm_ops);
CREATE INDEX idx_jobs_posted_at    ON job_listings (posted_at DESC NULLS LAST, id DESC) WHERE is_active;
CREATE INDEX idx_jobs_company      ON job_listings (company_id);
