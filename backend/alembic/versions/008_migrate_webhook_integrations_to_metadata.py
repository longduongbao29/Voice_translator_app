"""Migrate webhook integrations to use metadata field

Revision ID: 008
Revises: 007
Create Date: 2025-11-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None

def upgrade():
    # Add new meta_data column
    op.add_column('webhook_integrations', 
                  sa.Column('meta_data', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Migrate existing data to meta_data field
    # This SQL will combine webhook_url, secret_key, event_types, and config into a single JSON field
    op.execute("""
        UPDATE webhook_integrations 
        SET meta_data = jsonb_build_object(
            'webhook_url', webhook_url,
            'secret_key', secret_key,
            'event_types', COALESCE(event_types::jsonb, '[]'::jsonb),
            'config', COALESCE(config::jsonb, '{}'::jsonb)
        )
        WHERE webhook_url IS NOT NULL
    """)
    
    # Drop the old columns
    op.drop_column('webhook_integrations', 'is_active')
    op.drop_column('webhook_integrations', 'config')
    op.drop_column('webhook_integrations', 'event_types')
    op.drop_column('webhook_integrations', 'secret_key')
    op.drop_column('webhook_integrations', 'webhook_url')

def downgrade():
    # Add back the old columns
    op.add_column('webhook_integrations', 
                  sa.Column('webhook_url', sa.VARCHAR(length=255), nullable=False))
    op.add_column('webhook_integrations', 
                  sa.Column('secret_key', sa.VARCHAR(length=255), nullable=True))
    op.add_column('webhook_integrations', 
                  sa.Column('event_types', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('webhook_integrations', 
                  sa.Column('config', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('webhook_integrations', 
                  sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')))
    
    # Migrate data back from meta_data field
    op.execute("""
        UPDATE webhook_integrations 
        SET 
            webhook_url = COALESCE(meta_data->>'webhook_url', ''),
            secret_key = meta_data->>'secret_key',
            event_types = meta_data->'event_types',
            config = meta_data->'config'
        WHERE meta_data IS NOT NULL
    """)
    
    # Drop the meta_data column
    op.drop_column('webhook_integrations', 'meta_data')