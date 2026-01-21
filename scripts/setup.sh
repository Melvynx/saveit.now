#!/bin/bash

# Conductor setup script for saveit.now-mono
# Runs when a workspace is created. Used for copying .env files and installing dependencies.

set -e

WORKSPACE_NAME="${CONDUCTOR_WORKSPACE_NAME}"
ROOT_PATH="${CONDUCTOR_ROOT_PATH}"

if [ -z "${WORKSPACE_NAME}" ]; then
    echo "Error: CONDUCTOR_WORKSPACE_NAME is not set"
    exit 1
fi

if [ -z "${ROOT_PATH}" ]; then
    echo "Error: CONDUCTOR_ROOT_PATH is not set"
    exit 1
fi

echo "Setting up SaveIt.now workspace: ${WORKSPACE_NAME}"

update_env_file() {
    local env_path="$1"
    local root_env_path="${ROOT_PATH}/${env_path}"

    if [ -f "${root_env_path}" ]; then
        cp "${root_env_path}" "${env_path}"
        echo "✅ Copied ${env_path}"

        if grep -q "^DATABASE_URL=" "${env_path}"; then
            local new_db_name="saveit.now2-${WORKSPACE_NAME}"
            sed -i.bak "s|^DATABASE_URL=\"postgresql://melvynx:@localhost:5432/saveit\.now2\"|DATABASE_URL=\"postgresql://melvynx:@localhost:5432/${new_db_name}\"|" "${env_path}"
            echo "✅ Updated DATABASE_URL in ${env_path} to use: ${new_db_name}"
            rm -f "${env_path}.bak"
        fi
    else
        echo "⚠️  Warning: ${root_env_path} not found"
    fi
}

copy_env_file() {
    local env_path="$1"
    local root_env_path="${ROOT_PATH}/${env_path}"

    if [ -f "${root_env_path}" ]; then
        cp "${root_env_path}" "${env_path}"
        echo "✅ Copied ${env_path}"
    fi
}

echo "Copying .env files..."
update_env_file "packages/database/.env"
update_env_file "apps/web/.env"

copy_env_file "apps/mobile/.env"
copy_env_file "apps/mobile/.env.development"
copy_env_file "apps/mobile/.env.production"

echo "Installing dependencies..."
pnpm install

echo "Generating Prisma client..."
pnpm --filter=database prisma:generate

NEW_DB_NAME="saveit.now2-${WORKSPACE_NAME}"
echo "Creating database: ${NEW_DB_NAME}"
createdb -U melvynx "${NEW_DB_NAME}"

ORIGINAL_DB="saveit.now2"
echo "Copying data from original database..."

if psql -U melvynx -lqt | cut -d \| -f 1 | grep -qw "${ORIGINAL_DB}"; then
    echo "Found original database '${ORIGINAL_DB}', copying data..."
    pg_dump -U melvynx --no-owner --no-privileges "${ORIGINAL_DB}" | psql -U melvynx "${NEW_DB_NAME}"
    echo "✅ Data copied from '${ORIGINAL_DB}' to '${NEW_DB_NAME}'"
else
    echo "⚠️  Original database '${ORIGINAL_DB}' not found, running migrations instead..."
    pnpm --filter=database prisma:migrate:deploy
fi

echo "🎉 SaveIt.now workspace '${WORKSPACE_NAME}' setup completed successfully!"
echo "Database: ${NEW_DB_NAME}"
echo "Ready to start development with: pnpm dev"
