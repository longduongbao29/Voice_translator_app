import os
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from app.database.postgres import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # NULL for anonymous users
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    source_language = Column(String(10), nullable=False)
    target_language = Column(String(10), nullable=False)
    translation_engine = Column(String(50), default="google")  # google, openai, local
    is_favorite = Column(Boolean, default=False)  # Flag for saved translations
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SupportedLanguage(Base):
    __tablename__ = "supported_languages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # vi, en, fr, etc.
    name = Column(String(100), nullable=False)  # Vietnamese, English, French
    native_name = Column(String(100), nullable=False)  # Tiếng Việt, English, Français
    is_active = Column(Boolean, default=True)
    supports_offline = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CustomEndpoint(Base):
    __tablename__ = "custom_endpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    endpoint_type = Column(String(50), nullable=False)  # 'speech2text', 'translation', 'text2speech'
    api_url = Column(String(255), nullable=False)  # Changed from endpoint_url for consistency
    api_key = Column(String(255), nullable=True)
    meta_data = Column(JSON, nullable=True)  # Additional config as JSON (headers, body_params, etc.)
    is_active = Column(Boolean, default=False)  # Default inactive, activated when selected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WebhookIntegration(Base):
    __tablename__ = "webhook_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)  # 'slack', 'discord', 'zalo', 'custom'
    meta_data = Column(JSON, nullable=True)  # Stores webhook_url, secret_key, event_types, config and other platform-specific data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True)  # One settings record per user
    src_lang = Column(String(10), nullable=True, default="auto")  # Source language (auto-detect by default)
    trg_lang = Column(String(10), nullable=True, default="en")  # Target language
    translate_api = Column(String(50), nullable=True, default="google")  # Translation API preference
    stt_api = Column(String(50), nullable=True, default="groq")  # Speech-to-text API preference
    text2speech_api = Column(String(50), nullable=True, default="elevenlabs")  # Text-to-speech API preference
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ElevenLabsSettings(Base):
    __tablename__ = "elevenlabs_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True)  # One ElevenLabs settings record per user
    model_id = Column(String(100), nullable=True, default="eleven_multilingual_v2")  # ElevenLabs model
    voice_id = Column(String(100), nullable=True, default="JBFqnCBsd6RMkjVDRZzb")  # Selected voice ID
    voice_name = Column(String(200), nullable=True, default="George")  # Voice display name
    voice_settings = Column(JSON, nullable=True)  # Voice settings (stability, similarity_boost, etc.)
    cloned_voices = Column(JSON, nullable=True)  # Array of cloned voice objects
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
