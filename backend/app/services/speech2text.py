from groq import Groq
from typing import Optional
import httpx
from sqlalchemy.orm import Session
from app.database.models import CustomEndpoint
from app.utils.logger import Logger

logger = Logger(__name__)

class SpeechToTextService:
    client = Groq()
    def __init__(self,
                 model_name: str,
                 language: str = "en",
                 user_id: Optional[int] = None,
                 db: Optional[Session] = None):
        self.model_name = model_name
        self.language = language
        self.user_id = user_id
        self.db = db


    async def call_grop_api(self, audio_data: bytes, filename: str):
        """Call the Groq API for transcription"""
        try:
            # Create a file-like object from audio data
            import io
            audio_file = io.BytesIO(audio_data)
            audio_file.name = filename  # Set filename for proper file type detection
            
            # Prepare transcription parameters
            transcription_params = {
                "file": audio_file,
                "model": self.model_name,
                "response_format": "verbose_json",
                "temperature": 0.0
            }
            
            # Only add language parameter if it's not 'auto' or None
            if self.language and self.language != 'auto':
                transcription_params["language"] = self.language
            
            transcription = self.client.audio.transcriptions.create(**transcription_params)
            logger.debug(f"Transcription result: {transcription}")
            
            # Send simple text response
            fulltext = ""
            for segment in transcription.segments:
                avg_logprob = segment.get("avg_logprob", None)
                no_speech_prob = segment.get("no_speech_prob", None)
                if  avg_logprob is not None and \
                    avg_logprob > -0.5 and \
                    no_speech_prob is not None and \
                    no_speech_prob < 0.15:
                    fulltext += segment.get("text", "").strip() + " "
                    
            if fulltext:
                logger.debug(f"Final transcription text: {fulltext.strip()}")
                return fulltext.strip()
            else:
                logger.debug("Empty transcription result")
                return None
        except Exception as transcription_error:
            logger.error(f"Transcription failed: {transcription_error}")
            # Don't send error to frontend, just skip this chunk
            return None

    def _get_active_speech2text_endpoint(self) -> Optional[CustomEndpoint]:
        """Get active custom speech2text endpoint for user"""
        if not self.user_id or not self.db:
            return None
            
        try:
            endpoint = self.db.query(CustomEndpoint).filter(
                CustomEndpoint.user_id == self.user_id,
                CustomEndpoint.endpoint_type == "speech2text",
                CustomEndpoint.is_active == True
            ).first()
            
            return endpoint
        except Exception as e:
            logger.error(f"Error querying custom speech2text endpoint: {e}")
            return None
    
    async def _transcribe_with_custom_endpoint(self, endpoint: CustomEndpoint, audio_data: bytes, filename: str) -> Optional[str]:
        """Transcribe using custom endpoint"""
        try:
            headers = {}
            
            # Add custom headers if provided
            if endpoint.headers:
                headers.update(endpoint.headers)
            
            # Add API key if provided
            if endpoint.api_key:
                headers["Authorization"] = f"Bearer {endpoint.api_key}"
            
            # Prepare multipart form data for audio file upload using audio_data
            async with httpx.AsyncClient() as client:
                files = {"file": (filename, audio_data, "audio/webm")}
                data = {
                    "language": self.language if self.language != "auto" else "en",
                    "model": self.model_name
                }
                
                response = await client.post(
                    endpoint.endpoint_url,
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=60.0  # Longer timeout for audio processing
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # Assume the custom endpoint returns text in 'text' or 'transcription' field
                    transcription = result.get("text") or result.get("transcription") or result.get("result")
                    
                    if transcription:
                        logger.info(f"Custom endpoint transcription successful: {len(transcription)} chars")
                        return transcription.strip()
                    else:
                        logger.warning("Custom endpoint returned empty transcription")
                        return None
                else:
                    logger.error(f"Custom endpoint error: {response.status_code} - {response.text}")
                    raise Exception(f"Custom endpoint returned status {response.status_code}")
                        
        except Exception as e:
            logger.error(f"Custom endpoint transcription error: {e}")
            raise e

    async def call_api(self, audio_data: bytes, filename: str) -> Optional[str]:
        """Main method to check custom endpoint first, then fallback to Groq API"""
        logger.info(f"Speech2text request: language={self.language}, user_id={self.user_id}")
        
        # Try custom endpoint first if user is provided
        if self.user_id and self.db:
            custom_endpoint = self._get_active_speech2text_endpoint()
            if custom_endpoint:
                try:
                    logger.info(f"Using custom speech2text endpoint: {custom_endpoint.name}")
                    return await self._transcribe_with_custom_endpoint(custom_endpoint, audio_data, filename)
                except Exception as e:
                    logger.error(f"Custom endpoint failed, falling back to Groq: {e}")
                    # Continue to Groq API fallback
        
        # Fallback to Groq API
        logger.info("Using Groq API")
        return await self.call_grop_api(audio_data, filename)
