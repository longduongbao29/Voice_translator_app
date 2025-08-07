#!/bin/bash
# Script to run Alembic migrations

echo "Running database migrations..."
cd /home/longdb/code/Translator_app/backend
alembic upgrade head

echo "Migration complete!"
