from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database.models import User, UserSettings, CustomEndpoint
from app.api.schemas.schemas import UserCreate
from app.utils.logger import Logger

logger = Logger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

logger.info("Authentication service initialized")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    logger.debug("Password hashing requested")
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    logger.info(f"Access token created for user: {data.get('sub', 'unknown')}")
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return username"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        logger.debug(f"Token verified for user: {username}")
        return username
    except JWTError as e:
        logger.warning(f"Token verification failed: {str(e)}")
        return None

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    user = db.query(User).filter(User.email == email).first()
    if user:
        logger.debug(f"User found by email: {email}")
    else:
        logger.debug(f"No user found with email: {email}")
    return user

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate) -> User:
    """Create new user"""
    try:
        hashed_password = get_password_hash(user.password)
        db_user = User(
            email=user.email,
            username=user.username,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create default user settings
        default_settings = UserSettings(
            user_id=db_user.id,
            src_lang="auto",
            trg_lang="en",
            translate_api="google",
            stt_api="groq"
        )
        db.add(default_settings)
        db.commit()
        
        logger.info(f"User created with default settings: {user.username}")
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create user {user.username}: {str(e)}")
        raise

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user"""
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def get_user_settings(db: Session, user_id: int) -> Optional[UserSettings]:
    """Get user settings by user_id"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if settings:
        logger.debug(f"Settings found for user_id: {user_id}")
    else:
        logger.debug(f"No settings found for user_id: {user_id}")
    return settings

def activate_custom_endpoint(db: Session, user_id: int, endpoint_id: int, endpoint_type: str) -> bool:
    """Activate selected custom endpoint and deactivate others of same type"""
    try:
        # Deactivate all endpoints of this type for this user
        db.query(CustomEndpoint).filter(
            CustomEndpoint.user_id == user_id,
            CustomEndpoint.endpoint_type == endpoint_type
        ).update({"is_active": False})
        
        # Activate the selected endpoint
        result = db.query(CustomEndpoint).filter(
            CustomEndpoint.id == endpoint_id,
            CustomEndpoint.user_id == user_id,
            CustomEndpoint.endpoint_type == endpoint_type
        ).update({"is_active": True})
        
        db.commit()
        logger.info(f"Activated custom endpoint {endpoint_id} for user {user_id}")
        return result > 0
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to activate custom endpoint: {str(e)}")
        raise

def deactivate_all_custom_endpoints(db: Session, user_id: int, endpoint_type: str):
    """Deactivate all custom endpoints of specific type for user"""
    try:
        db.query(CustomEndpoint).filter(
            CustomEndpoint.user_id == user_id,
            CustomEndpoint.endpoint_type == endpoint_type
        ).update({"is_active": False})
        logger.info(f"Deactivated all {endpoint_type} endpoints for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to deactivate custom endpoints: {str(e)}")
        raise

def update_user_settings(db: Session, user_id: int, settings_data: dict) -> Optional[UserSettings]:
    """Update user settings"""
    try:
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            logger.warning(f"No settings found for user_id: {user_id}")
            return None
        
        # Update settings fields if provided
        for field, value in settings_data.items():
            if hasattr(settings, field):
                setattr(settings, field, value)
                
                # Handle custom endpoint activation/deactivation
                if field == "translate_api":
                    if value.startswith("custom_"):
                        # Activate selected custom endpoint
                        endpoint_id = int(value.replace("custom_", ""))
                        activate_custom_endpoint(db, user_id, endpoint_id, "translation")
                    else:
                        # Deactivate all custom translation endpoints when selecting built-in API
                        deactivate_all_custom_endpoints(db, user_id, "translation")
                        
                elif field == "stt_api":
                    if value.startswith("custom_"):
                        # Activate selected custom endpoint  
                        endpoint_id = int(value.replace("custom_", ""))
                        activate_custom_endpoint(db, user_id, endpoint_id, "speech2text")
                    else:
                        # Deactivate all custom speech2text endpoints when selecting built-in API
                        deactivate_all_custom_endpoints(db, user_id, "speech2text")
        
        db.commit()
        db.refresh(settings)
        logger.info(f"Settings updated for user_id: {user_id}")
        return settings
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update settings for user_id {user_id}: {str(e)}")
        raise
