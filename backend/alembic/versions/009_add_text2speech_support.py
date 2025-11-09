"""add_text2speech_support

Revision ID: 009_add_text2speech_support
Revises: 008_migrate_webhook_integrations_to_metadata
Create Date: 2024-11-09 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    # Add text2speech_api column to user_settings table
    op.add_column('user_settings', sa.Column('text2speech_api', sa.String(50), nullable=True, server_default='elevenlabs'))
    
    # Rename endpoint_url to api_url in custom_endpoints table (if not already done)
    try:
        op.alter_column('custom_endpoints', 'endpoint_url', new_column_name='api_url')
    except Exception:
        # Column might already be renamed, continue
        pass
    
    # Rename headers to meta_data in custom_endpoints table (if not already done)  
    try:
        op.alter_column('custom_endpoints', 'headers', new_column_name='meta_data')
    except Exception:
        # Column might already be renamed, continue
        pass


def downgrade():
    # Remove text2speech_api column from user_settings table
    op.drop_column('user_settings', 'text2speech_api')
    
    # Revert api_url to endpoint_url in custom_endpoints table
    try:
        op.alter_column('custom_endpoints', 'api_url', new_column_name='endpoint_url')
    except Exception:
        # Column might not exist, continue
        pass
    
    # Revert meta_data to headers in custom_endpoints table
    try:
        op.alter_column('custom_endpoints', 'meta_data', new_column_name='headers')
    except Exception:
        # Column might not exist, continue
        pass