# Deploying to Azure App Service from Monorepo

## Method 1: Using VS Code Azure Extension (Recommended)

Since you're in a monorepo, follow these steps:

1. **Open the API folder as a workspace in VS Code:**
   - In VS Code, go to File → Open Folder
   - Navigate to the `apps/api` directory of your clone
   - Open this folder (not the repository root)

2. **Install Azure App Service Extension (if not installed):**
   - Open Extensions (Cmd+Shift+X)
   - Search for "Azure App Service"
   - Install it

3. **Deploy:**
   - Right-click on the `src/CodeStackLMS.API` folder in VS Code
   - Select "Deploy to Web App..."
   - Choose your subscription
   - Select "CSALMS" from the list
   - Confirm deployment

The `.deployment` file in this directory tells Azure which project to build.

## Method 2: Using Azure CLI

From the `apps/api` directory:

```bash
# Build the project
cd src/CodeStackLMS.API
dotnet publish -c Release -o ./publish

# Create zip file
cd publish
zip -r deploy.zip .

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group <your-resource-group> \
  --name CSALMS \
  --src deploy.zip

# Cleanup
cd ..
rm -rf publish
```

## Method 3: GitHub Actions (not set up)

There is currently **no deploy workflow** — `.github/workflows/` contains only `ci.yml`
(build and test) and `load-test.yml` (manual). Deployment is done by Method 1 or 2 above.
Automating it would mean adding a workflow that publishes and pushes to App Service.

## After Deployment

Configure these settings in Azure Portal (App Services → CSALMS → Configuration):

**Connection Strings:**
- `DefaultConnection` (Type: SQLAzure)

**Application Settings:**
- `AzureStorage__ConnectionString`
- `AzureStorage__SubmissionsContainer`
- `AzureStorage__AvatarsContainer` *(optional — defaults to `avatars`)*
- `Jwt__Secret` — must be ≥32 bytes and must not be a template placeholder, or the app
  will refuse to start
- `Jwt__Issuer`
- `Jwt__Audience`
- `Frontend__Url` — also the CORS allow-list; comma-separated values are supported and the
  last one is used when building email links
- `Email__SmtpHost`
- `Email__SmtpPort`
- `Email__UseSsl`
- `Email__Username`
- `Email__Password`
- `Email__FromEmail`
- `Email__FromName`
- `Anthropic__ApiKey` — required for weekly progress reports
- `Anthropic__DefaultModel`, `Anthropic__MaxTokens`
- `Hangfire__Dashboard__Username`, `Hangfire__Dashboard__Password` — without these, browser
  access to `/hangfire` is denied in Production
- `Hangfire__WorkerCount` *(optional — defaults to 5)*
- `Seed__AdminEmail`, `Seed__AdminPassword` — used only when seeding an empty database
- `ApplicationInsights__ConnectionString`

**Important:** Use double underscores (`__`) for nested configuration values.

## Database migrations

The API runs `MigrateAsync` **and** seeds on startup, and rethrows on failure — so a bad
migration fails the deployment rather than silently leaving a half-migrated database. Two
consequences worth planning around:

- **A deploy is a schema change.** Review pending migrations before shipping.
- **This assumes a single instance.** There is no coordination lock, so scaling out or doing
  a slot swap could run migrations concurrently. Scale to one instance while deploying.

Backups rely on Azure SQL's point-in-time restore; there is no application-level rollback.
To roll back a schema change you need a compensating migration or a database restore.
