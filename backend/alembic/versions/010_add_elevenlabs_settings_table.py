"""add_elevenlabs_settings_table

Revision ID: 010_add_elevenlabs_settings_table
Revises: 009
Create Date: 2024-11-09 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    # Create elevenlabs_settings table
    op.create_table(
        'elevenlabs_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('model_id', sa.String(100), nullable=True, server_default='eleven_multilingual_v2'),
        sa.Column('voice_id', sa.String(100), nullable=True, server_default='JBFqnCBsd6RMkjVDRZzb'),
        sa.Column('voice_name', sa.String(200), nullable=True, server_default='George'),
        sa.Column('voice_settings', sa.JSON(), nullable=True),
        sa.Column('cloned_voices', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_elevenlabs_settings_id', 'elevenlabs_settings', ['id'])


def downgrade():
    # Drop elevenlabs_settings table
    op.drop_index('ix_elevenlabs_settings_id', table_name='elevenlabs_settings')
    op.drop_table('elevenlabs_settings')