-- Check if PhoneNumber and GitHubUsername columns exist and have data
-- Run this in Azure Portal Query Editor

-- Check the current data for Crestice Admin user
SELECT 
    Id,
    Name,
    Email,
    Town,
    PhoneNumber,
    GitHubUsername,
    AvatarUrl,
    EmailNotificationsEnabled,
    DarkModeEnabled
FROM Users
WHERE Email = 'isaiahkferguson89@gmail.com';

-- Check column definitions
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
AND COLUMN_NAME IN ('PhoneNumber', 'GitHubUsername')
ORDER BY COLUMN_NAME;
