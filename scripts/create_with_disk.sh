#!/bin/bash
set -e
export RND="rnd_L7QTwh0BWePkcjHqwy1BVWWCvJ5P"

# Delete old
curl -s -X DELETE -H "Authorization: Bearer $RND" "https://api.render.com/v1/services/srv-d9glfcmpbkes73bsi7bg" > /dev/null
echo "Old deleted"

# Create with disk in serviceDetails
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
    "disk": {"name": "data", "mountPath": "/var/data", "sizeGB": 1},
    "envSpecificDetails": {
      "buildCommand": "echo pre-built; ls -la backend/dist | head -3; ls -la frontend/dist | head -3",
      "startCommand": "cd backend && PORT=10000 node dist/server.js"
    },
    "healthCheckPath": "/api/health"
  }
}')
echo "$RES" | python3 -c "import json,sys; d=json.load(sys.stdin); s=d.get('service',d); print('Service ID:', s.get('id'), '| disk:', s.get('disk'))"
NEW_SRV=$(echo "$RES" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['service']['id'])")
echo "$NEW_SRV" > /workspace/AURA-ACCOUNTING/.srv_id

# Env vars
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
echo "Service ID: $NEW_SRV"
