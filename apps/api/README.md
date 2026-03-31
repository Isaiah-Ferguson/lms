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
- **Jwt.Secret**: A secure random string (minimum 32 characters)
- **Email.Username**: Your Gmail address
- **Email.Password**: Your Gmail app-specific password (not your regular password)

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
