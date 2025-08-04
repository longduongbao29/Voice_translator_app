# Logging System Documentation

## Overview

The Voice Translator App uses a comprehensive logging system built on Python's standard logging library with custom enhancements for better debugging, monitoring, and production support.

## Features

### 1. **Environment-based Configuration**
- **Development**: Colored console output + file logging
- **Production**: JSON formatted logs for structured logging

### 2. **Multiple Log Levels**
- `DEBUG`: Detailed information for diagnosing problems
- `INFO`: General information about application flow
- `WARNING`: Something unexpected happened but the app is still working
- `ERROR`: A serious problem occurred
- `CRITICAL`: The application cannot continue

### 3. **Specialized Logging Methods**
- `log_api_request()`: HTTP request/response logging
- `log_translation_request()`: Translation-specific logging
- `log_authentication()`: Authentication events
- `log_database_operation()`: Database operations

### 4. **Automatic Request Tracking**
- Unique request IDs for tracing requests
- Request duration measurement
- Client IP and User-Agent logging

### 5. **Caching and Performance Monitoring**
- Cache hit/miss logging
- Translation service performance tracking
- Database connection monitoring

## Configuration

Set these environment variables:

```bash
# Required
ENVIRONMENT=development  # or 'production'
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Optional (with defaults)
PROJECT_NAME=Voice Translator API
```

## Usage Examples

### Basic Logging

```python
from app.utils.logger import logger

# Simple logging
logger.info("Application started")
logger.error("Database connection failed")
logger.debug("Processing translation request")

# With additional context
logger.info("User authenticated", user_id="123", ip_address="192.168.1.1")
```

### API Request Logging

```python
# Automatically handled by LoggingMiddleware
# Logs request start, completion, duration, and status
```

### Translation Logging

```python
logger.log_translation_request(
    source_lang="en",
    target_lang="vi", 
    text_length=150,
    user_id="user123",
    translation_service="google"
)
```

### Authentication Logging

```python
logger.log_authentication(
    user_id="user123",
    action="login",
    success=True,
    ip_address="192.168.1.1"
)
```

### Database Operation Logging

```python
logger.log_database_operation(
    operation="create",
    table="users",
    record_id="123",
    user_id="user456"
)
```

## Log Output Formats

### Development (Colored Console)
```
2024-07-28 10:30:45 - voice_translator - INFO - [main:health_check:45] - Health check passed
```

### Production (JSON)
```json
{
  "timestamp": "2024-07-28T10:30:45.123456",
  "level": "INFO",
  "logger": "voice_translator",
  "message": "Health check passed",
  "module": "main",
  "function": "health_check",
  "line": 45,
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## File Structure

```
backend/
├── logs/                              # Log files directory
│   ├── voice_translator_dev.log       # Development logs
│   └── errors.log                     # Production error logs
├── app/
│   └── utils/
│       ├── logger.py                  # Main logger implementation
│       └── middleware.py              # HTTP logging middleware
```

## Log Files

### Development Mode
- **Console**: Colored, human-readable output
- **File**: `logs/voice_translator_dev.log` (all levels)

### Production Mode
- **Console**: JSON formatted (for container logs)
- **File**: `logs/errors.log` (ERROR level and above)

## Middleware Components

### LoggingMiddleware
- Logs all HTTP requests/responses
- Adds unique request IDs
- Measures request duration
- Captures client information

### ErrorLoggingMiddleware
- Catches unhandled exceptions
- Logs detailed error information
- Preserves stack traces

## Best Practices

### 1. **Log Levels**
- Use `DEBUG` for detailed diagnostic info
- Use `INFO` for general application flow
- Use `WARNING` for unexpected but recoverable situations
- Use `ERROR` for serious problems
- Use `CRITICAL` for application-stopping issues

### 2. **Structured Logging**
- Always include relevant context (user_id, request_id, etc.)
- Use consistent field names across the application
- Include performance metrics when relevant

### 3. **Security**
- Never log sensitive data (passwords, tokens, PII)
- Sanitize user input before logging
- Use log level filtering in production

### 4. **Performance**
- Avoid expensive operations in log messages
- Use lazy evaluation for log message formatting
- Consider log volume in high-traffic scenarios

## Monitoring and Alerts

### Key Metrics to Monitor
- Error rate (HTTP 4xx/5xx responses)
- Translation service failures
- Authentication failures
- Database connection issues
- Cache performance

### Recommended Alerts
- High error rate (>5% over 5 minutes)
- Authentication failure spike
- Database connectivity issues
- Translation service downtime

## Integration with External Systems

### Log Aggregation
The JSON format in production is compatible with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Fluentd**
- **Splunk**
- **DataDog**
- **CloudWatch Logs**

### Example Fluentd Configuration
```xml
<source>
  @type tail
  path /app/logs/*.log
  pos_file /var/log/fluentd/voice_translator.log.pos
  tag voice_translator
  format json
</source>
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check `LOG_LEVEL` environment variable
   - Verify `logs/` directory permissions
   - Check if handlers are properly configured

2. **Performance impact**
   - Reduce log level in production
   - Implement log rotation
   - Consider async logging for high-throughput scenarios

3. **Large log files**
   - Implement log rotation
   - Use log aggregation systems
   - Set appropriate retention policies

### Debug Mode
```python
# Enable debug logging temporarily
logger.logger.setLevel(logging.DEBUG)
```

## Security Considerations

- Logs may contain sensitive request information
- Implement proper log file permissions
- Consider log encryption for sensitive environments
- Regular log file cleanup and rotation
- Audit log access in production environments
