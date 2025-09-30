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
    endpoint_type: str  # 'speech2text' or 'translation'
    endpoint_url: str
    api_key: Optional[str] = None
    headers: Optional[dict] = None
    is_active: Optional[bool] = True

class CustomEndpointCreate(CustomEndpointBase):
    pass

class CustomEndpointUpdate(BaseModel):
    name: Optional[str] = None
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    headers: Optional[dict] = None
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
    webhook_url: str
    secret_key: Optional[str] = None
    event_types: Optional[List[str]] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = True

class WebhookIntegrationCreate(WebhookIntegrationBase):
    pass

class WebhookIntegrationUpdate(BaseModel):
    name: Optional[str] = None
    webhook_url: Optional[str] = None
    secret_key: Optional[str] = None
    event_types: Optional[List[str]] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None

class WebhookIntegrationResponse(WebhookIntegrationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
