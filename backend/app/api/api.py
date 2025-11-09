from fastapi import APIRouter
from app.api.v1.endpoints import translation, auth, speech2text, text2speech, users, developer, elevenlabs

api_router = APIRouter()

api_router.include_router(translation.router, prefix="/v1/translate", tags=["translation"])
api_router.include_router(auth.router, prefix="/v1/auth", tags=["authentication"])
api_router.include_router(speech2text.router, prefix="/v1/speech2text", tags=["speech2text"])
api_router.include_router(text2speech.router, prefix="/v1/text2speech", tags=["text2speech"])
api_router.include_router(users.router, prefix="/v1/users", tags=["users"])
api_router.include_router(developer.router, prefix="/v1/developer", tags=["developer"])
api_router.include_router(elevenlabs.router, prefix="/v1/elevenlabs", tags=["elevenlabs"])
