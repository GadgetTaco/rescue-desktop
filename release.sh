#!/bin/bash
# RESCUE NextGen Desktop -- Release Script
# Usage: cd "/Volumes/Dock HD/GitHub/rescue-desktop" && ./release.sh
# Run after: npm run dist
# Uploads .exe + .blockmap + latest.yml to a new GitHub release.

set -e

REPO="GadgetTaco/rescue-desktop"
DIST="dist"

VERSION=$(python3 -c 'import json; print(json.load(open("package.json"))["version"])')
TOKEN=$(security find-internet-password -s github.com -w 2>/dev/null)

echo "Publishing v$VERSION..."

# Step 1: Create release, capture ID via temp file
curl -s -X POST "https://api.github.com/repos/$REPO/releases" \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tag_name\":\"v$VERSION\",\"name\":\"RESCUE NextGen Desktop v$VERSION\",\"draft\":false,\"prerelease\":false}" \
  > /tmp/rn_release.json

RELEASE_ID=$(python3 -c 'import json; print(json.load(open("/tmp/rn_release.json"))["id"])')
echo "  Release ID: $RELEASE_ID"

# Step 2: Upload .exe
echo "  Uploading .exe..."
curl -s -X POST "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=RESCUE-NextGen-Setup-$VERSION.exe" \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$DIST/RESCUE NextGen Setup $VERSION.exe" \
  > /tmp/rn_a1.json
python3 -c 'import json; print("  OK:", json.load(open("/tmp/rn_a1.json")).get("name"))'

# Step 3: Upload .blockmap
echo "  Uploading .blockmap..."
curl -s -X POST "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=RESCUE-NextGen-Setup-$VERSION.exe.blockmap" \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$DIST/RESCUE NextGen Setup $VERSION.exe.blockmap" \
  > /tmp/rn_a2.json
python3 -c 'import json; print("  OK:", json.load(open("/tmp/rn_a2.json")).get("name"))'

# Step 4: Upload latest.yml -- CRITICAL for auto-updater
echo "  Uploading latest.yml..."
curl -s -X POST "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=latest.yml" \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: text/yaml" \
  --data-binary @"$DIST/latest.yml" \
  > /tmp/rn_a3.json
python3 -c 'import json; print("  OK:", json.load(open("/tmp/rn_a3.json")).get("name"))'

echo ""
echo "Release complete: https://github.com/$REPO/releases/tag/v$VERSION"
