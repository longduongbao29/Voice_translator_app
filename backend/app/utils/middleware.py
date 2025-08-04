import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log HTTP requests and responses.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Log request start
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query_params=str(request.query_params),
            client_ip=client_ip,
            user_agent=request.headers.get("user-agent", "unknown")
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log request completion
        logger.log_api_request(
            method=request.method,
            endpoint=request.url.path,
            request_id=request_id,
            status_code=response.status_code,
            duration=duration
        )
        
        # Add request ID to response headers for tracking
        response.headers["X-Request-ID"] = request_id
        
        return response


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and log unhandled exceptions.
    """
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.exception(
                f"Unhandled exception in {request.method} {request.url.path}: {str(e)}",
                method=request.method,
                path=request.url.path,
                client_ip=request.client.host if request.client else "unknown"
            )
            # Re-raise the exception to let FastAPI handle it
            raise
