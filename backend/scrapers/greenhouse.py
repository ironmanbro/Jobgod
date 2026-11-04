"""Fetch Greenhouse jobs and push them to the aggregator API.

Usage: python backend/scrapers/greenhouse.py stripe airbnb [--api http://localhost:8000]
"""
import argparse
import asyncio
import html
import re
from datetime import datetime

import httpx
from pydantic import BaseModel, Field, HttpUrl

GH_BASE = "https://boards-api.greenhouse.io/v1/boards"
BATCH_SIZE = 500
MAX_DESC = 20_000


class GHLocation(BaseModel):
    name: str | None = None


class GHDepartment(BaseModel):
    name: str


class GHJob(BaseModel):
    id: int
    title: str
    absolute_url: HttpUrl
    location: GHLocation = GHLocation()
    content: str = ""
    departments: list[GHDepartment] = Field(default_factory=list)
    first_published: datetime | None = None
    updated_at: datetime | None = None


class GHBoard(BaseModel):
    jobs: list[GHJob]


class JobPayload(BaseModel):
    """Matches app.schemas.JobIn."""
    company_slug: str
    company_name: str
    title: str
    url: HttpUrl
    location: str | None = None
    department: str | None = None
    description: str | None = None
    external_id: str
    posted_at: datetime | None = None


class BatchPayload(BaseModel):
    jobs: list[JobPayload]


def clean_text(raw: str) -> str:
    """Greenhouse returns entity-escaped HTML: unescape, strip tags, collapse space."""
    text = html.unescape(raw)
    text = re.sub(r"(?i)</(p|li|div|h\d)>|<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t\xa0]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()[:MAX_DESC]


async def fetch_company(client: httpx.AsyncClient, token: str) -> list[JobPayload]:
    r = await client.get(f"{GH_BASE}/{token}/jobs", params={"content": "true"})
    r.raise_for_status()
    board = GHBoard.model_validate(r.json())

    name = token.replace("-", " ").title()
    meta = await client.get(f"{GH_BASE}/{token}")
    if meta.is_success:
        name = meta.json().get("name") or name

    return [
        JobPayload(
            company_slug=token,
            company_name=name,
            title=j.title,
            url=j.absolute_url,
            location=j.location.name,
            department=j.departments[0].name if j.departments else None,
            description=clean_text(j.content) or None,
            external_id=str(j.id),
            posted_at=j.first_published or j.updated_at,
        )
        for j in board.jobs
    ]


async def push(
    client: httpx.AsyncClient, api: str, jobs: list[JobPayload]
) -> tuple[int, int]:
    """Post jobs in batches; returns (inserted, updated) totals."""
    ins = upd = 0
    for i in range(0, len(jobs), BATCH_SIZE):
        batch = BatchPayload(jobs=jobs[i : i + BATCH_SIZE])
        r = await client.post(f"{api}/api/jobs", json=batch.model_dump(mode="json"))
        r.raise_for_status()
        res = r.json()
        ins, upd = ins + res["inserted"], upd + res["updated"]
        print("  ", res)
    return ins, upd


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("companies", nargs="+", help="Greenhouse board tokens")
    p.add_argument("--api", default="http://localhost:8000")
    args = p.parse_args()

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        results = await asyncio.gather(
            *(fetch_company(client, t) for t in args.companies), return_exceptions=True
        )
        for token, res in zip(args.companies, results):
            if isinstance(res, Exception):
                print(f"{token}: failed ({res})")
                continue
            print(f"{token}: {len(res)} jobs")
            if res:
                await push(client, args.api, res)


if __name__ == "__main__":
    asyncio.run(main())
