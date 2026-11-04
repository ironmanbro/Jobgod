import secrets

import asyncpg
from fastapi_cache.decorator import cache
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from ..cache import CACHE_NAMESPACE, CACHE_TTL, invalidate_jobs, jobs_key
from ..config import settings
from ..db import get_pool
from ..schemas import JobBatch, JobDetail, JobOut, JobPage, UpsertResult

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

UPSERT_COMPANY = """
INSERT INTO companies (slug, name) VALUES ($1, $2)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id
"""

UPSERT_JOB = """
INSERT INTO job_listings
    (company_id, source_id, external_id, title, location, department,
     employment_type, description, url, posted_at, company_name)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    company_name = EXCLUDED.company_name,
    location = EXCLUDED.location,
    department = EXCLUDED.department,
    employment_type = EXCLUDED.employment_type,
    description = EXCLUDED.description,
    posted_at = COALESCE(EXCLUDED.posted_at, job_listings.posted_at),
    is_active = TRUE,
    scraped_at = now(),
    updated_at = now()
RETURNING (xmax = 0) AS inserted
"""


def require_key(x_api_key: str = Header("")):
    expected = settings.api_secret_key
    if not expected:  # fail closed if the server is misconfigured
        raise HTTPException(500, "API_SECRET_KEY is not configured")
    if not secrets.compare_digest(x_api_key.encode(), expected.encode()):
        raise HTTPException(401, "Invalid API key")


@router.post("", response_model=UpsertResult, dependencies=[Depends(require_key)])
async def upsert_jobs(batch: JobBatch, pool: asyncpg.Pool = Depends(get_pool)):
    inserted = updated = 0
    # Dedupe by URL within the batch (last one wins)
    jobs = {str(j.url): j for j in batch.jobs}.values()
    async with pool.acquire() as conn, conn.transaction():
        company_ids: dict[str, int] = {}
        for j in jobs:
            if j.company_slug not in company_ids:
                company_ids[j.company_slug] = await conn.fetchval(
                    UPSERT_COMPANY, j.company_slug, j.company_name
                )
            was_inserted = await conn.fetchval(
                UPSERT_JOB, company_ids[j.company_slug], j.source_id, j.external_id,
                j.title, j.location, j.department, j.employment_type,
                j.description, str(j.url), j.posted_at, j.company_name,
            )
            inserted += was_inserted
            updated += not was_inserted
    await invalidate_jobs()  # new data landed: drop cached list pages
    return UpsertResult(received=len(batch.jobs), inserted=inserted, updated=updated)


@router.get("", response_model=JobPage)
@cache(expire=CACHE_TTL, namespace=CACHE_NAMESPACE, key_builder=jobs_key)
async def list_jobs(
    q: str | None = Query(None, description="Keyword search over title/description"),
    location: str | None = Query(None, description="Substring match on location"),
    company: str | None = Query(None, description="Company slug"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_pool),
):
    where, args = ["j.is_active"], []

    def add(cond: str, val):
        args.append(val)
        where.append(cond.replace("$#", f"${len(args)}"))

    if q:
        add("(j.search_tsv @@ websearch_to_tsquery('english', $#) OR j.title ILIKE '%' || $# || '%')", q)
    if location:
        add("j.location ILIKE '%' || $# || '%'", location)
    if company:
        add("c.slug = $#", company)

    args += [page_size, (page - 1) * page_size]
    sql = f"""
        SELECT j.id, j.company_name AS company, j.title, j.location, j.department,
               j.employment_type, j.url, j.posted_at, count(*) OVER() AS total
        FROM job_listings j JOIN companies c ON c.id = j.company_id
        WHERE {' AND '.join(where)}
        ORDER BY j.posted_at DESC NULLS LAST, j.id DESC
        LIMIT ${len(args) - 1} OFFSET ${len(args)}
    """
    rows = await pool.fetch(sql, *args)
    total = rows[0]["total"] if rows else 0
    items = [JobOut(**{k: v for k, v in r.items() if k != "total"}) for r in rows]
    return JobPage(total=total, page=page, page_size=page_size, items=items)


@router.get("/{job_id}", response_model=JobDetail)
async def get_job(job_id: int, pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow(
        """SELECT j.id, c.name AS company, j.title, j.location, j.department,
                  j.employment_type, j.url, j.posted_at, j.description
           FROM job_listings j JOIN companies c ON c.id = j.company_id
           WHERE j.id = $1""",
        job_id,
    )
    if row is None:
        raise HTTPException(404, "Job not found")
    return JobDetail(**row)
