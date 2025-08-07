"""Update preferences column to JSON

Revision ID: 004_change_preferences_to_json
Revises: 003_add_is_favorite_column
Create Date: 2025-08-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert preferences column from TEXT to JSON
    # First update any NULL preferences to empty JSON object
    op.execute("UPDATE users SET preferences = '{}' WHERE preferences IS NULL")
    # Then convert the column type
    op.alter_column('users', 'preferences',
                    existing_type=sa.TEXT(),
                    type_=sa.JSON(),
                    postgresql_using='CASE WHEN preferences IS NULL THEN \'{}\' ELSE preferences::json END',
                    existing_nullable=True)


def downgrade() -> None:
    # Convert preferences column back from JSON to TEXT
    op.alter_column('users', 'preferences',
                    existing_type=sa.JSON(),
                    type_=sa.TEXT(),
                    postgresql_using='preferences::text',
                    existing_nullable=True)
