from __future__ import annotations

import time
import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.api.routes import health, auth, users, clinics, patients, cases, implants, fpd, dashboard, notifications, audit, abutment, overdenture, flat_routes

logger = logging.getLogger("dentalhub")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    from app.services.notifications import start_scheduler
    start_scheduler()
    yield


def create_app() -> FastAPI:
    app = FastAPI(lifespan=_lifespan,
        title="DentalHub API",
        version="2.0.0",
        description="Production backend for DentalHub dental implant case management.",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins = [
        settings.FRONTEND_URL,
        "https://app.osiolog.com",
        "https://osiolog.com",
        "https://www.osiolog.com",
        # Capacitor mobile apps
        "capacitor://localhost",
        "ionic://localhost",
    ]
    if settings.ENVIRONMENT == "development":
        allowed_origins += [
            # Web dev server
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            # Capacitor Android (androidScheme: "http") — app loads from http://localhost
            "http://localhost",
            # Capacitor Android (androidScheme: "https") — app loads from https://localhost
            "https://localhost",
            # Capacitor iOS — default scheme is capacitor://localhost
            "capacitor://localhost",
            # Capacitor iOS — ionic:// used by some older Capacitor/Ionic versions
            "ionic://localhost",
            # Physical Android device on same LAN (dev only) — allow all http origins
            # In production this list is replaced by the real FRONTEND_URL
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Request logging middleware ─────────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # noqa: ANN001, ANN202
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "%s %s → %s  (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    # ── Global exception handlers ─────────────────────────────────────────────
    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):  # noqa: ANN001, ANN202
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(request: Request, exc: ForbiddenError):  # noqa: ANN001, ANN202
        return JSONResponse(status_code=403, content={"detail": exc.detail})

    @app.exception_handler(ConflictError)
    async def conflict_handler(request: Request, exc: ConflictError):  # noqa: ANN001, ANN202
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(clinics.router, prefix="/api")
    app.include_router(patients.router, prefix="/api")
    app.include_router(cases.router, prefix="/api")
    app.include_router(flat_routes.router, prefix="/api")
    app.include_router(implants.router, prefix="/api")
    app.include_router(fpd.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(audit.router, prefix="/api")
    app.include_router(abutment.router, prefix="/api")
    app.include_router(overdenture.router, prefix="/api")

    return app


app = create_app()
