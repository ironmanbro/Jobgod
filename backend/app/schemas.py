from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class JobIn(BaseModel):
    company_slug: str
    company_name: str
    title: str
    url: HttpUrl
    location: str | None = None
    department: str | None = None
    employment_type: str | None = None
    description: str | None = None
    external_id: str | None = None
    source_id: int | None = None
    posted_at: datetime | None = None


class JobBatch(BaseModel):
    jobs: list[JobIn] = Field(min_length=1, max_length=1000)


class UpsertResult(BaseModel):
    received: int
    inserted: int
    updated: int


class JobOut(BaseModel):
    id: int
    company: str
    title: str
    location: str | None
    department: str | None
    employment_type: str | None
    url: str
    posted_at: datetime | None


class JobDetail(JobOut):
    description: str | None


class JobPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[JobOut]
