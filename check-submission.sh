#!/bin/bash
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@codestack.com","password":"Instructor123!"}')
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "=== Checking Jane's submission detail ==="
curl -s -X GET "http://localhost:5000/api/instructor/submissions/61485c81-21f8-42d1-a952-64c9940e1ab3" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
