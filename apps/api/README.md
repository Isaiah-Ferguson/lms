# CodeStack LMS API

## Setup Instructions

### 1. Configure Application Settings

Copy the template files and add your actual credentials:

```bash
cd src/CodeStackLMS.API
cp appsettings.json.template appsettings.json
cp appsettings.Development.json.template appsettings.Development.json
```

### 2. Update Configuration Values

Edit `appsettings.json` and `appsettings.Development.json` with your actual values:

- **ConnectionStrings.DefaultConnection**: Your Azure SQL Database connection string
- **AzureStorage.ConnectionString**: Your Azure Storage account connection string
- **Jwt.Secret**: A secure random string, minimum 32 bytes. Outside Development the API
  refuses to start if this is missing, too short, or still set to a template placeholder.
- **Frontend.Url**: Used for CORS *and* to build links in outgoing email (password reset).
  If several comma-separated URLs are configured, the last one is used for email links.
- **Email.Username**: Your Gmail address
- **Email.Password**: Your Gmail app-specific password (not your regular password)
- **Anthropic.ApiKey**: Required for the weekly Claude progress reports
- **Hangfire.Dashboard.Username / Password**: Gate `/hangfire` outside Development
- **Seed.AdminEmail** / **Seed.AdminPassword**: Credentials for the initial admin account that is seeded on first startup. If either value is missing, seeding is skipped. The seeded admin is created with `MustChangePassword = true`, so you will be prompted to reset on first login.

### 3. Run Migrations

```bash
dotnet ef database update --project src/CodeStackLMS.Infrastructure --startup-project src/CodeStackLMS.API
```

### 4. Run the API

```bash
cd src/CodeStackLMS.API
dotnet run
```

The API will be available at `http://localhost:5000`

## Security Notes

- **Never commit** `appsettings.json` or `appsettings.Development.json` to Git
- These files are in `.gitignore` to prevent accidental commits
- Use the `.template` files as reference for required configuration
- For production, use Azure Key Vault or environment variables instead of appsettings files
- For **local development**, prefer `dotnet user-secrets` over editing `appsettings.json` —
  it stores values outside the repository tree, so there is nothing to accidentally commit,
  share on a screen, or sweep into a backup:

  ```bash
  cd src/CodeStackLMS.API
  dotnet user-secrets init
  dotnet user-secrets set "ConnectionStrings:DefaultConnection" "…"
  dotnet user-secrets set "Jwt:Secret" "…"
  ```

## Running Tests

```bash
dotnet test tests/CodeStackLMS.Application.Tests
```

Tests run against SQLite in-memory behind the production `ApplicationDbContext`, so queries
are verified as real SQL translation rather than in-memory LINQ. No external database or
Azure resources are required.
