"""Run all Greenhouse + Lever scrapers and push results to the backend.

Usage: python backend/scrapers/run_scrapers.py [--api http://localhost:8000]
"""
import argparse
import asyncio
import logging
import os

import httpx

import greenhouse
import lever

GREENHOUSE_TOKENS = ["stripe", "airbnb", "coinbase"]
LEVER_TOKENS = ["netflix", "spotify"]

CONCURRENCY = 5
RETRIES = 2

log = logging.getLogger("run_scrapers")


async def scrape_one(sem, client, api, source, token):
    """Fetch + push one company. Never raises; returns (inserted, updated, ok)."""
    fetch = greenhouse.fetch_company if source == "greenhouse" else lever.fetch_company
    async with sem:
        for attempt in range(1, RETRIES + 2):
            try:
                jobs = await fetch(client, token)
                ins, upd = await greenhouse.push(client, api, jobs) if jobs else (0, 0)
                log.info("%s/%s: %d fetched, %d inserted, %d updated",
                         source, token, len(jobs), ins, upd)
                return ins, upd, True
            except httpx.HTTPStatusError as e:
                code = e.response.status_code
                if code < 500 and code != 429:  # 404 etc: retrying won't help
                    log.error("%s/%s: HTTP %d", source, token, code)
                    return 0, 0, False
                err = f"HTTP {code}"
            except (httpx.TimeoutException, httpx.TransportError) as e:
                err = f"{type(e).__name__}: {e}"
            except Exception as e:  # bad payload, validation error, etc.
                log.exception("%s/%s: unexpected error: %s", source, token, e)
                return 0, 0, False
            log.warning("%s/%s: %s (attempt %d/%d)", source, token, err, attempt, RETRIES + 1)
            await asyncio.sleep(2 ** attempt)
    log.error("%s/%s: giving up", source, token)
    return 0, 0, False


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=os.environ.get("BACKEND_API_URL", "http://localhost:8000"))
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    targets = [("greenhouse", t) for t in GREENHOUSE_TOKENS] + [("lever", t) for t in LEVER_TOKENS]
    sem = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(
        timeout=30, follow_redirects=True,
        headers={"X-API-Key": os.environ.get("API_SECRET_KEY", "")},
    ) as client:
        results = await asyncio.gather(
            *(scrape_one(sem, client, args.api, s, t) for s, t in targets)
        )

    ins = sum(r[0] for r in results)
    upd = sum(r[1] for r in results)
    failed = [f"{s}/{t}" for (s, t), r in zip(targets, results) if not r[2]]
    log.info("DONE: %d inserted, %d updated (%d total) across %d/%d companies",
             ins, upd, ins + upd, len(targets) - len(failed), len(targets))
    if failed:
        log.warning("Failed: %s", ", ".join(failed))


if __name__ == "__main__":
    asyncio.run(main())
