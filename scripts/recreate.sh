#!/bin/bash
# Recreate AURA-Accounting service from scratch
# Usage: bash scripts/recreate.sh
# This preserves the URL (aura-accounting.onrender.com) by reusing the slug.

set -e
RND="${RENDER_API_KEY:-rnd_L7QTwh0BWePkcjHqwy1BVWWCvJ5P}"
TEAM="tea-d8qqtternols73ehmla0"
REPO="https://github.com/ABBYCRM/AURA-ACCOUNTING"

# 1. Delete any existing service with this name
EXISTING=$(curl -s -H "Authorization: Bearer $RND" "https://api.render.com/v1/services?limit=50" | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('services', [])
for s in items:
    name = s.get('service', {}).get('name') if isinstance(s.get('service'), dict) else s.get('name')
    if name == 'aura-accounting':
        print(s.get('service', s).get('id'))
        break")
if [ -n "$EXISTING" ]; then
  echo "=== Deleting existing $EXISTING ==="
  curl -s -X DELETE -H "Authorization: Bearer $RND" "https://api.render.com/v1/services/$EXISTING" -o /dev/null -w "HTTP %{http_code}\n"
  sleep 5
fi

# 2. Create new service
echo "=== Creating aura-accounting service ==="
RES=$(curl -s -X POST -H "Authorization: Bearer $RND" -H "Content-Type: application/json" \
  "https://api.render.com/v1/services" --data @- <<JSON
{
  "type": "web_service",
  "name": "aura-accounting",
  "ownerId": "$TEAM",
  "repo": "$REPO",
  "branch": "main",
  "autoDeploy": "no",
  "serviceDetails": {
    "env": "node",
    "plan": "starter",
    "region": "oregon",
    "runtime": "node",
    "envSpecificDetails": {
      "buildCommand": "cd backend && npm install --no-audit --no-fund",
      "startCommand": "cd backend && node dist/server.js"
    },
    "healthCheckPath": "/api/health"
  }
}
JSON
)
NEW=$(echo "$RES" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('service',d).get('id') or '')")
if [ -z "$NEW" ]; then
  echo "Create failed: $RES"
  exit 1
fi
echo "Created: $NEW"

# 3. Set env vars
echo "=== Setting env vars ==="
curl -s -X PUT -H "Authorization: Bearer $RND" -H "Content-Type: application/json" \
  "https://api.render.com/v1/services/$NEW/env-vars" --data '[
  {"key":"NODE_ENV","value":"production"},
  {"key":"PORT","value":"10000"},
  {"key":"DATABASE_PATH","value":"/tmp/aura-accounting.sqlite"},
  {"key":"JWT_SECRET","value":"AURA-jwt-prod-secret-32chars-min-2026-07-22"},
  {"key":"SESSION_SECRET","value":"AURA-session-prod-secret-32chars-2026-07-22"},
  {"key":"QBO_ENVIRONMENT","value":"sandbox"},
  {"key":"APP_URL","value":"https://aura-accounting.onrender.com"}
]' -o /dev/null -w "Env HTTP %{http_code}\n"

# 4. Trigger deploy
echo "=== Triggering deploy ==="
DEP=$(curl -s -X POST -H "Authorization: Bearer $RND" "https://api.render.com/v1/services/$NEW/deploys")
echo "$DEP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('Deploy:', d.get('id'), d.get('status'))"

echo "Service ID: $NEW"
echo "URL: https://aura-accounting.onrender.com"
