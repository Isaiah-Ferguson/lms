---
description: Deploy the CodeStack LMS .NET API to Azure Web App via Azure CLI
---

## Prerequisites

- Azure CLI installed: `brew install azure-cli`
- .NET 10 SDK installed: `dotnet --version`
- Logged in: `az login`

---

## Variables (set these once)

```bash
RG="codestack-lms-rg"
PLAN="codestack-lms-plan"
APP="codestack-lms-api"          # must be globally unique — becomes <app>.azurewebsites.net
LOCATION="eastus"
```

---

## Step 1 — Create Azure resources (first deploy only)

```bash
# Resource group
az group create --name $RG --location $LOCATION

# App Service Plan (Linux, B1 basic — upgrade to P1V2 for production load)
az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --is-linux \
  --sku B1

# Web App — .NET 10 on Linux
az webapp create \
  --name $APP \
  --resource-group $RG \
  --plan $PLAN \
  --runtime "DOTNETCORE|10.0"
```

---

## Step 2 — Configure Application Settings

These override values in appsettings.json. Use `__` (double underscore) for nested keys.

```bash
az webapp config appsettings set \
  --name $APP \
  --resource-group $RG \
  --settings \
    "ASPNETCORE_ENVIRONMENT=Production" \
    "Frontend__Url=https://YOUR-FRONTEND-URL.vercel.app" \
    "Jwt__Secret=YOUR-STRONG-SECRET-MIN-32-CHARS" \
    "Jwt__Issuer=codestack-lms" \
    "Jwt__Audience=codestack-lms" \
    "AzureStorage__ConnectionString=DefaultEndpointsProtocol=https;AccountName=codestacklms;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net" \
    "AzureStorage__SubmissionsContainer=codestacklms" \
    "Email__SmtpHost=smtp.gmail.com" \
    "Email__SmtpPort=587" \
    "Email__UseSsl=true" \
    "Email__Username=YOUR_EMAIL" \
    "Email__Password=YOUR_APP_PASSWORD" \
    "Email__FromEmail=YOUR_EMAIL" \
    "Email__FromName=CodeStack LMS"
```

### Connection string (set separately so Azure treats it as a connection string)

```bash
az webapp config connection-string set \
  --name $APP \
  --resource-group $RG \
  --connection-string-type SQLAzure \
  --settings DefaultConnection="Server=tcp:csa-lms-test.database.windows.net,1433;Initial Catalog=csa-lms-test;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=Active Directory Default;"
```

---

## Step 3 — Enable Managed Identity for SQL Auth

The DB connection uses `Authentication=Active Directory Default`, which requires
the Web App's system-assigned managed identity to have SQL access.

```bash
# Enable system-assigned managed identity
az webapp identity assign \
  --name $APP \
  --resource-group $RG
```

Note the `principalId` printed. Then in the Azure Portal (or via sqlcmd):

1. Open **Azure SQL → csa-lms-test → Query editor**
2. Run:

```sql
CREATE USER [<app-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<app-name>];
ALTER ROLE db_datawriter ADD MEMBER [<app-name>];
ALTER ROLE db_ddladmin   ADD MEMBER [<app-name>];
```

Replace `<app-name>` with the exact Web App name (e.g. `codestack-lms-api`).

> **Alternative**: If you prefer SQL username/password auth, add `User ID=...;Password=...;`
> to the connection string and remove `Authentication=Active Directory Default;`.

---

## Step 4 — Build & Publish

Run from the repo root (`/lms/apps/api`):

```bash
dotnet publish src/CodeStackLMS.API/CodeStackLMS.API.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained false \
  -o ./publish
```

---

## Step 5 — Zip & Deploy

```bash
cd publish && zip -r ../deploy.zip . && cd ..

az webapp deploy \
  --name $APP \
  --resource-group $RG \
  --src-path deploy.zip \
  --type zip
```

---

## Step 6 — Verify

```bash
# Tail live logs
az webapp log tail --name $APP --resource-group $RG

# Open in browser
open "https://$APP.azurewebsites.net/swagger"
```

---

## Re-deploying (subsequent deploys)

Only steps 4 and 5 are needed:

```bash
dotnet publish src/CodeStackLMS.API/CodeStackLMS.API.csproj -c Release -r linux-x64 --self-contained false -o ./publish
cd publish && zip -r ../deploy.zip . && cd ..
az webapp deploy --name $APP --resource-group $RG --src-path deploy.zip --type zip
```
