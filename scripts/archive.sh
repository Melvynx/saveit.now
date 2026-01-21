#!/bin/bash

# Conductor archive script for saveit.now-mono
# Runs when a workspace is archived. Used for cleaning up external resources (database deletion).

set -e

WORKSPACE_NAME="${CONDUCTOR_WORKSPACE_NAME}"

if [ -z "${WORKSPACE_NAME}" ]; then
    echo "Error: CONDUCTOR_WORKSPACE_NAME is not set"
    exit 1
fi

echo "Archiving SaveIt.now workspace: ${WORKSPACE_NAME}"

get_db_name_from_env() {
    local env_file="$1"
    if [ -f "${env_file}" ]; then
        local db_name
        db_name=$(grep "^DATABASE_URL=" "${env_file}" | sed 's/.*postgresql:\/\/melvynx:@localhost:5432\///; s/".*//')
        if [ -n "${db_name}" ]; then
            echo "${db_name}"
            return 0
        fi
    fi
    return 1
}

DB_NAME=""
if DB_NAME=$(get_db_name_from_env "packages/database/.env"); then
    echo "Found database name in packages/database/.env: ${DB_NAME}"
elif DB_NAME=$(get_db_name_from_env "apps/web/.env"); then
    echo "Found database name in apps/web/.env: ${DB_NAME}"
else
    DB_NAME="saveit.now-${WORKSPACE_NAME}"
    echo "No DATABASE_URL found in .env files, using expected database name: ${DB_NAME}"
fi

echo "Cleaning up database: ${DB_NAME}"

if psql -U melvynx -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Database ${DB_NAME} found, dropping..."

    psql -U melvynx -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';"
    dropdb -U melvynx "${DB_NAME}"

    echo "✅ Database ${DB_NAME} successfully deleted"
else
    echo "⚠️  Database ${DB_NAME} not found, skipping deletion"
fi

echo "🗑️  SaveIt.now workspace '${WORKSPACE_NAME}' archived and cleaned up successfully!"
