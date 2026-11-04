import asyncpg
from fastapi import Request

from .config import settings


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(settings.database_url, min_size=1, max_size=10)


def get_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool
