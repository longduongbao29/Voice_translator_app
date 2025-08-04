import os
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.utils.logger import Logger
from app.services.speech2text import SpeechToTextService

logger = Logger(__name__)
router = APIRouter()

@router.get("/test")
async def test_endpoint():
    return {"message": "Speech2Text endpoint is working"}

@router.websocket("/realtimestt")
async def websocket_endpoint(websocket: WebSocket, language: str = "en"):
    logger.debug(f"WebSocket connection attempt with language: {language}")
    await websocket.accept()
    logger.debug("WebSocket connection accepted")
    await websocket.send_text(json.dumps({
        "status": "connected", 
        "message": f"WebSocket ready to receive audio (language: {language})"
    }))

    temp_filename = "app/public/temp_chunk.webm"

    try:
        speech_service = SpeechToTextService("whisper-large-v3-turbo", temp_filename, language)
        while True:
            data = await websocket.receive_bytes()
            if data:
                logger.debug(f"Received data chunk of size {len(data)} bytes")
            if len(data) < 1024:  # Skip very small chunks
                logger.debug(f"Chunk too small ({len(data)} bytes), skipping transcription")
                continue
            logger.debug("Processing transcription...")
            
            try:
                # Write the audio chunk to a temporary file
                if not speech_service.write_audio_chunk(data):
                    logger.error("Failed to write audio chunk, skipping transcription")
                    continue
                # Call the Groq API for transcription
                transcription = await speech_service.call_grop_api()
                logger.debug(f"Transcription result (language: {language}): {transcription}")
                # Send simple text response
                if transcription and transcription.strip():
                    response_data = {
                        "text": transcription.strip()
                    }
                    await websocket.send_text(json.dumps(response_data))
                else:
                    logger.debug("Empty transcription result")
                    
            except Exception as transcription_error:
                logger.error(f"Transcription failed: {transcription_error}")
                # Don't send error to frontend, just skip this chunk
                continue
            finally:
                # Clean up temp file
                if os.path.exists(temp_filename):
                    try:
                        os.remove(temp_filename)
                    except:
                        pass
    except WebSocketDisconnect:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {e}")
  
