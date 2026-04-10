-- ============================================================================
-- SIMPLE DATABASE RESET SCRIPT
-- Alternative simpler approach - drops and recreates the entire database
-- WARNING: This will DELETE ALL DATA permanently!
-- ============================================================================

USE master;
GO

-- Close all connections to the database
DECLARE @DatabaseName NVARCHAR(128) = 'CodeStackLMS';

-- Kill all active connections
DECLARE @kill VARCHAR(MAX) = '';
SELECT @kill = @kill + 'KILL ' + CONVERT(VARCHAR(10), session_id) + '; '
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID(@DatabaseName);

IF LEN(@kill) > 0
BEGIN
    PRINT 'Closing active connections...';
    EXEC(@kill);
END

-- Drop the database if it exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = @DatabaseName)
BEGIN
    PRINT 'Dropping database...';
    EXEC('DROP DATABASE ' + @DatabaseName);
    PRINT 'Database dropped.';
END

-- Recreate the database
PRINT 'Creating fresh database...';
EXEC('CREATE DATABASE ' + @DatabaseName);
PRINT 'Database created.';

GO

PRINT '✅ Database reset complete!';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Delete migration files: rm -rf src/CodeStackLMS.Infrastructure/Migrations/*';
PRINT '2. Create new migration: dotnet ef migrations add InitialCreate';
PRINT '3. Start the API - it will auto-migrate and seed the admin user';
