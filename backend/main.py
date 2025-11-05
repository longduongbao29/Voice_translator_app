from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.database.postgres import engine
from app.database.models import Base
from app.utils.logger import logger, log_startup, log_shutdown
from app.utils.middleware import LoggingMiddleware, ErrorLoggingMiddleware
from app.connect_app.discord_bot import discord_service
import os
import atexit
import asyncio
# Setup logging
log_startup()

# Create database tables
Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully")

# Initialize FastAPI app
app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Voice Translator API"),
    description="API for voice translation with multiple language support",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json"
)


@app.on_event("startup")
async def startup_event():
    """Startup tasks"""
    # Start Discord bot in background
    asyncio.create_task(discord_service.start_bot())
    logger.info("Discord bot started in background")


# Register shutdown handler
atexit.register(log_shutdown)

# Add logging middleware (order matters - add first)
app.add_middleware(ErrorLoggingMiddleware)
app.add_middleware(LoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("Middleware configured")

# Include API routes
app.include_router(api_router, prefix="/api")
logger.info("API routes configured")

@app.get("/")
async def root():
    """Root endpoint"""
    logger.info("Root endpoint accessed")
    return {
        "message": "Voice Translator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        logger.debug("Performing health check")
        
        # Test database connection
        from backend.app.database.postgres import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.debug("Database connection verified")
        
        # Test Redis connection
        from backend.app.database.postgres import get_redis
        redis_client = get_redis()
        redis_client.ping()
        logger.debug("Redis connection verified")
        
        logger.info("Health check passed")
        return {
            "status": "healthy",
            "database": "connected",
            "redis": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9003,
        reload=True
    )
