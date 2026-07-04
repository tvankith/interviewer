import logging
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from core.config import CONFIG
from core.logging import configure_logging

configure_logging(CONFIG.LOG_LEVEL)

from agent.graph import lifespan_checkpointer, shutdown_langfuse
from api.agent import router as agent_router
from core.auth import require_user_id

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ai-server starting up (langfuse_enabled=%s)", CONFIG.LANGFUSE_ENABLED)
    async with lifespan_checkpointer():
        yield
    shutdown_langfuse()
    logger.info("ai-server shut down")


app = FastAPI(title="AI Server", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CONFIG.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.include_router(agent_router, prefix="/api", dependencies=[Depends(require_user_id)])


@app.get("/health")
async def health():
    return {"status": "ok"}
