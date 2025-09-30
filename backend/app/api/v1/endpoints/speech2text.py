import os
import json
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.postgres import get_db
from app.services.translation import TranslationService

from app.utils.logger import Logger
from app.services.speech2text import SpeechToTextService

logger = Logger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)

@router.get("/test")
async def test_endpoint():
    return {"message": "Speech2Text endpoint is working"}

@router.post("/transcribe")
async def transcribe_audio(
    audio: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    language: str = Form("auto"),
    target_language: str = Form("vi"),
    model_name: str = Form("whisper-large-v3"),
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Endpoint to transcribe audio file, detect language and translate to target language"""
    
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
        # Determine which form field was used by the client
        incoming_file = audio or audio_file
        if incoming_file is None:
            logger.debug("No audio file provided in request")
            raise HTTPException(status_code=422, detail="audio file is required")

        # Log incoming request details (avoid accessing .size)
        logger.debug(f"Received transcription request. File: {incoming_file.filename}, Content-Type: {incoming_file.content_type}, Language: {language}, Target: {target_language}, Model: {model_name}")

        # Read the audio data
        audio_data = await incoming_file.read()
        logger.debug(f"Audio data read, size: {len(audio_data)} bytes")

        # Initialize service and process audio (pass audio data directly to call_api)
        service = SpeechToTextService(model_name, language, user_id, db)
        # Use the new call_api method which checks custom endpoints first
        transcription = await service.call_api(audio_data, incoming_file.filename)

        # If no transcription, return empty
        if not transcription:
            return {"text": "", "translated_text": ""}

        translation_service = TranslationService()
        # Detect language of transcribed text if language was 'auto' or not provided
        detected = translation_service.detect_language(transcription)
        source_lang = detected.detected_language if detected and detected.detected_language else 'auto'

        # Translate to target_language using translation service (default to google)
        # Choose engine based on user preferences in future; for now use google
        try:
            translation_result = await translation_service.translate_text(
                transcription,
                source_lang,
                target_language,
                user_id,
                db
            )
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            # Fallback: return transcription only
            return {"text": transcription, "translated_text": ""}

        # Build response
        response = {
            "text": transcription,
            "source_language": source_lang,
            "translated_text": translation_result.translated_text,
            "target_language": translation_result.target_language,
            "translation_engine": translation_result.translation_engine
        }

        logger.debug(f"Transcription+translation completed: {response}")
        return response

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# @router.websocket("/realtimestt")
# async def websocket_endpoint(websocket: WebSocket, language: str = "en"):
#     logger.debug(f"WebSocket connection attempt with language: {language}")
#     await websocket.accept()
#     logger.debug("WebSocket connection accepted")
#     await websocket.send_text(json.dumps({
#         "status": "connected", 
#         "message": f"WebSocket ready to receive audio (language: {language})"
#     }))

#     temp_filename = "app/public/temp_chunk.webm"

#     try:
#         speech_service = SpeechToTextService("whisper-large-v3", temp_filename, language)
#         while True:
#             data = await websocket.receive_bytes()
#             if data:
#                 logger.debug(f"Received data chunk of size {len(data)} bytes")
#             if len(data) < 1024:  # Skip very small chunks
#                 logger.debug(f"Chunk too small ({len(data)} bytes), skipping transcription")
#                 continue
#             logger.debug("Processing transcription...")
            
#             try:
#                 # Write the audio chunk to a temporary file
#                 if not speech_service.write_audio_chunk(data):
#                     logger.error("Failed to write audio chunk, skipping transcription")
#                     continue
#                 # Call the Groq API for transcription
#                 transcription = await speech_service.call_grop_api()
#                 logger.debug(f"Transcription result (language: {language}): {transcription}")
#                 # Send simple text response
#                 if transcription and transcription.strip():
#                     response_data = {
#                         "text": transcription.strip()
#                     }
#                     await websocket.send_text(json.dumps(response_data))
#                 else:
#                     logger.debug("Empty transcription result")
                    
#             except Exception as transcription_error:
#                 logger.error(f"Transcription failed: {transcription_error}")
#                 # Don't send error to frontend, just skip this chunk
#                 continue
#             finally:
#                 # Clean up temp file
#                 if os.path.exists(temp_filename):
#                     try:
#                         os.remove(temp_filename)
#                     except:
#                         pass
#     except WebSocketDisconnect:
#         logger.info("WebSocket connection closed")
#     except Exception as e:
#         logger.error(f"Error in WebSocket connection: {e}")

  
