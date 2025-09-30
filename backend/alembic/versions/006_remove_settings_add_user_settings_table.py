"""Remove settings column and add user_settings table

Revision ID: 006
Revises: 005
Create Date: 2025-09-30 22:44:18.393898

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None

def upgrade():
    # Drop settings column from users table
    op.drop_column('users', 'preferences')
    
    # Create user_settings table
    op.create_table('user_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('src_lang', sa.String(length=10), nullable=True),
        sa.Column('trg_lang', sa.String(length=10), nullable=True),
        sa.Column('translate_api', sa.String(length=50), nullable=True),
        sa.Column('stt_api', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique constraint for user_id
    op.create_unique_constraint('uq_user_settings_user_id', 'user_settings', ['user_id'])
    
    # Create index on user_id
    op.create_index(op.f('ix_user_settings_id'), 'user_settings', ['id'], unique=False)

def downgrade():
    # Drop user_settings table
    op.drop_index(op.f('ix_user_settings_id'), table_name='user_settings')
    op.drop_constraint('uq_user_settings_user_id', 'user_settings', type_='unique')
    op.drop_table('user_settings')
    
    # Add back settings column to users table
    op.add_column('users', sa.Column('settings', sa.JSON(), autoincrement=False, nullable=True))