from fastapi import APIRouter
from app.api.v1.endpoints import translation, auth, speech2text, users, developer


api_router = APIRouter()

api_router.include_router(translation.router, prefix="/translate", tags=["translation"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(speech2text.router, prefix="/speech2text", tags=["speech2text"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(developer.router, prefix="/developer", tags=["developer"])

