import os
from typing import Optional
import json
import hashlib
import httpx
import asyncio
from googletrans import Translator, LANGUAGES
from langdetect import detect, detect_langs
from sqlalchemy.orm import Session
from app.database.postgres import get_db, get_redis
from app.database.models import CustomEndpoint
from app.api.schemas.schemas import TranslationResponse, LanguageDetectionResponse
from app.utils.logger import Logger
from typing import Optional
import json
import hashlib
from googletrans import Translator, LANGUAGES
from langdetect import detect, detect_langs
from app.database.postgres import get_redis
from app.api.schemas.schemas import TranslationResponse, LanguageDetectionResponse
from app.utils.logger import Logger

logger = Logger(__name__)

class TranslationService:
    def __init__(self):
        self.google_translator = Translator()
        self.redis_client = get_redis()
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        logger.info("Translation service initialized")
        
    def _generate_cache_key(self, text: str, source_lang: str, target_lang: str, engine: str) -> str:
        """Generate cache key for translation"""
        content = f"{text}:{source_lang}:{target_lang}:{engine}"
        return f"translation:{hashlib.md5(content.encode()).hexdigest()}"
    
    def _cache_translation(self, cache_key: str, translation: dict, expire_time: int = 3600):
        """Cache translation result"""
        try:
            self.redis_client.setex(cache_key, expire_time, json.dumps(translation))
            logger.debug(f"Translation cached with key: {cache_key}")
        except Exception as e:
            logger.error(f"Cache error: {e}")
    
    def _get_cached_translation(self, cache_key: str) -> Optional[dict]:
        """Get cached translation"""
        try:
            cached = self.redis_client.get(cache_key)
            if cached:
                logger.debug(f"Translation cache hit: {cache_key}")
                return json.loads(cached)
            else:
                logger.debug(f"Translation cache miss: {cache_key}")
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
        return None
    
    def _get_active_translation_endpoint(self, db: Session, user_id: Optional[int]) -> Optional[CustomEndpoint]:
        """Get active custom translation endpoint for user"""
        if not user_id:
            return None
            
        try:
            endpoint = db.query(CustomEndpoint).filter(
                CustomEndpoint.user_id == user_id,
                CustomEndpoint.endpoint_type == "translation",
                CustomEndpoint.is_active == True
            ).first()
            
            return endpoint
        except Exception as e:
            logger.error(f"Error querying custom endpoint: {e}")
            return None
    
    async def _translate_with_custom_endpoint(self, endpoint: CustomEndpoint, text: str, 
                                           source_lang: str, target_lang: str) -> TranslationResponse:
        """Translate using custom endpoint"""
        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            # Add custom headers if provided
            if endpoint.meta_data and endpoint.meta_data.get("headers"):
                headers.update(endpoint.meta_data["headers"])
            
            # Add API key if provided
            if endpoint.api_key:
                headers["Authorization"] = f"Bearer {endpoint.api_key}"
            
            # Prepare request data
            data = {
                "text": text,
                "source_language": source_lang,
                "target_language": target_lang
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint.api_url,
                    json=data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Assume the custom endpoint returns a similar structure
                    return TranslationResponse(
                        source_text=text,
                        translated_text=result.get("translated_text", ""),
                        source_language=result.get("source_language", source_lang),
                        target_language=result.get("target_language", target_lang),
                        translation_engine=f"custom_{endpoint.name}",
                        confidence=result.get("confidence", 0.8)
                    )
                else:
                    logger.error(f"Custom endpoint error: {response.status_code} - {response.text}")
                    raise Exception(f"Custom endpoint returned status {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Custom endpoint translation error: {e}")
            raise e

    async def translate_text(self, text: str, source_lang: str, target_lang: str, 
                           user_id: Optional[int] = None, db: Optional[Session] = None) -> TranslationResponse:
        """
        Main translation function that checks for custom endpoints first, 
        then falls back to Google Translate
        """
        logger.info(f"Translation request: {source_lang} -> {target_lang}, user_id: {user_id}")
        
        # Try custom endpoint first if user is provided
        if user_id and db:
            custom_endpoint = self._get_active_translation_endpoint(db, user_id)
            if custom_endpoint:
                try:
                    logger.info(f"Using custom endpoint: {custom_endpoint.name}")
                    return await self._translate_with_custom_endpoint(
                        custom_endpoint, text, source_lang, target_lang
                    )
                except Exception as e:
                    logger.error(f"Custom endpoint failed, falling back to Google: {e}")
                    # Continue to Google Translate fallback
        
        # Fallback to Google Translate
        logger.info("Using Google Translate")
        return await self.translate_with_google(text, source_lang, target_lang)
        
    async def translate_with_google(self, text: str, source_lang: str, target_lang: str) -> TranslationResponse:
        """Translate using Google Translate"""
        logger.log_translation_request(
            source_lang=source_lang,
            target_lang=target_lang,
            text_length=len(text),
            translation_service="google"
        )
        
        cache_key = self._generate_cache_key(text, source_lang, target_lang, "google")
        
        # Check cache first
        cached = self._get_cached_translation(cache_key)
        if cached:
            logger.info("Returning cached Google translation")
            return TranslationResponse(**cached)
        
        try:
            # Run synchronous Google Translate in a thread
            import asyncio
            import concurrent.futures
            
            def sync_translate():
                return self.google_translator.translate(
                    text, 
                    src=source_lang if source_lang != 'auto' else None,
                    dest=target_lang
                )
            
            logger.debug("Starting Google translation")
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(executor, sync_translate)
            result = await result
            translation_data = {
                "source_text": text,
                "translated_text": result.text,
                "source_language": result.src,
                "target_language": target_lang,
                "translation_engine": "google",
                "confidence": 0.9  # Google doesn't provide confidence
            }
            
            # Cache result
            self._cache_translation(cache_key, translation_data)
            
            logger.info(f"Google translation completed: {source_lang} -> {target_lang}")
            return TranslationResponse(**translation_data)
            
        except Exception as e:
            logger.error(f"Google translation error: {str(e)}", 
                        source_lang=source_lang, 
                        target_lang=target_lang)
            raise Exception(f"Google translation error: {str(e)}")
    
    def _generate_detection_cache_key(self, text: str) -> str:
        """Generate cache key for language detection"""
        # Sử dụng mẫu ngắn hơn để tăng tỷ lệ cache hit
        sample = text[:100] if len(text) > 100 else text
        return f"langdetect:{hashlib.md5(sample.encode()).hexdigest()}"
        
    def detect_language(self, text: str) -> LanguageDetectionResponse:
        """Detect language of text"""
        if not text.strip():
            return LanguageDetectionResponse(
                detected_language="unknown",
                confidence=0.0
            )
        
        # Với văn bản quá ngắn, việc phát hiện có thể không đáng tin cậy
        if len(text.strip()) < 5:
            return LanguageDetectionResponse(
                detected_language="en",  # Mặc định là tiếng Anh cho văn bản rất ngắn
                confidence=0.5
            )
        
        # Kiểm tra cache trước
        cache_key = self._generate_detection_cache_key(text)
        cached = self._get_cached_translation(cache_key)
        if cached:
            return LanguageDetectionResponse(**cached)
        
        try:
            # Sử dụng langdetect
            detections = detect_langs(text)
            if detections:
                best_detection = detections[0]
                
                # Cache kết quả
                detection_data = {
                    "detected_language": best_detection.lang,
                    "confidence": best_detection.prob
                }
                self._cache_translation(cache_key, detection_data, expire_time=86400)  # Cache trong 24 giờ
                
                return LanguageDetectionResponse(**detection_data)
            else:
                # Fallback
                return LanguageDetectionResponse(
                    detected_language="en",  # Mặc định là tiếng Anh nếu phát hiện thất bại
                    confidence=0.5
                )
        except Exception as e:
            logger.error(f"Language detection error: {str(e)}")
            # Fallback trong trường hợp lỗi
            return LanguageDetectionResponse(
                detected_language="en",
                confidence=0.3
            )
    
    def get_supported_languages(self) -> dict:
        """Get list of supported languages"""
        return LANGUAGES

# Initialize service

