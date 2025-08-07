from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    CustomEndpointCreate, CustomEndpointResponse, CustomEndpointUpdate,
    WebhookIntegrationCreate, WebhookIntegrationResponse, WebhookIntegrationUpdate
)
from app.services.auth import verify_token, get_user_by_username
from app.models import CustomEndpoint, WebhookIntegration
from typing import List

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Custom Endpoints CRUD operations
@router.post("/custom-endpoints", response_model=CustomEndpointResponse)
async def create_custom_endpoint(
    endpoint: CustomEndpointCreate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new custom endpoint"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Create new endpoint
        db_endpoint = CustomEndpoint(
            user_id=user.id,
            name=endpoint.name,
            endpoint_type=endpoint.endpoint_type,
            endpoint_url=endpoint.endpoint_url,
            api_key=endpoint.api_key,
            headers=endpoint.headers,
            is_active=endpoint.is_active
        )
        db.add(db_endpoint)
        db.commit()
        db.refresh(db_endpoint)
        
        return db_endpoint
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/custom-endpoints", response_model=List[CustomEndpointResponse])
async def get_custom_endpoints(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all custom endpoints for the current user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get endpoints for user
        endpoints = db.query(CustomEndpoint).filter(CustomEndpoint.user_id == user.id).all()
        return endpoints
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/custom-endpoints/{endpoint_id}", response_model=CustomEndpointResponse)
async def get_custom_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific custom endpoint by ID"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get endpoint
        endpoint = db.query(CustomEndpoint).filter(
            CustomEndpoint.id == endpoint_id,
            CustomEndpoint.user_id == user.id
        ).first()
        
        if not endpoint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Custom endpoint not found"
            )
            
        return endpoint
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/custom-endpoints/{endpoint_id}", response_model=CustomEndpointResponse)
async def update_custom_endpoint(
    endpoint_id: int,
    endpoint_update: CustomEndpointUpdate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a custom endpoint"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get endpoint
        endpoint = db.query(CustomEndpoint).filter(
            CustomEndpoint.id == endpoint_id,
            CustomEndpoint.user_id == user.id
        ).first()
        
        if not endpoint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Custom endpoint not found"
            )
        
        # Update fields
        update_data = endpoint_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(endpoint, key, value)
        
        db.commit()
        db.refresh(endpoint)
        return endpoint
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/custom-endpoints/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a custom endpoint"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get endpoint
        endpoint = db.query(CustomEndpoint).filter(
            CustomEndpoint.id == endpoint_id,
            CustomEndpoint.user_id == user.id
        ).first()
        
        if not endpoint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Custom endpoint not found"
            )
        
        db.delete(endpoint)
        db.commit()
        return
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Webhook Integrations CRUD operations
@router.post("/webhooks", response_model=WebhookIntegrationResponse)
async def create_webhook(
    webhook: WebhookIntegrationCreate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new webhook integration"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Create new webhook
        db_webhook = WebhookIntegration(
            user_id=user.id,
            name=webhook.name,
            platform=webhook.platform,
            webhook_url=webhook.webhook_url,
            secret_key=webhook.secret_key,
            event_types=webhook.event_types,
            config=webhook.config,
            is_active=webhook.is_active
        )
        db.add(db_webhook)
        db.commit()
        db.refresh(db_webhook)
        
        return db_webhook
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/webhooks", response_model=List[WebhookIntegrationResponse])
async def get_webhooks(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all webhook integrations for the current user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get webhooks for user
        webhooks = db.query(WebhookIntegration).filter(WebhookIntegration.user_id == user.id).all()
        return webhooks
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/webhooks/{webhook_id}", response_model=WebhookIntegrationResponse)
async def get_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific webhook integration by ID"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get webhook
        webhook = db.query(WebhookIntegration).filter(
            WebhookIntegration.id == webhook_id,
            WebhookIntegration.user_id == user.id
        ).first()
        
        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook integration not found"
            )
            
        return webhook
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/webhooks/{webhook_id}", response_model=WebhookIntegrationResponse)
async def update_webhook(
    webhook_id: int,
    webhook_update: WebhookIntegrationUpdate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a webhook integration"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get webhook
        webhook = db.query(WebhookIntegration).filter(
            WebhookIntegration.id == webhook_id,
            WebhookIntegration.user_id == user.id
        ).first()
        
        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook integration not found"
            )
        
        # Update fields
        update_data = webhook_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(webhook, key, value)
        
        db.commit()
        db.refresh(webhook)
        return webhook
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a webhook integration"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
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
        
        # Get webhook
        webhook = db.query(WebhookIntegration).filter(
            WebhookIntegration.id == webhook_id,
            WebhookIntegration.user_id == user.id
        ).first()
        
        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook integration not found"
            )
        
        db.delete(webhook)
        db.commit()
        return
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
