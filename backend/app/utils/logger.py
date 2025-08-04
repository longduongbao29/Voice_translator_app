import logging
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import json


class ColoredFormatter(logging.Formatter):
    """Custom formatter to add colors to log messages in console output."""
    
    # Color codes for different log levels
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
    }
    RESET = '\033[0m'  # Reset color
    
    def format(self, record):
        # Add color to levelname
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.RESET}"
        
        return super().format(record)


class JSONFormatter(logging.Formatter):
    """Custom formatter to output logs in JSON format for production."""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'api_endpoint'):
            log_entry['api_endpoint'] = record.api_endpoint
            
        return json.dumps(log_entry)


class Logger:
    """
    Enhanced logger class for the Voice Translator App.
    Provides different formatters for development and production environments.
    """
    
    def __init__(self, name: str = "voice_translator"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Prevent duplicate handlers
        if self.logger.handlers:
            self.logger.handlers.clear()
        
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup logging handlers based on environment."""
        environment = os.getenv("ENVIRONMENT", "development").lower()
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        
        # Set log level
        self.logger.setLevel(getattr(logging, log_level, logging.INFO))
        
        if environment == "production":
            self._setup_production_logging()
        else:
            self._setup_development_logging()
    
    def _setup_development_logging(self):
        """Setup logging for development environment."""
        # Console handler with colors
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        
        console_formatter = ColoredFormatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - [%(module)s:%(funcName)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        # File handler for development
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(log_dir / "voice_translator_dev.log")
        file_handler.setLevel(logging.DEBUG)
        
        file_formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - [%(module)s:%(funcName)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
    
    def _setup_production_logging(self):
        """Setup logging for production environment."""
        # JSON formatted logs for production
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        json_formatter = JSONFormatter()
        console_handler.setFormatter(json_formatter)
        self.logger.addHandler(console_handler)
        
        # Error file handler
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        error_handler = logging.FileHandler(log_dir / "errors.log")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(json_formatter)
        self.logger.addHandler(error_handler)
    
    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message."""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message."""
        self.logger.error(message, extra=kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message."""
        self.logger.critical(message, extra=kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log exception with traceback."""
        self.logger.exception(message, extra=kwargs)
    
    def log_api_request(self, method: str, endpoint: str, user_id: Optional[str] = None, 
                       request_id: Optional[str] = None, status_code: Optional[int] = None,
                       duration: Optional[float] = None):
        """Log API request details."""
        message = f"{method} {endpoint}"
        if status_code:
            message += f" - {status_code}"
        if duration:
            message += f" - {duration:.3f}s"
        
        extra = {
            'api_endpoint': endpoint,
            'method': method,
            'user_id': user_id,
            'request_id': request_id,
            'status_code': status_code,
            'duration': duration
        }
        
        if status_code and status_code >= 400:
            self.error(message, **extra)
        else:
            self.info(message, **extra)
    
    def log_translation_request(self, source_lang: str, target_lang: str, 
                              text_length: int, user_id: Optional[str] = None,
                              translation_service: str = "default"):
        """Log translation request details."""
        message = f"Translation request: {source_lang} -> {target_lang}, length: {text_length}"
        
        extra = {
            'source_language': source_lang,
            'target_language': target_lang,
            'text_length': text_length,
            'user_id': user_id,
            'translation_service': translation_service
        }
        
        self.info(message, **extra)
    
    def log_authentication(self, user_id: str, action: str, success: bool = True,
                          ip_address: Optional[str] = None):
        """Log authentication events."""
        status = "successful" if success else "failed"
        message = f"Authentication {action} {status} for user {user_id}"
        
        extra = {
            'user_id': user_id,
            'auth_action': action,
            'auth_success': success,
            'ip_address': ip_address
        }
        
        if success:
            self.info(message, **extra)
        else:
            self.warning(message, **extra)
    
    def log_database_operation(self, operation: str, table: str, 
                             record_id: Optional[str] = None, 
                             user_id: Optional[str] = None):
        """Log database operations."""
        message = f"Database {operation} on {table}"
        if record_id:
            message += f" (ID: {record_id})"
        
        extra = {
            'db_operation': operation,
            'table': table,
            'record_id': record_id,
            'user_id': user_id
        }
        
        self.debug(message, **extra)


# Global logger instance
logger = Logger()

# Convenience functions for quick access
def get_logger(name: str = "voice_translator") -> Logger:
    """Get a logger instance."""
    return Logger(name)

def log_startup():
    """Log application startup."""
    environment = os.getenv("ENVIRONMENT", "development")
    logger.info(f"Voice Translator API starting up", 
               environment=environment, 
               python_version=sys.version)

def log_shutdown():
    """Log application shutdown."""
    logger.info("Voice Translator API shutting down")