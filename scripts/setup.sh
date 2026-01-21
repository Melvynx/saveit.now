#!/bin/bash

# Conductor setup script for saveit.now-mono
# Runs when a workspace is created. Used for copying .env files and installing dependencies.

set -e

WORKSPACE_NAME="${CONDUCTOR_WORKSPACE_NAME}"
ROOT_PATH="${CONDUCTOR_ROOT_PATH}"
DEV_PATH="/Users/melvynx/Developer/saas/saveit.now-mono"

if [ -z "${WORKSPACE_NAME}" ]; then
    echo "Error: CONDUCTOR_WORKSPACE_NAME is not set"
    exit 1
fi

echo "Setting up SaveIt.now workspace: ${WORKSPACE_NAME}"
echo "Current directory: $(pwd)"
echo "CONDUCTOR_ROOT_PATH: ${ROOT_PATH}"
echo "Fallback dev path: ${DEV_PATH}"

find_env_source() {
    local env_path="$1"

    if [ -n "${ROOT_PATH}" ] && [ -f "${ROOT_PATH}/${env_path}" ]; then
        echo "${ROOT_PATH}/${env_path}"
        return 0
    fi

    if [ -f "${DEV_PATH}/${env_path}" ]; then
        echo "${DEV_PATH}/${env_path}"
        return 0
    fi

    return 1
}

update_env_file() {
    local env_path="$1"
    local source_path

    if source_path=$(find_env_source "${env_path}"); then
        cp "${source_path}" "${env_path}"
        echo "✅ Copied ${env_path} from ${source_path}"

        if grep -q "^DATABASE_URL=" "${env_path}"; then
            local new_db_name="saveit.now-${WORKSPACE_NAME}"
            sed -i.bak "s|^DATABASE_URL=\"postgresql://melvynx:@localhost:5432/saveit\.now\"|DATABASE_URL=\"postgresql://melvynx:@localhost:5432/${new_db_name}\"|" "${env_path}"
            rm -f "${env_path}.bak"

            if grep -q "saveit\.now-${WORKSPACE_NAME}" "${env_path}"; then
                echo "✅ Updated DATABASE_URL in ${env_path} to use: ${new_db_name}"
            else
                echo "⚠️  DATABASE_URL pattern not matched in ${env_path}, check manually"
            fi
        fi
    else
        echo "⚠️  Warning: ${env_path} not found in ROOT_PATH or DEV_PATH"
    fi
}

copy_env_file() {
    local env_path="$1"
    local source_path

    if source_path=$(find_env_source "${env_path}"); then
        cp "${source_path}" "${env_path}"
        echo "✅ Copied ${env_path} from ${source_path}"
    fi
}

echo ""
echo "Copying .env files..."
update_env_file "packages/database/.env"
update_env_file "apps/web/.env"

copy_env_file "apps/mobile/.env"
copy_env_file "apps/mobile/.env.development"
copy_env_file "apps/mobile/.env.production"

echo ""
echo "Installing dependencies..."
pnpm install

echo "Generating Prisma client..."
pnpm --filter=database prisma:generate

NEW_DB_NAME="saveit.now-${WORKSPACE_NAME}"
echo "Creating database: ${NEW_DB_NAME}"
createdb -U melvynx "${NEW_DB_NAME}"

ORIGINAL_DB="saveit.now"
echo "Copying data from original database..."

if psql -U melvynx -lqt | cut -d \| -f 1 | grep -qw "${ORIGINAL_DB}"; then
    echo "Found original database '${ORIGINAL_DB}', copying data..."
    pg_dump -U melvynx --no-owner --no-privileges "${ORIGINAL_DB}" | psql -U melvynx "${NEW_DB_NAME}"
    echo "✅ Data copied from '${ORIGINAL_DB}' to '${NEW_DB_NAME}'"
else
    echo "⚠️  Original database '${ORIGINAL_DB}' not found, running migrations instead..."
    pnpm --filter=database prisma:migrate:deploy
fi

echo ""
echo "🎉 SaveIt.now workspace '${WORKSPACE_NAME}' setup completed successfully!"
echo "Database: ${NEW_DB_NAME}"
echo "Ready to start development with: pnpm dev"
