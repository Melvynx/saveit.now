#!/bin/bash

# Automated iOS build script
export APPLE_ID="melvynmal@gmail.com"
export APPLE_TEAM_ID="UUFHFWGCU4"
export RN_PRIVACY_MANIFEST_AGGREGATION="false"
export EX_DEV_CLIENT_NETWORK_INSPECTOR="false"

echo "🚀 Starting automated iOS build..."

# Clean and rebuild iOS files
rm -rf ios
npx expo prebuild --platform ios --clean

# Start the build
eas build --platform ios --profile production --local --non-interactive

echo "✅ Build completed!"