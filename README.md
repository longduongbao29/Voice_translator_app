# Voice Translator Backend

FastAPI-based backend server for multilingual voice translation application.

## Features

- 🌍 **Multi-language Translation**: Support for 50+ languages
- 🔣 **Translation input: Support translate text, record and upload audio files
- 🔄 **Multiple Translation Engines**: Google Translate, Groq API, Elevenlabs API
- 🗣️ **Language Detection**: Automatic language detection
- 🔐 **User Authentication**: JWT-based auth system
- 📊 **Translation History**: Store and retrieve translation history
- ⚡ **Redis Caching**: Fast response with Redis caching
- 🐘 **PostgreSQL Database**: Reliable data storage
- 📝 **API Documentation**: Auto-generated OpenAPI docs

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy
- **Cache**: Redis
- **Authentication**: JWT + OAuth2
- **Translation**: Google Translate API, Groq API, Elevenlabs API
- **Language Detection**: langdetect
- **Deployment**: Uvicorn ASGI server

## Quick Start

### 1. Environment Configuration

Check out `.env.example` file and config with your configurations:

```env
# API Keys
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# JWT
SECRET_KEY=voice_translator_system_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

GROQ_API_KEY=

NGROK_AUTHTOKEN=

DISCORD_BOT_TOKEN=

ELEVENLABS_API_KEY=
```
### 2. Run services

```bash
docker compose up -d
```

## API Endpoints

### Translation

- `POST /api/v1/translate/translate` - Translate text
- `POST /api/v1/translate/detect-language` - Detect language
- `GET /api/v1/translate/languages` - Get supported languages
- `GET /api/v1/translate/history` - Get translation history

### Authentication

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Health

- `GET /health` - Health check
- `GET /` - API information

## API Usage Examples

### Translate Text

```bash
curl -X POST "http://localhost:8000/api/v1/translate/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "source_language": "en",
    "target_language": "vi",
    "engine": "google"
  }'
```

### Detect Language

```bash
curl -X POST "http://localhost:8000/api/v1/translate/detect-language" \
  -H "Content-Type: application/json" \
  -d '{"text": "Xin chào thế giới"}'
```

### Register User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

## Supported Languages

The API supports translation between 50+ languages including:

- English (en)
- Vietnamese (vi)
- French (fr)
- German (de)
- Spanish (es)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Thai (th)
- Arabic (ar)
- ...
## Development

### Project Structure

```
backend
  ├── alembic
  │   ├── env.py
  │   ├── script.py.mako
  │   └── versions
  ├── alembic.ini
  ├── app
  │   ├── api
  │   ├── connect_app
  │   ├── database
  │   ├── public
  │   ├── services
  │   └── utils
  ├── build.sh
  ├── Dockerfile
  ├── logs
  │   └── voice_translator_dev.log
  ├── main.py
  ├── migrate.sh
  └── requirements.txt
frontend
  ├── build.sh
  ├── Dockerfile
  ├── nginx.conf
  ├── package.json
  ├── package-lock.json
  ├── postcss.config.js
  ├── public
  │   ├── index.html
  │   └── manifest.json
  ├── src
  │   ├── App.tsx
  │   ├── components
  │   ├── context
  │   ├── hooks
  │   ├── index.tsx
  │   ├── pages
  │   ├── services
  │   ├── styles
  │   └── types
  └── tailwind.config.js
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json


