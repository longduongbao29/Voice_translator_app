"""Add custom endpoints and webhook integrations tables

Revision ID: 005_add_custom_endpoints_webhooks
Revises: 004_change_preferences_to_json
Create Date: 2025-08-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create custom_endpoints table
    op.create_table(
        'custom_endpoints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('endpoint_type', sa.String(length=50), nullable=False),
        sa.Column('endpoint_url', sa.String(length=255), nullable=False),
        sa.Column('api_key', sa.String(length=255), nullable=True),
        sa.Column('headers', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_custom_endpoints_id'), 'custom_endpoints', ['id'], unique=False)
    
    # Create webhook_integrations table
    op.create_table(
        'webhook_integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('webhook_url', sa.String(length=255), nullable=False),
        sa.Column('secret_key', sa.String(length=255), nullable=True),
        sa.Column('event_types', sa.JSON(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_integrations_id'), 'webhook_integrations', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_webhook_integrations_id'), table_name='webhook_integrations')
    op.drop_table('webhook_integrations')
    op.drop_index(op.f('ix_custom_endpoints_id'), table_name='custom_endpoints')
    op.drop_table('custom_endpoints')
