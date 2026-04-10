# Database Reset Guide

## ⚠️ WARNING
This will **DELETE ALL DATA** from your database permanently. Make sure you have backups if needed.

## What This Does
- Drops all database tables
- Removes all migrations
- Creates fresh migrations
- Seeds only 1 admin user: **crestice@yahoo.com** with password **password**

---

## Step-by-Step Instructions

### Step 1: Stop the API
Make sure the .NET API is not running.

```bash
# If running in terminal, press Ctrl+C
```

### Step 2: Run the SQL Reset Script
Execute the SQL script to drop all tables:

**Option A: Using SQL Server Management Studio (SSMS)**
1. Open SSMS
2. Connect to your database
3. Open the file: `RESET_DATABASE.sql`
4. Execute the script (F5)

**Option B: Using sqlcmd**
```bash
cd /Users/isaiahkeithferguson/Downloads/lms/apps/api
sqlcmd -S localhost -d CodeStackLMS -i RESET_DATABASE.sql
```

**Option C: Using Azure Data Studio**
1. Open Azure Data Studio
2. Connect to your database
3. Open `RESET_DATABASE.sql`
4. Run the script

### Step 3: Delete All Migration Files
Remove all existing migration files:

```bash
cd /Users/isaiahkeithferguson/Downloads/lms/apps/api
rm -rf src/CodeStackLMS.Infrastructure/Migrations/*
```

### Step 4: Create Fresh Initial Migration
Generate a new initial migration:

```bash
cd /Users/isaiahkeithferguson/Downloads/lms/apps/api
dotnet ef migrations add InitialCreate \
  --project src/CodeStackLMS.Infrastructure \
  --startup-project src/CodeStackLMS.API
```

### Step 5: Start the API
The API will automatically:
- Apply the new migration
- Create all tables
- Seed the admin user

```bash
cd /Users/isaiahkeithferguson/Downloads/lms/apps/api
dotnet run --project src/CodeStackLMS.API
```

### Step 6: Verify
You should see in the logs:
```
Starting database migration...
Database migration completed
Starting database seeding...
Database initialised and seeded successfully
```

---

## Login Credentials

After reset, you can log in with:

- **Email**: crestice@yahoo.com
- **Password**: password

---

## Alternative: Quick Reset (If you just want to clear data)

If you want to keep your migrations but just clear the data:

```sql
-- Clear all data but keep tables
EXEC sp_MSforeachtable 'DELETE FROM ?';

-- Then restart the API to re-seed the admin user
```

---

## Troubleshooting

### "Cannot drop table because it is being referenced by a foreign key constraint"
- Make sure you ran the full `RESET_DATABASE.sql` script which handles foreign keys

### "Database does not exist"
- Create the database first:
  ```sql
  CREATE DATABASE CodeStackLMS;
  ```

### "Migration already exists"
- Make sure you deleted all files in the Migrations folder

### API won't start after reset
- Check the connection string in `appsettings.json`
- Verify the database exists
- Check the logs for specific errors

---

## What Gets Created

After the reset, your database will have:

### Tables
- Users (with 1 admin)
- Courses
- Modules  
- Assignments
- Submissions
- Grades
- Enrollments
- SubmissionFiles
- Hangfire tables (for background jobs)

### Single User
- **Name**: Crestice Admin
- **Email**: crestice@yahoo.com
- **Password**: password
- **Role**: Admin
- **Status**: Active

---

## Notes

- The admin user ID is fixed: `c0a9f731-8d38-4f43-83f1-6f2e8b8cf901`
- No test students will be created
- No courses will be pre-populated
- You'll need to create courses, modules, and assignments through the admin UI
