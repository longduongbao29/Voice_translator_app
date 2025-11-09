import os
import json
import asyncio
from typing import Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session

from app.utils.logger import Logger
from app.database.models import CustomEndpoint, UserSettings, ElevenLabsSettings

logger = Logger(__name__)


class TextToSpeechService:
    def __init__(self, model_name: str = "eleven_v3", user_id: Optional[int] = None, db: Optional[Session] = None):
        self.model_name = model_name
        self.user_id = user_id
        self.db = db
        
        # Default ElevenLabs settings
        self.default_api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.default_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")  # Default voice
        self.default_base_url = "https://api.elevenlabs.io"
        
        # Default voice settings for optimal quality
        self.default_voice_settings = {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.0,
            "use_speaker_boost": True
        }

    def _get_elevenlabs_settings(self) -> Optional[ElevenLabsSettings]:
        """Get ElevenLabs settings for user"""
        if not self.user_id or not self.db:
            return None
            
        try:
            return self.db.query(ElevenLabsSettings).filter_by(user_id=self.user_id).first()
        except Exception as e:
            logger.error(f"Error getting ElevenLabs settings: {e}")
            return None

    def _get_custom_endpoint(self) -> Optional[CustomEndpoint]:
        """Get custom text2speech endpoint for user if exists"""
        if not self.user_id or not self.db:
            return None
        
        try:
            # Get user's preferred text2speech API from settings
            user_settings = self.db.query(UserSettings).filter_by(user_id=self.user_id).first()
            if not user_settings or not user_settings.text2speech_api:
                return None
            
            # Look for custom endpoint matching the user's preferred API
            custom_endpoint = self.db.query(CustomEndpoint).filter_by(
                user_id=self.user_id,
                endpoint_type='text2speech',
                name=user_settings.text2speech_api,
                is_active=True
            ).first()
            
            return custom_endpoint
        except Exception as e:
            logger.error(f"Error getting custom endpoint: {e}")
            return None

    async def call_elevenlabs_api(self, text: str, language_code: Optional[str] = None, voice_id: Optional[str] = None, output_format: str = "mp3_44100_128") -> bytes:
        """Call ElevenLabs API to convert text to speech"""
        try:
            if not self.default_api_key:
                raise Exception("ElevenLabs API key not configured")
                
            # Get user's ElevenLabs settings
            elevenlabs_settings = self._get_elevenlabs_settings()
            
            # Use user's settings or defaults
            if elevenlabs_settings:
                actual_voice_id = voice_id or elevenlabs_settings.voice_id or self.default_voice_id
                actual_model = elevenlabs_settings.model_id or self.model_name
                actual_voice_settings = elevenlabs_settings.voice_settings or self.default_voice_settings
            else:
                actual_voice_id = voice_id or self.default_voice_id
                actual_model = self.model_name
                actual_voice_settings = self.default_voice_settings
            
            url = f"{self.default_base_url}/v1/text-to-speech/{actual_voice_id}"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.default_api_key
            }
            
            # Prepare request body
            body = {
                "text": text,
                "model_id": actual_model,
                "voice_settings": actual_voice_settings
            }
            
            # Add language code if provided
            if language_code:
                body["language_code"] = language_code
            
            # Add query parameters
            params = {
                "output_format": output_format
            }
            
            # Only add optimize_streaming_latency for older models that support it
            # Models like eleven_v3 don't support this parameter
            if actual_model not in ["eleven_v3", "eleven_turbo_v2_5"]:
                params["optimize_streaming_latency"] = 0  # Default mode for best quality
            
            logger.debug(f"Calling ElevenLabs API: {url} with params: {params}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=body,
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    audio_data = response.content
                    logger.debug(f"ElevenLabs API success, audio size: {len(audio_data)} bytes")
                    return audio_data
                else:
                    error_msg = f"ElevenLabs API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
        except httpx.TimeoutException:
            error_msg = "ElevenLabs API timeout"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            logger.error(f"Error calling ElevenLabs API: {e}")
            raise

    async def call_custom_api(self, custom_endpoint: CustomEndpoint, text: str, language_code: Optional[str] = None) -> bytes:
        """Call custom text-to-speech endpoint"""
        try:
            headers = {"Content-Type": "application/json"}
            
            # Parse meta_data for additional config
            meta_data = {}
            if custom_endpoint.meta_data:
                try:
                    meta_data = json.loads(custom_endpoint.meta_data) if isinstance(custom_endpoint.meta_data, str) else custom_endpoint.meta_data
                except (json.JSONDecodeError, TypeError):
                    pass
            
            # Add custom headers if specified
            if meta_data.get("headers"):
                headers.update(meta_data["headers"])
            
            # Add API key to headers if specified
            if custom_endpoint.api_key:
                # Common header names for API keys
                if "api_key_header" in meta_data:
                    headers[meta_data["api_key_header"]] = custom_endpoint.api_key
                else:
                    headers["Authorization"] = f"Bearer {custom_endpoint.api_key}"
            
            # Prepare request body
            body = {
                "text": text,
                "model": self.model_name
            }
            
            if language_code:
                body["language"] = language_code
            
            # Add custom body parameters from meta_data
            if meta_data.get("body_params"):
                body.update(meta_data["body_params"])
            
            logger.debug(f"Calling custom TTS API: {custom_endpoint.api_url}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    custom_endpoint.api_url,
                    json=body,
                    headers=headers
                )
                
                if response.status_code == 200:
                    # Check if response is audio data or JSON with audio URL
                    content_type = response.headers.get("content-type", "")
                    
                    if "audio" in content_type or "octet-stream" in content_type:
                        # Direct audio response
                        audio_data = response.content
                        logger.debug(f"Custom API success, audio size: {len(audio_data)} bytes")
                        return audio_data
                    else:
                        # Assume JSON response with audio URL or base64 data
                        try:
                            result = response.json()
                            if "audio_url" in result:
                                # Download audio from URL
                                audio_response = await client.get(result["audio_url"])
                                if audio_response.status_code == 200:
                                    return audio_response.content
                                else:
                                    raise Exception(f"Failed to download audio from URL: {audio_response.status_code}")
                            elif "audio_data" in result:
                                # Base64 encoded audio
                                import base64
                                return base64.b64decode(result["audio_data"])
                            else:
                                raise Exception("Custom API response does not contain audio data or URL")
                        except json.JSONDecodeError:
                            raise Exception("Custom API returned non-JSON response that is not audio")
                else:
                    error_msg = f"Custom TTS API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
        except httpx.TimeoutException:
            error_msg = "Custom TTS API timeout"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            logger.error(f"Error calling custom TTS API: {e}")
            raise

    async def call_api(self, text: str, language_code: Optional[str] = None, voice_id: Optional[str] = None, output_format: str = "mp3_44100_128") -> bytes:
        """
        Main method to call text-to-speech API.
        Checks for custom endpoint first, falls back to ElevenLabs if not found.
        """
        try:
            # Check for custom endpoint first
            custom_endpoint = self._get_custom_endpoint()
            
            if custom_endpoint:
                logger.debug(f"Using custom TTS endpoint: {custom_endpoint.name}")
                return await self.call_custom_api(custom_endpoint, text, language_code)
            else:
                logger.debug("Using default ElevenLabs API")
                return await self.call_elevenlabs_api(text, language_code, voice_id, output_format)
                
        except Exception as e:
            logger.error(f"Text-to-speech failed: {e}")
            raise

    def get_supported_voices(self) -> Dict[str, Any]:
        """Get list of supported voices (for ElevenLabs)"""
        # Default ElevenLabs voices (commonly used ones)
        return {
            "JBFqnCBsd6RMkjVDRZzb": {"name": "George", "gender": "male", "language": "en"},
            "21m00Tcm4TlvDq8ikWAM": {"name": "Rachel", "gender": "female", "language": "en"},
            "AZnzlk1XvdvUeBnXmlld": {"name": "Domi", "gender": "female", "language": "en"},
            "EXAVITQu4vr4xnSDxMaL": {"name": "Bella", "gender": "female", "language": "en"},
            "ErXwobaYiN019PkySvjV": {"name": "Antoni", "gender": "male", "language": "en"},
            "MF3mGyEYCl7XYWbV9V6O": {"name": "Elli", "gender": "female", "language": "en"},
            "TxGEqnHWrfWFTfGW9XjX": {"name": "Josh", "gender": "male", "language": "en"},
            "VR6AewLTigWG4xSOukaG": {"name": "Arnold", "gender": "male", "language": "en"},
            "pNInz6obpgDQGcFmaJgB": {"name": "Adam", "gender": "male", "language": "en"},
            "yoZ06aMxZJJ28mfd3POQ": {"name": "Sam", "gender": "male", "language": "en"}
        }

    def get_supported_formats(self) -> list:
        """Get list of supported output formats"""
        return [
            "mp3_22050_32",
            "mp3_24000_48", 
            "mp3_44100_32",
            "mp3_44100_64",
            "mp3_44100_96",
            "mp3_44100_128",
            "mp3_44100_192",
            "pcm_8000",
            "pcm_16000", 
            "pcm_22050",
            "pcm_24000",
            "pcm_32000",
            "pcm_44100",
            "pcm_48000",
            "ulaw_8000",
            "alaw_8000"
        ]