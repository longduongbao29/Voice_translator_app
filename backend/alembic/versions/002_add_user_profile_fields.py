"""Add user profile fields

Revision ID: 002
Revises: 001
Create Date: 2025-08-06 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns to users table
    op.add_column('users', sa.Column('full_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('avatar', sa.String(), nullable=True))
    op.add_column('users', sa.Column('preferences', sa.Text(), nullable=True))


def downgrade():
    # Remove columns from users table
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'avatar')
    op.drop_column('users', 'full_name')
