from fastapi import APIRouter
from app.api.v1.endpoints import translation, auth ,speech2text


api_router = APIRouter()

api_router.include_router(translation.router, prefix="/translate", tags=["translation"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(speech2text.router, prefix="/ws", tags=["speech2text"])