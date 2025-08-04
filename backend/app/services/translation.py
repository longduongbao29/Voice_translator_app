import os
from typing import Optional
import json
import hashlib
from googletrans import Translator, LANGUAGES
import httpx
from langdetect import detect, detect_langs
from app.database import get_redis
from app.schemas import TranslationResponse, LanguageDetectionResponse
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
    
    async def translate_with_openai(self, text: str, source_lang: str, target_lang: str) -> TranslationResponse:
        """Translate using OpenAI GPT"""
        if not self.openai_api_key:
            raise Exception("OpenAI API key not configured")
            
        cache_key = self._generate_cache_key(text, source_lang, target_lang, "openai")
        
        # Check cache first
        cached = self._get_cached_translation(cache_key)
        if cached:
            return TranslationResponse(**cached)
        
        try:
            # Language names for better prompt
            lang_names = {
                'vi': 'Vietnamese',
                'en': 'English',
                'fr': 'French',
                'de': 'German',
                'es': 'Spanish',
                'ja': 'Japanese',
                'ko': 'Korean',
                'zh': 'Chinese'
            }
            
            source_name = lang_names.get(source_lang, source_lang)
            target_name = lang_names.get(target_lang, target_lang)
            
            prompt = f"Translate the following {source_name} text to {target_name}. Only return the translation, no explanations:\n\n{text}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 1000,
                        "temperature": 0.3
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception(f"OpenAI API error: {response.status_code}")
                
                result = response.json()
                translated_text = result["choices"][0]["message"]["content"].strip()
                
                translation_data = {
                    "source_text": text,
                    "translated_text": translated_text,
                    "source_language": source_lang,
                    "target_language": target_lang,
                    "translation_engine": "openai",
                    "confidence": 0.95
                }
                
                # Cache result
                self._cache_translation(cache_key, translation_data)
                
                return TranslationResponse(**translation_data)
                
        except Exception as e:
            raise Exception(f"OpenAI translation error: {str(e)}")
    
    def detect_language(self, text: str) -> LanguageDetectionResponse:
        """Detect language of text"""
        try:
            detections = detect_langs(text)
            if detections:
                best_detection = detections[0]
                return LanguageDetectionResponse(
                    detected_language=best_detection.lang,
                    confidence=best_detection.prob
                )
            else:
                return LanguageDetectionResponse(
                    detected_language="unknown",
                    confidence=0.0
                )
        except Exception as e:
            raise Exception(f"Language detection error: {str(e)}")
    
    def get_supported_languages(self) -> dict:
        """Get list of supported languages"""
        return LANGUAGES

# Initialize service
translation_service = TranslationService()
