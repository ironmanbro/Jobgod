from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .cache import close_cache, init_cache
from .config import settings
from .db import create_pool
from .routers import jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    init_cache()
    yield
    await close_cache()
    await app.state.pool.close()


def setup_cors(app: FastAPI) -> None:
    """Allow only the origins listed in CORS_ORIGINS (e.g. your Vercel domain)."""
    origins = [o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()]
    if not origins:
        return  # same-origin / server-side calls only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-API-Key"],
        allow_credentials=False,
        max_age=600,
    )


app = FastAPI(title="Job Aggregator", lifespan=lifespan)
setup_cors(app)
app.include_router(jobs.router)
