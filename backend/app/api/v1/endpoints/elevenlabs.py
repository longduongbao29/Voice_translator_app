import os
import json
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.postgres import get_db
from app.services.auth import verify_token, get_user_by_username
from app.database.models import ElevenLabsSettings
from app.api.schemas.schemas import (
    ElevenLabsSettingsResponse, ElevenLabsSettingsUpdate, 
    VoiceCloneRequest, VoiceCloneResponse
)
import httpx

from app.utils.logger import Logger

logger = Logger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)

@router.get("/settings", response_model=ElevenLabsSettingsResponse)
async def get_elevenlabs_settings(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's ElevenLabs settings"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        username = verify_token(credentials.credentials)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get or create ElevenLabs settings
        settings = db.query(ElevenLabsSettings).filter_by(user_id=user.id).first()
        if not settings:
            # Create default settings
            settings = ElevenLabsSettings(
                user_id=user.id,
                model_id="eleven_v3",
                voice_id="JBFqnCBsd6RMkjVDRZzb",
                voice_name="George",
                voice_settings={
                    "stability": 0.5,
                    "similarity_boost": 0.8,
                    "style": 0.0,
                    "use_speaker_boost": True
                },
                cloned_voices=[]
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
            
        return settings
        
    except Exception as e:
        logger.error(f"Error getting ElevenLabs settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings", response_model=ElevenLabsSettingsResponse)
async def update_elevenlabs_settings(
    settings_update: ElevenLabsSettingsUpdate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update user's ElevenLabs settings"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        username = verify_token(credentials.credentials)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get existing settings
        settings = db.query(ElevenLabsSettings).filter_by(user_id=user.id).first()
        if not settings:
            # Create new settings
            settings = ElevenLabsSettings(user_id=user.id)
            db.add(settings)
        
        # Update fields
        update_data = settings_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        
        db.commit()
        db.refresh(settings)
        return settings
        
    except Exception as e:
        logger.error(f"Error updating ElevenLabs settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def get_available_voices(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get available ElevenLabs voices"""
    try:
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            # Return default voices if no API key
            return {
                "voices": [
                    {"voice_id": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "category": "premade"},
                    {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "category": "premade"},
                    {"voice_id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "category": "premade"},
                    {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "category": "premade"},
                    {"voice_id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "category": "premade"},
                    {"voice_id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "category": "premade"},
                    {"voice_id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "category": "premade"},
                    {"voice_id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "category": "premade"},
                    {"voice_id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "category": "premade"},
                    {"voice_id": "yoZ06aMxZJJ28mfd3POQ", "name": "Sam", "category": "premade"}
                ]
            }
        
        # Call ElevenLabs API to get voices
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": api_key}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"ElevenLabs API error: {response.status_code}")
                raise HTTPException(status_code=500, detail="Failed to fetch voices")
                
    except Exception as e:
        logger.error(f"Error getting voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_available_models():
    """Get available ElevenLabs models"""
    try:
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            # Return default models if no API key
            return {
                "models": [
                    {
                        "model_id": "eleven_multilingual_v2",
                        "name": "Eleven Multilingual v2",
                        "description": "Cutting edge multilingual speech synthesis, supporting 29 languages",
                        "can_do_text_to_speech": True
                    },
                    {
                        "model_id": "eleven_multilingual_v1", 
                        "name": "Eleven Multilingual v1",
                        "description": "Versatile, supports 28 languages",
                        "can_do_text_to_speech": True
                    },
                    {
                        "model_id": "eleven_monolingual_v1",
                        "name": "Eleven English v1", 
                        "description": "Our first English language model, highly versatile",
                        "can_do_text_to_speech": True
                    },
                    {
                        "model_id": "eleven_turbo_v2",
                        "name": "Eleven Turbo v2",
                        "description": "Fastest model, optimized for real-time applications",
                        "can_do_text_to_speech": True
                    }
                ]
            }
        
        # Call ElevenLabs API to get models
        # logger.info(f"Fetching models from ElevenLabs API with key: {api_key[:10]}...")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/models",
                headers={"xi-api-key": api_key},
                timeout=30.0
            )
            
            if response.status_code == 200:
                models_data = response.json()
                # logger.info(f"Received models data: {models_data}")
                
                # According to API docs, response is directly an array of models
                if isinstance(models_data, list):
                    # Filter models that support text-to-speech
                    tts_models = []
                    for model in models_data:
                        if model.get("can_do_text_to_speech", False):
                            tts_models.append({
                                "model_id": model["model_id"],
                                "name": model["name"],
                                "description": model.get("description", ""),
                                "can_do_text_to_speech": model["can_do_text_to_speech"],
                                "token_cost_factor": model.get("token_cost_factor", 1.0),
                                "can_use_style": model.get("can_use_style", False),
                                "can_use_speaker_boost": model.get("can_use_speaker_boost", False),
                                "max_characters_request_free_user": model.get("max_characters_request_free_user", 0),
                                "max_characters_request_subscribed_user": model.get("max_characters_request_subscribed_user", 0),
                                "languages": model.get("languages", [])
                            })
                    
                    return {"models": tts_models}
                else:
                    logger.error(f"Unexpected API response format: {type(models_data)}")
                    raise HTTPException(status_code=500, detail="Unexpected API response format")
            else:
                error_text = response.text
                logger.error(f"ElevenLabs API error: {response.status_code} - {error_text}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch models: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-api")
async def test_elevenlabs_api():
    """Test ElevenLabs API connection"""
    try:
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            return {"status": "error", "message": "No API key configured"}
        
        # Test with a simple API call
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": api_key},
                timeout=10.0
            )
            
            return {
                "status": "success" if response.status_code == 200 else "error",
                "status_code": response.status_code,
                "api_key_length": len(api_key),
                "response": response.json() if response.status_code == 200 else response.text
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/clone-voice", response_model=VoiceCloneResponse)
async def clone_voice(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    remove_background_noise: Optional[bool] = Form(True),
    labels: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Clone a voice using uploaded audio files"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        username = verify_token(credentials.credentials)
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise HTTPException(status_code=400, detail="ElevenLabs API key not configured")
        
        # Validate files - should be audio files
        allowed_audio_types = [
            "audio/wav", "audio/mp3", "audio/mpeg", "audio/mp4", "audio/m4a",
            "audio/ogg", "audio/flac", "audio/webm", "audio/aac"
        ]
        
        for file in files:
            if file.content_type not in allowed_audio_types:
                logger.warning(f"Invalid file type: {file.content_type} for file: {file.filename}")
                # Allow anyway but log warning - ElevenLabs will handle validation
        
        # Prepare files for upload - ElevenLabs expects files as multipart form data
        upload_files = []
        total_size = 0
        
        for file in files:
            content = await file.read()
            file_size = len(content)
            total_size += file_size
            
            logger.info(f"Processing file: {file.filename}, size: {file_size} bytes, type: {file.content_type}")
            upload_files.append(("files", (file.filename, content, file.content_type)))
        
        logger.info(f"Voice cloning request - User: {username}, Name: {name}, Files: {len(files)}, Total size: {total_size} bytes")
        
        # Prepare form data according to API specification
        form_data = {
            "name": name,
        }
        
        # Add optional fields only if they have values
        if description:
            form_data["description"] = description
        if labels:
            form_data["labels"] = labels
        if remove_background_noise is not None:
            form_data["remove_background_noise"] = str(remove_background_noise).lower()
        
        # Call ElevenLabs voice cloning API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/voices/add",
                headers={"xi-api-key": api_key},
                files=upload_files,
                data=form_data,
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Log the response for debugging
                logger.info(f"ElevenLabs voice cloning response: {result}")
                
                # Check if verification is required
                requires_verification = result.get("requires_verification", False)
                
                # Save cloned voice to user settings
                settings = db.query(ElevenLabsSettings).filter_by(user_id=user.id).first()
                if settings:
                    if not settings.cloned_voices:
                        settings.cloned_voices = []
                    
                    cloned_voice_data = {
                        "voice_id": result["voice_id"],
                        "name": name,
                        "description": description or f"Voice cloned by {username}",
                        "created_at": str(datetime.now()),
                        "requires_verification": requires_verification
                    }
                    
                    settings.cloned_voices.append(cloned_voice_data)
                    db.commit()
                
                return VoiceCloneResponse(
                    voice_id=result["voice_id"],
                    name=name,
                    status="success" if not requires_verification else "pending_verification",
                    requires_verification=requires_verification
                )
            else:
                error_text = response.text
                logger.error(f"Voice cloning failed: {response.status_code} - {error_text}")
                
                # Try to parse error response from ElevenLabs
                try:
                    error_data = response.json()
                    
                    # Handle nested error structure from ElevenLabs
                    if "detail" in error_data and isinstance(error_data["detail"], dict):
                        nested_detail = error_data["detail"]
                        status = nested_detail.get("status", "unknown_error")
                        message = nested_detail.get("message", "Unknown error occurred")
                        
                        # Map specific ElevenLabs errors to user-friendly messages
                        if status == "can_not_use_instant_voice_cloning":
                            error_detail = "Your subscription doesn't have access to voice cloning. Please upgrade your ElevenLabs plan."
                        elif status == "insufficient_credits":
                            error_detail = "Insufficient credits in your ElevenLabs account."
                        elif status == "file_too_large":
                            error_detail = "Audio file is too large. Please use smaller files."
                        elif status == "invalid_file_format":
                            error_detail = "Invalid audio file format. Please use WAV, MP3, or FLAC files."
                        else:
                            error_detail = f"ElevenLabs Error: {message}"
                    
                    elif "detail" in error_data:
                        error_detail = str(error_data["detail"])
                    else:
                        error_detail = error_text
                        
                except Exception as parse_error:
                    logger.warning(f"Failed to parse error response: {parse_error}")
                    error_detail = error_text
                
                # Use appropriate HTTP status code
                if response.status_code == 400:
                    status_code = 400  # Bad Request
                elif response.status_code == 401:
                    status_code = 401  # Unauthorized
                elif response.status_code == 403:
                    status_code = 403  # Forbidden (subscription issue)
                elif response.status_code == 429:
                    status_code = 429  # Too Many Requests
                else:
                    status_code = 502  # Bad Gateway (external service error)
                
                raise HTTPException(
                    status_code=status_code,
                    detail=error_detail
                )
                
    except HTTPException:
        # Re-raise HTTPExceptions as-is (don't catch our own raised exceptions)
        raise
    except Exception as e:
        logger.error(f"Error cloning voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clone-voice/validate")
async def validate_clone_voice_setup():
    """Validate voice cloning setup and requirements"""
    try:
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            return {
                "status": "error", 
                "message": "ElevenLabs API key not configured",
                "requirements": {
                    "api_key": False,
                    "file_types_supported": ["wav", "mp3", "m4a", "flac", "ogg"],
                    "max_files": 25,
                    "max_file_size_mb": 10
                }
            }
        
        # Test API connectivity
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": api_key},
                timeout=10.0
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "status": "ready",
                    "message": "Voice cloning is available",
                    "requirements": {
                        "api_key": True,
                        "file_types_supported": ["wav", "mp3", "m4a", "flac", "ogg"],
                        "max_files": 25,
                        "max_file_size_mb": 10
                    },
                    "user_info": {
                        "subscription": user_data.get("subscription", {}),
                        "character_limit": user_data.get("character_limit", 0),
                        "character_count": user_data.get("character_count", 0)
                    }
                }
            else:
                return {
                    "status": "error",
                    "message": f"API connection failed: {response.status_code}",
                    "requirements": {
                        "api_key": False,
                        "file_types_supported": ["wav", "mp3", "m4a", "flac", "ogg"],
                        "max_files": 25,
                        "max_file_size_mb": 10
                    }
                }
                
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "requirements": {
                "api_key": False,
                "file_types_supported": ["wav", "mp3", "m4a", "flac", "ogg"],
                "max_files": 25,
                "max_file_size_mb": 10
            }
        }