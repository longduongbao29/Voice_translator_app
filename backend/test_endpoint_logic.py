#!/usr/bin/env python3
"""
Test script to verify custom endpoint activation logic
"""
import sys
import os

# Add the backend directory to Python path
sys.path.append('/home/longdb/code/Translator_app/backend')

from app.database.postgres import get_db
from app.services.auth import update_user_settings, get_user_settings
from app.database.models import CustomEndpoint

def test_custom_endpoint_logic():
    """Test the custom endpoint activation/deactivation logic"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Assume user_id = 1 for testing (you can change this)
        test_user_id = 1
        
        print("=== Testing Custom Endpoint Logic ===")
        
        # Test 1: Get current settings
        print(f"\n1. Getting current settings for user {test_user_id}...")
        current_settings = get_user_settings(db, test_user_id)
        if current_settings:
            print(f"   Current translate_api: {current_settings.translate_api}")
            print(f"   Current stt_api: {current_settings.stt_api}")
        else:
            print("   No settings found for user")
            return
        
        # Test 2: Check current custom endpoints status
        print(f"\n2. Current custom endpoints for user {test_user_id}:")
        endpoints = db.query(CustomEndpoint).filter(CustomEndpoint.user_id == test_user_id).all()
        for ep in endpoints:
            print(f"   ID: {ep.id}, Type: {ep.endpoint_type}, Name: {ep.name}, Active: {ep.is_active}")
        
        # Test 3: Update to use a custom endpoint (if exists)
        custom_translation_ep = db.query(CustomEndpoint).filter(
            CustomEndpoint.user_id == test_user_id,
            CustomEndpoint.endpoint_type == "translation"
        ).first()
        
        if custom_translation_ep:
            print(f"\n3. Testing: Set translate_api to custom_{custom_translation_ep.id}")
            update_user_settings(db, test_user_id, {
                "translate_api": f"custom_{custom_translation_ep.id}"
            })
            
            # Check endpoints status after update
            endpoints = db.query(CustomEndpoint).filter(CustomEndpoint.user_id == test_user_id).all()
            print("   Endpoints after update:")
            for ep in endpoints:
                print(f"   ID: {ep.id}, Type: {ep.endpoint_type}, Name: {ep.name}, Active: {ep.is_active}")
        
        # Test 4: Update back to built-in API
        print(f"\n4. Testing: Set translate_api back to 'google'")
        update_user_settings(db, test_user_id, {
            "translate_api": "google"
        })
        
        # Check endpoints status after update
        endpoints = db.query(CustomEndpoint).filter(CustomEndpoint.user_id == test_user_id).all()
        print("   Endpoints after switching back to google:")
        for ep in endpoints:
            print(f"   ID: {ep.id}, Type: {ep.endpoint_type}, Name: {ep.name}, Active: {ep.is_active}")
            
        print("\n=== Test completed ===")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_custom_endpoint_logic()