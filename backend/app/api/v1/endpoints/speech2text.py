import os
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException

from app.utils.logger import Logger
from app.services.speech2text import SpeechToTextService

logger = Logger(__name__)
router = APIRouter()

@router.get("/test")
async def test_endpoint():
    return {"message": "Speech2Text endpoint is working"}

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...), 
    language: str = Form("en"),
    model_name: str = Form("whisper-large-v3")
):
        """Endpoint to transcribe audio file"""
        try:
            # Log incoming request details
            logger.debug(f"Received transcription request. File: {audio.filename}, Content-Type: {audio.content_type}, Size: {audio.size}, Language: {language}, Model: {model_name}")
            
            # Read the audio data
            audio_data = await audio.read()
            logger.debug(f"Audio data read, size: {len(audio_data)} bytes")
            
            # Ensure the directory exists
            public_dir = "app/public"
            os.makedirs(public_dir, exist_ok=True)
            
            # Create temp file with unique name
            import uuid
            temp_filename = f"{public_dir}/temp_chunk_{uuid.uuid4()}.webm"
            
            # Initialize service and process audio
            service = SpeechToTextService(model_name, temp_filename, language)
            if not service.write_audio_chunk(audio_data):
                raise HTTPException(status_code=500, detail="Failed to write audio data to file")
                
            transcription = await service.call_grop_api()
            
            # Clean up temp file
            try:
                os.remove(temp_filename)
            except Exception as e:
                logger.warning(f"Failed to remove temp file: {e}")
            
            if transcription:
                logger.debug(f"Transcription successful: {transcription[:50]}...")
                return {"text": transcription}
            else:
                return {"text": ""}
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise HTTPException(status_code=404, detail=str(e))
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

  
