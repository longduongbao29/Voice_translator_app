"""Add is_favorite column to translations table

Revision ID: 003
Revises: 002
Create Date: 2025-08-06 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_favorite column to translations table
    op.add_column('translations', sa.Column('is_favorite', sa.Boolean(), server_default='false', nullable=False))


def downgrade():
    # Remove is_favorite column from translations table
    op.drop_column('translations', 'is_favorite')
