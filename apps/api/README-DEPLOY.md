# Deploying to Azure App Service from Monorepo

## Method 1: Using VS Code Azure Extension (Recommended)

Since you're in a monorepo, follow these steps:

1. **Open the API folder as a workspace in VS Code:**
   - In VS Code, go to File → Open Folder
   - Navigate to `/Users/isaiahkeithferguson/Downloads/lms/apps/api`
   - Open this folder (not the root `lms` folder)

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

## Method 3: GitHub Actions (Automated)

Set up CI/CD to automatically deploy when you push to main branch.
See `.github/workflows/deploy-api.yml` for configuration.

## After Deployment

Configure these settings in Azure Portal (App Services → CSALMS → Configuration):

**Connection Strings:**
- `DefaultConnection` (Type: SQLAzure)

**Application Settings:**
- `AzureStorage__ConnectionString`
- `AzureStorage__SubmissionsContainer`
- `Jwt__Secret`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Frontend__Url`
- `Email__SmtpHost`
- `Email__SmtpPort`
- `Email__UseSsl`
- `Email__Username`
- `Email__Password`
- `Email__FromEmail`
- `Email__FromName`

**Important:** Use double underscores (`__`) for nested configuration values.
