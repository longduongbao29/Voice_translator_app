"""Change custom_endpoints is_active default to false

Revision ID: 007
Revises: 006
Create Date: 2025-09-30 23:16:12.961108

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None

def upgrade():
    # Change default value of is_active to false for custom_endpoints
    op.alter_column('custom_endpoints', 'is_active',
                   existing_type=sa.Boolean(),
                   server_default=sa.text('false'),
                   existing_nullable=True)
    
    # Set all existing custom endpoints to inactive
    op.execute("UPDATE custom_endpoints SET is_active = false WHERE is_active = true")

def downgrade():
    # Revert default value of is_active to true for custom_endpoints
    op.alter_column('custom_endpoints', 'is_active',
                   existing_type=sa.Boolean(),
                   server_default=sa.text('true'),
                   existing_nullable=True)
    
    # Set all custom endpoints back to active
    op.execute("UPDATE custom_endpoints SET is_active = true WHERE is_active = false")