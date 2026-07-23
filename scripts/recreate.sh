#!/bin/bash
set -e
export RND="rnd_L7QTwh0BWePkcjHqwy1BVWWCvJ5P"

# Delete existing
echo "=== Delete old service ==="
curl -s -X DELETE -H "Authorization: Bearer $RND" "https://api.render.com/v1/services/srv-d9gitcflk1mc73ftgeq0" > /dev/null
echo "Deleted"

# Create new
echo "=== Create new service ==="
RES=$(curl -s -X POST -H "Authorization: Bearer $RND" -H "Content-Type: application/json" https://api.render.com/v1/services --data '{
  "type": "web_service",
  "name": "AURA-ACCOUNTING",
  "ownerId": "tea-d8qqtternols73ehmla0",
  "repo": "https://github.com/ABBYCRM/AURA-ACCOUNTING",
  "branch": "main",
  "autoDeploy": "no",
  "serviceDetails": {
    "env": "node",
    "plan": "starter",
    "region": "oregon",
    "runtime": "node",
    "envSpecificDetails": {
      "buildCommand": "cd frontend && npm install --no-audit --no-fund && npm run build && cd ../backend && npm install --no-audit --no-fund && npm run build",
      "startCommand": "cd backend && node dist/server.js"
    }
  }
}')
echo "Create response:"
echo "$RES" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('service',{}).get('id') or json.dumps(d))"
NEW_SRV=$(echo "$RES" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['service']['id'])")
echo "New service: $NEW_SRV"

# Env vars
echo "=== Set env vars ==="
curl -s -X PUT -H "Authorization: Bearer $RND" -H "Content-Type: application/json" "https://api.render.com/v1/services/$NEW_SRV/env-vars" --data '[
  {"key":"NODE_ENV","value":"production"},
  {"key":"PORT","value":"10000"},
  {"key":"DATABASE_PATH","value":"/var/data/aura-accounting.sqlite"},
  {"key":"JWT_SECRET","value":"AURA-jwt-prod-secret-32chars-min-2026-07-22"},
  {"key":"SESSION_SECRET","value":"AURA-session-prod-secret-32chars-2026-07-22"},
  {"key":"QBO_ENVIRONMENT","value":"sandbox"},
  {"key":"APP_URL","value":"https://aura-accounting.onrender.com"}
]' > /dev/null
echo "Env vars set"

# Health check
echo "=== Add health check ==="
curl -s -X PATCH -H "Authorization: Bearer $RND" -H "Content-Type: application/json" "https://api.render.com/v1/services/$NEW_SRV" --data '{"serviceDetails":{"healthCheckPath":"/api/health"}}' > /dev/null
echo "Health check set"

echo "$NEW_SRV" > /workspace/AURA-ACCOUNTING/.srv_id
echo "Service ID saved to .srv_id: $NEW_SRV"
