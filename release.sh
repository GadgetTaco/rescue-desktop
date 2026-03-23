#!/bin/bash
# RESCUE NextGen Desktop — Release Script
# Usage: ./release.sh
# Reads version from package.json, creates GitHub release, uploads all assets.

set -e

VERSION=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
TOKEN=$(security find-internet-password -s github.com -w 2>/dev/null)
DIST="dist"

echo "Publishing v$VERSION..."

# Create release
RELEASE_ID=$(curl -s -X POST 
  "https://api.github.com/repos/GadgetTaco/rescue-desktop/releases" 
  -H "Authorization: token $TOKEN" 
  -H "Content-Type: application/json" 
  -d "{\"tag_name\":\"v$VERSION\",\"name\":\"RESCUE NextGen Desktop v$VERSION\",\"draft\":false,\"prerelease\":false}" 
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "Release ID: $RELEASE_ID"

# Upload .exe
curl -s -X POST 
  "https://uploads.github.com/repos/GadgetTaco/rescue-desktop/releases/$RELEASE_ID/assets?name=RESCUE-NextGen-Setup-$VERSION.exe" 
  -H "Authorization: token $TOKEN" 
  -H "Content-Type: application/octet-stream" 
  --data-binary @"$DIST/RESCUE NextGen Setup $VERSION.exe" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  .exe:', d['name'])"

# Upload .blockmap
curl -s -X POST 
  "https://uploads.github.com/repos/GadgetTaco/rescue-desktop/releases/$RELEASE_ID/assets?name=RESCUE-NextGen-Setup-$VERSION.exe.blockmap" 
  -H "Authorization: token $TOKEN" 
  -H "Content-Type: application/octet-stream" 
  --data-binary @"$DIST/RESCUE NextGen Setup $VERSION.exe.blockmap" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  .blockmap:', d['name'])"

# Upload latest.yml (CRITICAL for auto-updater)
curl -s -X POST 
  "https://uploads.github.com/repos/GadgetTaco/rescue-desktop/releases/$RELEASE_ID/assets?name=latest.yml" 
  -H "Authorization: token $TOKEN" 
  -H "Content-Type: text/yaml" 
  --data-binary @"$DIST/latest.yml" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  latest.yml:', d['name'])"

echo ""
echo "✅ v$VERSION published"
echo "   https://github.com/GadgetTaco/rescue-desktop/releases/tag/v$VERSION"
