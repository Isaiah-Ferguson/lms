#!/bin/bash

# Requires TEST_EMAIL and TEST_PASSWORD environment variables.
#   export TEST_EMAIL="you@example.com"
#   export TEST_PASSWORD="your-password"
: "${TEST_EMAIL:?TEST_EMAIL must be set}"
: "${TEST_PASSWORD:?TEST_PASSWORD must be set}"

# First, login to get a valid token
echo "=== Logging in ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to login. Response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Logged in successfully"
echo ""

# Get all submissions
echo "=== Getting submission queue ==="
curl -s -X GET "http://localhost:5000/api/instructor/submissions" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "=== Getting assignments for a course ==="
curl -s -X GET "http://localhost:5000/api/assignments?courseId=level-1" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
