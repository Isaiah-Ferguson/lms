#!/bin/bash

# Get connection string
CONNECTION_STRING=$(az webapp config connection-string list --name CSALMS --resource-group lms --query "[?name=='DefaultConnection'].value" -o tsv)

# Extract components
SERVER=$(echo "$CONNECTION_STRING" | grep -o 'Server=[^;]*' | cut -d'=' -f2)
DATABASE=$(echo "$CONNECTION_STRING" | grep -o 'Initial Catalog=[^;]*' | cut -d'=' -f2)

echo "Server: $SERVER"
echo "Database: $DATABASE"
echo ""
echo "Please run the following SQL manually in Azure Portal Query Editor:"
echo "1. Go to https://portal.azure.com"
echo "2. Navigate to SQL Database: $DATABASE"
echo "3. Click 'Query editor' in the left menu"
echo "4. Login with Azure AD"
echo "5. Run the SQL from fix-migration.sql"
echo ""
cat fix-migration.sql
