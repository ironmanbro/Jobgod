"""Fetch Lever postings and push them to the aggregator API.

Usage: python backend/scrapers/lever.py netflix spotify [--api http://localhost:8000] [--eu]
"""
import argparse
import asyncio
from datetime import datetime, timezone

import httpx
from pydantic import BaseModel, Field, HttpUrl

from greenhouse import JobPayload, clean_text, push


class LeverCategories(BaseModel):
    location: str | None = None
    team: str | None = None
    department: str | None = None


class LeverList(BaseModel):
    text: str = ""
    content: str = ""


class LeverPosting(BaseModel):
    id: str
    text: str
    hostedUrl: HttpUrl
    categories: LeverCategories = LeverCategories()
    descriptionPlain: str = ""
    lists: list[LeverList] = Field(default_factory=list)
    additionalPlain: str = ""
    createdAt: int | None = None  # epoch ms


def build_description(p: LeverPosting) -> str | None:
    parts = [p.descriptionPlain]
    parts += [f"{l.text}\n{clean_text(l.content)}" for l in p.lists]
    parts.append(p.additionalPlain)
    return "\n\n".join(x.strip() for x in parts if x.strip())[:20_000] or None


async def fetch_company(
    client: httpx.AsyncClient, token: str, eu: bool = False
) -> list[JobPayload]:
    host = "api.eu.lever.co" if eu else "api.lever.co"
    r = await client.get(f"https://{host}/v0/postings/{token}", params={"mode": "json"})
    r.raise_for_status()
    name = token.replace("-", " ").title()  # Lever's API doesn't expose a company name

    return [
        JobPayload(
            company_slug=token,
            company_name=name,
            title=p.text,
            url=p.hostedUrl,
            location=p.categories.location,
            department=p.categories.department or p.categories.team,
            description=build_description(p),
            external_id=p.id,
            posted_at=(
                datetime.fromtimestamp(p.createdAt / 1000, tz=timezone.utc)
                if p.createdAt
                else None
            ),
        )
        for p in map(LeverPosting.model_validate, r.json())
    ]


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("companies", nargs="+", help="Lever company tokens")
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--eu", action="store_true", help="Use api.eu.lever.co")
    args = ap.parse_args()

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        results = await asyncio.gather(
            *(fetch_company(client, t, args.eu) for t in args.companies),
            return_exceptions=True,
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
