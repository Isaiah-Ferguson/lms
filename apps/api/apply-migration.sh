#!/bin/bash
# Apply migration to Azure database using dotnet ef

cd /Users/isaiahkeithferguson/Downloads/lms/apps/api

# Get the connection string from Azure
CONNECTION_STRING=$(az webapp config connection-string list --name CSALMS --resource-group lms --query "[?name=='DefaultConnection'].value" -o tsv)

echo "Applying migration to Azure database..."

# Apply migrations using EF Core tools
dotnet ef database update \
  --project src/CodeStackLMS.Infrastructure/CodeStackLMS.Infrastructure.csproj \
  --startup-project src/CodeStackLMS.API/CodeStackLMS.API.csproj \
  --connection "$CONNECTION_STRING"

echo "Migration complete!"
