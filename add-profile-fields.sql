-- Add PhoneNumber and GitHubUsername columns to Users table
-- Run this in Azure Portal Query Editor

ALTER TABLE Users 
ADD PhoneNumber NVARCHAR(50) NOT NULL DEFAULT '',
    GitHubUsername NVARCHAR(100) NOT NULL DEFAULT '';

-- Verify the columns were added
SELECT TOP 1 
    Id,
    Name,
    Email,
    Town,
    PhoneNumber,
    GitHubUsername,
    AvatarUrl
FROM Users;
