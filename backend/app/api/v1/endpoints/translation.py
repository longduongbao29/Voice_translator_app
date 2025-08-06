from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import TranslationRequest, TranslationResponse, LanguageDetectionResponse, TranslationFavoriteUpdate
from app.services.translation import translation_service
from app.models import Translation
from typing import Optional, List
from datetime import datetime

router = APIRouter()
security = HTTPBearer(auto_error=False)

@router.post("/translate", response_model=TranslationResponse)
async def translate_text(
    request: TranslationRequest,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Translate text"""
    try:
        # Get user_id from token if available
        user_id = None
        if credentials:
            from app.services.auth import verify_token, get_user_by_username
            username = verify_token(credentials.credentials)
            if username:
                user = get_user_by_username(db, username)
                if user:
                    user_id = user.id
        
        # Choose translation engine
        if request.engine == "google":
            result = await translation_service.translate_with_google(
                request.text, 
                request.source_language, 
                request.target_language
            )
        elif request.engine == "openai":
            result = await translation_service.translate_with_openai(
                request.text, 
                request.source_language, 
                request.target_language
            )
        else:
            result = await translation_service.translate_with_google(
                request.text, 
                request.source_language, 
                request.target_language
            )
        
        # Save to database only if user is logged in
        db_translation = None
        if user_id is not None:
            db_translation = Translation(
                user_id=user_id,
                source_text=result.source_text,
                translated_text=result.translated_text,
                source_language=result.source_language,
                target_language=result.target_language,
                translation_engine=result.translation_engine,
                is_favorite=False
            )
            db.add(db_translation)
            db.commit()
            db.refresh(db_translation)
            
            # Set database fields in result only if translation was saved
            result.id = db_translation.id
            result.created_at = db_translation.created_at
            result.is_favorite = db_translation.is_favorite
        else:
            # For non-logged-in users, set default values
            result.id = None
            result.created_at = datetime.now()
            result.is_favorite = False
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/detect-language", response_model=LanguageDetectionResponse)
async def detect_language(request: dict):
    """Detect language of text"""
    try:
        text = request.get("text", "")
        if not text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text is required"
            )
        
        result = translation_service.detect_language(text)
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/languages")
async def get_supported_languages():
    """Get supported languages"""
    try:
        languages = translation_service.get_supported_languages()
        return {"languages": languages}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/history")
async def get_translation_history(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get translation history for the current user"""
    try:
        # Verify token and get user
        user_id = None
        if credentials:
            from app.services.auth import verify_token, get_user_by_username
            username = verify_token(credentials.credentials)
            if username:
                user = get_user_by_username(db, username)
                if user:
                    user_id = user.id
        
        # Query translations
        if user_id is not None:
            translations = (
                db.query(Translation)
                .filter(Translation.user_id == user_id)
                .order_by(Translation.created_at.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )
        else:
            # For anonymous users, return empty list
            translations = []
            
        return {"translations": translations}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
        
@router.get("/favorites")
async def get_favorite_translations(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get favorite translations for the current user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        # Verify token and get user
        from app.services.auth import verify_token, get_user_by_username
        username = verify_token(credentials.credentials)
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Query favorite translations
        favorites = (
            db.query(Translation)
            .filter(Translation.user_id == user.id)
            .filter(Translation.is_favorite == True)
            .order_by(Translation.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
            
        return {"favorites": favorites}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
        
@router.put("/favorite/{translation_id}")
async def toggle_favorite_translation(
    translation_id: int,
    favorite_update: TranslationFavoriteUpdate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark/unmark translation as favorite"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify token and get user
        from app.services.auth import verify_token, get_user_by_username
        username = verify_token(credentials.credentials)
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get translation
        translation = db.query(Translation).filter(Translation.id == translation_id).first()
        if not translation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Translation not found"
            )
            
        # Check if user owns this translation
        if translation.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this translation"
            )
            
        # Update favorite status
        translation.is_favorite = favorite_update.is_favorite
        db.commit()
        db.refresh(translation)
            
        return {"success": True, "translation": translation}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/history")
async def clear_translation_history(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete all translation history for the current user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify token and get user
        from app.services.auth import verify_token, get_user_by_username
        username = verify_token(credentials.credentials)
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = get_user_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Delete all translations for this user
        deleted_count = db.query(Translation).filter(Translation.user_id == user.id).delete()
        db.commit()
            
        return {"success": True, "deleted_count": deleted_count, "message": "All translation history cleared"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
