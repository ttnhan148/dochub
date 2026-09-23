"""
DocHub - Main FastAPI Application Entrypoint
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo SQLite schema và FTS5 table khi startup
    await init_db()
    yield


app = FastAPI(
    title="DocHub API",
    description="Knowledge Base & Presentation Tool Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration: cho phép localhost dev và domain production
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "DocHub"}


# Phục vụ static bundle của React khi ở production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
