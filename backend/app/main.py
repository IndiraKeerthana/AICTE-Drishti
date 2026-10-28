from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.router import api_router
from app.services.baseline_service import ensure_baseline_records, ensure_default_users

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite database tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed default synthetic baseline institution & users
    db = SessionLocal()
    try:
        ensure_baseline_records(
            db=db,
            aicte_id="1-9988776655",
            inst_name="Sample Institute of Technology"
        )
        ensure_default_users(db=db)
    finally:
        db.close()

    
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="AICTE-Drishti: AI-powered application scrutiny, document verification and regulatory compliance support.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router)

# Root convenience redirect / health
@app.get("/")
def root():
    return {
        "platform": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs",
        "api_health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
