import os
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.postgres import get_db
from app.services.text2speech import TextToSpeechService

from app.utils.logger import Logger

logger = Logger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)

@router.get("/test")
async def test_endpoint():
    return {
        "message": "Text2Speech endpoint is working",
        "elevenlabs_configured": bool(os.getenv("ELEVENLABS_API_KEY")),
        "available_endpoints": ["synthesize", "voices", "formats"]
    }

@router.post("/synthesize")
async def synthesize_text(
    text: str = Form(...),
    language_code: Optional[str] = Form(None),
    voice_id: Optional[str] = Form(None),
    output_format: str = Form("mp3_44100_128"),
    model_name: str = Form("eleven_v3"),
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Endpoint to convert text to speech and return audio file"""
    
    # Get user_id from token if available
    user_id = None
    if credentials:
        try:
            from app.services.auth import verify_token, get_user_by_username
            username = verify_token(credentials.credentials)
            if username:
                user = get_user_by_username(db, username)
                if user:
                    user_id = user.id
        except Exception as e:
            logger.warning(f"Authentication failed: {e}")
            # Continue without user_id for anonymous users
    
    try:
        # Validate input
        if not text or len(text.strip()) == 0:
            raise HTTPException(status_code=422, detail="Text is required")
        
        if len(text) > 5000:  # ElevenLabs limit
            raise HTTPException(status_code=422, detail="Text too long (max 5000 characters)")
        
        logger.debug(f"Received TTS request. Text length: {len(text)}, Language: {language_code}, Voice: {voice_id}, Format: {output_format}, Model: {model_name}")

        # Initialize service and process text
        service = TextToSpeechService(model_name, user_id, db)
        
        # Call the text-to-speech API
        audio_data = await service.call_api(
            text=text,
            language_code=language_code,
            voice_id=voice_id,
            output_format=output_format
        )

        # Determine content type based on output format
        if output_format.startswith("mp3"):
            content_type = "audio/mpeg"
            file_extension = "mp3"
        elif output_format.startswith("pcm"):
            content_type = "audio/wav"
            file_extension = "wav"
        elif output_format.startswith("opus"):
            content_type = "audio/opus"
            file_extension = "opus"
        else:
            content_type = "audio/mpeg"  # Default to mp3
            file_extension = "mp3"

        # Generate filename
        filename = f"speech_{hash(text) % 1000000}.{file_extension}"
        
        # Return audio response
        return Response(
            content=audio_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(audio_data))
            }
        )

    except Exception as e:
        logger.error(f"Text-to-speech failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def get_voices(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get available voices for text-to-speech"""
    
    # Get user_id from token if available
    user_id = None
    if credentials:
        try:
            from app.services.auth import verify_token, get_user_by_username
            username = verify_token(credentials.credentials)
            if username:
                user = get_user_by_username(db, username)
                if user:
                    user_id = user.id
        except Exception as e:
            logger.warning(f"Authentication failed: {e}")
    
    try:
        service = TextToSpeechService(user_id=user_id, db=db)
        voices = service.get_supported_voices()
        
        return {
            "voices": voices,
            "default_voice": os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
        }

    except Exception as e:
        logger.error(f"Failed to get voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/formats")
async def get_formats():
    """Get supported audio output formats"""
    
    try:
        service = TextToSpeechService()
        formats = service.get_supported_formats()
        
        return {
            "formats": formats,
            "default_format": "mp3_44100_128"
        }
        
    except Exception as e:
        logger.error(f"Failed to get formats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
