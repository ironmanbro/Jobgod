"""Response caching for GET /api/jobs (fastapi-cache2 + Redis).

Invalidation uses a generation counter baked into every cache key: bumping it
orphans all cached pages at once (they expire via TTL) without KEYS/SCAN.
"""
import hashlib
import logging

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

from .config import settings

CACHE_TTL = 300  # 5 minutes
CACHE_NAMESPACE = "jobs"
GEN_KEY = "jobs-cache:generation"

log = logging.getLogger("cache")
_redis: aioredis.Redis | None = None
_local_gen = 0  # used when REDIS_URL is unset


def init_cache() -> None:
    global _redis
    if settings.redis_url:
        _redis = aioredis.from_url(settings.redis_url)  # lazy: no connection yet
        FastAPICache.init(RedisBackend(_redis), prefix="jobs-cache")
    else:
        FastAPICache.init(InMemoryBackend(), prefix="jobs-cache")


async def close_cache() -> None:
    if _redis:
        await _redis.aclose()


async def _generation() -> str:
    if _redis is None:
        return str(_local_gen)
    try:
        return (await _redis.get(GEN_KEY) or b"0").decode()
    except Exception:
        return "x"


async def jobs_key(func, namespace: str = "", *, request=None, response=None, args=None, kwargs=None) -> str:
    """Key on path + sorted query params (the default builder would hash the DB pool repr)."""
    raw = f"{request.url.path}?{sorted(request.query_params.multi_items())}"
    return f"{namespace}:{await _generation()}:{hashlib.md5(raw.encode()).hexdigest()}"


async def invalidate_jobs() -> None:
    global _local_gen
    try:
        if _redis:
            await _redis.incr(GEN_KEY)
        else:
            _local_gen += 1
    except Exception:
        log.warning("cache invalidation failed; entries expire within %ds", CACHE_TTL)
