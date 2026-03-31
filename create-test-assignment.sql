-- This script creates a test assignment in Level 1 for testing the grades page
-- Run this in your SQL Server Management Studio or Azure Data Studio

-- First, get the Level 1 course ID and first module ID
DECLARE @Level1CourseId UNIQUEIDENTIFIER;
DECLARE @FirstModuleId UNIQUEIDENTIFIER;

SELECT TOP 1 @Level1CourseId = Id FROM Courses WHERE Title = 'Level 1';
SELECT TOP 1 @FirstModuleId = Id FROM Modules WHERE CourseId = @Level1CourseId ORDER BY [Order];

-- Create a test assignment
INSERT INTO Assignments (Id, ModuleId, Title, Instructions, DueDate, RubricJson, CreatedAt, UpdatedAt)
VALUES (
    NEWID(),
    @FirstModuleId,
    'Test Assignment for Grades Page',
    'This is a test assignment to verify the grades page works correctly.',
    DATEADD(day, 7, GETUTCDATE()),
    '{"maxScore":100,"criteria":[{"name":"Completion","points":50},{"name":"Quality","points":50}]}',
    GETUTCDATE(),
    GETUTCDATE()
);

-- Verify it was created
SELECT 
    a.Id as AssignmentId,
    a.Title as AssignmentTitle,
    m.Title as ModuleTitle,
    c.Title as CourseTitle
FROM Assignments a
INNER JOIN Modules m ON a.ModuleId = m.Id
INNER JOIN Courses c ON m.CourseId = c.Id
WHERE c.Title = 'Level 1'
ORDER BY m.[Order], a.DueDate;
