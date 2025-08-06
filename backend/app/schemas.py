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
    theme: Optional[str] = "light"
    auto_detect: Optional[bool] = True

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
