-- Application tracker. Fresh installs: auto-loaded by docker-compose.
-- Existing DBs: psql "$DATABASE_URL" -f sql/002_applications.sql
CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id     BIGINT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'Saved'
               CHECK (status IN ('Saved','Applied','Interviewing','Offer','Rejected')),
    applied_at TIMESTAMPTZ,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_applications_user_job UNIQUE (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications (job_id);
