-- Add Academic Probation fields to Users table
-- Run this in Azure Portal Query Editor

ALTER TABLE Users 
ADD IsOnProbation BIT NOT NULL DEFAULT 0,
    ProbationReason NVARCHAR(500) NOT NULL DEFAULT '';

-- Verify the columns were added
SELECT TOP 5
    Id,
    Name,
    Email,
    IsOnProbation,
    ProbationReason
FROM Users;
