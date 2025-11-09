from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(UserBase):
    id: int
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserPreferences(BaseModel):
    default_source_language: Optional[str] = "auto"
    default_target_language: Optional[str] = "en"
    preferred_engine: Optional[str] = "google"
    preferred_speech2text: Optional[str] = "google"
    custom_endpoints_enabled: Optional[bool] = False
    webhooks_enabled: Optional[bool] = False

# UserSettings schemas
class UserSettingsBase(BaseModel):
    src_lang: Optional[str] = "auto"
    trg_lang: Optional[str] = "en"
    translate_api: Optional[str] = "google"
    stt_api: Optional[str] = "groq"
    text2speech_api: Optional[str] = "elevenlabs"

class UserSettingsCreate(UserSettingsBase):
    user_id: int

class UserSettingsUpdate(BaseModel):
    src_lang: Optional[str] = None
    trg_lang: Optional[str] = None
    translate_api: Optional[str] = None
    stt_api: Optional[str] = None
    text2speech_api: Optional[str] = None

class UserSettingsResponse(UserSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ElevenLabs Settings schemas
class ElevenLabsSettingsBase(BaseModel):
    model_id: Optional[str] = "eleven_multilingual_v2"
    voice_id: Optional[str] = "JBFqnCBsd6RMkjVDRZzb"
    voice_name: Optional[str] = "George"
    voice_settings: Optional[dict] = None
    cloned_voices: Optional[list] = None

class ElevenLabsSettingsCreate(ElevenLabsSettingsBase):
    user_id: int

class ElevenLabsSettingsUpdate(BaseModel):
    model_id: Optional[str] = None
    voice_id: Optional[str] = None
    voice_name: Optional[str] = None
    voice_settings: Optional[dict] = None
    cloned_voices: Optional[list] = None

class ElevenLabsSettingsResponse(ElevenLabsSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VoiceCloneRequest(BaseModel):
    name: str
    description: Optional[str] = None
    audio_files: list  # List of audio file paths or URLs

class VoiceCloneResponse(BaseModel):
    voice_id: str
    name: str
    status: str
    requires_verification: Optional[bool] = False
    
# Translation schemas
class TranslationRequest(BaseModel):
    text: str
    source_language: str
    target_language: str
    engine: Optional[str] = "google"  # google, openai, local

class TranslationResponse(BaseModel):
    id: Optional[int] = None
    source_text: str
    translated_text: str
    source_language: str
    target_language: str
    translation_engine: str
    is_favorite: Optional[bool] = False
    confidence: Optional[float] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TranslationFavoriteUpdate(BaseModel):
    is_favorite: bool

# Language schemas
class LanguageResponse(BaseModel):
    code: str
    name: str
    native_name: str
    supports_offline: bool
    
    class Config:
        from_attributes = True

# Detection schema
class LanguageDetectionResponse(BaseModel):
    detected_language: str
    confidence: float

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Custom Endpoint schemas
class CustomEndpointBase(BaseModel):
    name: str
    endpoint_type: str  # 'speech2text', 'translation', or 'text2speech'
    api_url: str
    api_key: Optional[str] = None
    meta_data: Optional[dict] = None
    is_active: Optional[bool] = False  # Default inactive until selected

class CustomEndpointCreate(CustomEndpointBase):
    pass

class CustomEndpointUpdate(BaseModel):
    name: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    meta_data: Optional[dict] = None
    is_active: Optional[bool] = None

class CustomEndpointResponse(CustomEndpointBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Webhook Integration schemas
class WebhookIntegrationBase(BaseModel):
    name: str
    platform: str  # 'slack', 'discord', 'zalo', 'custom'
    meta_data: Optional[dict] = None  # Stores webhook_url, secret_key, event_types, config and other platform-specific data

class WebhookIntegrationCreate(WebhookIntegrationBase):
    pass

class WebhookIntegrationUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    meta_data: Optional[dict] = None

class WebhookIntegrationResponse(WebhookIntegrationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
