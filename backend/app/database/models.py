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
    endpoint_type = Column(String(50), nullable=False)  # 'speech2text', 'translation'
    endpoint_url = Column(String(255), nullable=False)
    api_key = Column(String(255), nullable=True)
    headers = Column(JSON, nullable=True)  # Additional headers as JSON
    is_active = Column(Boolean, default=False)  # Default inactive, activated when selected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WebhookIntegration(Base):
    __tablename__ = "webhook_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)  # 'slack', 'discord', 'zalo', 'custom'
    webhook_url = Column(String(255), nullable=False)
    secret_key = Column(String(255), nullable=True)  # For webhook verification
    event_types = Column(JSON, nullable=True)  # Events to trigger webhook, stored as JSON array
    config = Column(JSON, nullable=True)  # Platform-specific configuration
    is_active = Column(Boolean, default=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
