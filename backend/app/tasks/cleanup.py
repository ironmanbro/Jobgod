"""Mark dead job listings inactive (404/410 or any redirect).

Run from cron / a scheduler:  python -m app.tasks.cleanup
Network errors, timeouts, 403/429/5xx are treated as "unknown" and left untouched.
"""
import asyncio
import logging

import asyncpg
import httpx

from ..config import settings

CONCURRENCY, CHUNK, TIMEOUT = 10, 500, 15
HEADERS = {"User-Agent": "JobAggregatorBot/1.0 (link checker)"}

log = logging.getLogger("cleanup")


async def probe(client: httpx.AsyncClient, url: str) -> int:
    r = await client.head(url)
    if r.status_code in (403, 405, 501):  # some servers reject HEAD
        async with client.stream("GET", url) as g:  # headers only, body not read
            return g.status_code
    return r.status_code


async def is_dead(client: httpx.AsyncClient, url: str) -> bool | None:
    """True = dead, False = alive, None = couldn't tell."""
    try:
        code = await probe(client, url)
    except (httpx.HTTPError, httpx.InvalidURL) as e:
        log.warning("%s: %s", url, type(e).__name__)
        return None
    return code in (404, 410) or 300 <= code < 400


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=2)
    sem = asyncio.Semaphore(CONCURRENCY)
    checked = dead_total = unknown = 0
    last_id = 0

    async def check(client, row):
        async with sem:
            return row["id"], await is_dead(client, row["url"])

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False, headers=HEADERS) as client:
        while rows := await pool.fetch(
            "SELECT id, url FROM job_listings WHERE is_active AND id > $1 ORDER BY id LIMIT $2",
            last_id, CHUNK,
        ):
            last_id = rows[-1]["id"]
            results = await asyncio.gather(*(check(client, r) for r in rows))
            dead = [i for i, d in results if d is True]
            if dead:
                await pool.execute(
                    "UPDATE job_listings SET is_active = FALSE, updated_at = now() WHERE id = ANY($1::bigint[])",
                    dead,
                )
            checked += len(rows)
            dead_total += len(dead)
            unknown += sum(d is None for _, d in results)
            log.info("progress: %d checked, %d deactivated", checked, dead_total)

    await pool.close()
    log.info("DONE: %d checked, %d deactivated, %d inconclusive", checked, dead_total, unknown)


if __name__ == "__main__":
    asyncio.run(main())
