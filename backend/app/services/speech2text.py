from groq import Groq
from app.utils.logger import Logger

logger = Logger(__name__)

class SpeechToTextService:
    client = Groq()
    def __init__(self,
                 model_name: str,
                 audio_file_path: str,
                 language: str = "en"):
        self.model_name = model_name
        self.audio_file_path = audio_file_path
        self.language = language

    def write_audio_chunk(self, data: bytes):
        """Write audio data to a file"""
        try:
            with open(self.audio_file_path, "wb") as f:
                f.write(data)
            return True
        except Exception as e:
            logger.error(f"Failed to write audio chunk: {e}")
            return False
    async def call_grop_api(self):
        """Call the Groq API for transcription"""
        try:
            with open(self.audio_file_path, "rb") as file:
                # Prepare transcription parameters
                transcription_params = {
                    "file": file,
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
                        no_speech_prob < 0.5:
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

            