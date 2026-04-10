-- ============================================================================
-- DATABASE RESET SCRIPT
-- This will drop ALL tables and reset the database to a clean state
-- WARNING: This will DELETE ALL DATA permanently!
-- ============================================================================

-- Drop all foreign key constraints first
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + 
               ' DROP CONSTRAINT ' + QUOTENAME(fk.name) + ';' + CHAR(13)
FROM sys.foreign_keys AS fk
INNER JOIN sys.tables AS t ON fk.parent_object_id = t.object_id
INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id;

IF LEN(@sql) > 0
BEGIN
    PRINT 'Dropping foreign key constraints...';
    EXEC sp_executesql @sql;
    PRINT 'Foreign key constraints dropped.';
END

-- Drop all tables
SET @sql = N'';

SELECT @sql += N'DROP TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ';' + CHAR(13)
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
WHERE t.type = 'U'
  AND t.name != '__EFMigrationsHistory'; -- We'll drop this separately

IF LEN(@sql) > 0
BEGIN
    PRINT 'Dropping tables...';
    EXEC sp_executesql @sql;
    PRINT 'Tables dropped.';
END

-- Drop Hangfire schema and all its tables
IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'HangFire')
BEGIN
    PRINT 'Dropping Hangfire schema and tables...';
    
    -- Drop all tables in HangFire schema
    DECLARE @hangfireSql NVARCHAR(MAX) = N'';
    SELECT @hangfireSql += N'DROP TABLE [HangFire].' + QUOTENAME(name) + ';' + CHAR(13)
    FROM sys.tables
    WHERE schema_id = SCHEMA_ID('HangFire');
    
    IF LEN(@hangfireSql) > 0
    BEGIN
        EXEC sp_executesql @hangfireSql;
    END
    
    -- Drop the schema
    DROP SCHEMA [HangFire];
    PRINT 'Hangfire schema dropped.';
END

-- Drop the __EFMigrationsHistory table
IF EXISTS (SELECT * FROM sys.tables WHERE name = '__EFMigrationsHistory')
BEGIN
    DROP TABLE [__EFMigrationsHistory];
END

PRINT 'Database reset complete. All tables have been dropped.';
PRINT 'Next steps:';
PRINT '1. Stop the API if it is running';
PRINT '2. Delete all migration files from CodeStackLMS.Infrastructure/Migrations folder';
PRINT '3. Run: dotnet ef migrations add InitialCreate --project src/CodeStackLMS.Infrastructure --startup-project src/CodeStackLMS.API';
PRINT '4. Start the API - it will automatically run migrations and seed the admin user';
