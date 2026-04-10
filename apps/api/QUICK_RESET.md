# Quick Database Reset

## TL;DR - Fast Reset Steps

### Option A: Simple Reset (Recommended - Easiest)
```sql
-- Run SIMPLE_RESET.sql in your SQL client
-- This drops and recreates the entire database
```

### Option B: Automated Script
```bash
# 1. Stop the API (Ctrl+C if running)

# 2. Run the automated script
cd /Users/isaiahkeithferguson/Downloads/lms/apps/api
./reset-database.sh

# 3. When prompted, run RESET_DATABASE.sql in your SQL client

# 4. Press Enter to continue the script

# 5. Start the API
dotnet run --project src/CodeStackLMS.API
```

## Login After Reset
- **Email**: crestice@yahoo.com  
- **Password**: password

---

## Manual Steps (if script doesn't work)

```bash
cd /Users/isaiahkeithferguson/Downloads/lms/apps/api

# 1. Delete migrations
rm -rf src/CodeStackLMS.Infrastructure/Migrations/*

# 2. Run RESET_DATABASE.sql in your SQL client

# 3. Create new migration
dotnet ef migrations add InitialCreate \
  --project src/CodeStackLMS.Infrastructure \
  --startup-project src/CodeStackLMS.API

# 4. Start API (it will auto-migrate and seed)
dotnet run --project src/CodeStackLMS.API
```

---

## What You Get
✅ Clean database  
✅ All tables recreated  
✅ 1 admin user only  
✅ No test data  
✅ Ready for production use
