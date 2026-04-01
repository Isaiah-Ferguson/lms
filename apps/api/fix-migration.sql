-- Remove the migration from history since the table was never actually created
DELETE FROM [dbo].[__EFMigrationsHistory] 
WHERE [MigrationId] = N'20260401182245_AddLessonArtifacts';

-- Now create the table
CREATE TABLE [dbo].[LessonArtifacts] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [LessonId] UNIQUEIDENTIFIER NOT NULL,
    [BlobPath] NVARCHAR(MAX) NOT NULL,
    [FileName] NVARCHAR(MAX) NOT NULL,
    [ContentType] NVARCHAR(MAX) NOT NULL,
    [SizeBytes] BIGINT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_LessonArtifacts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_LessonArtifacts_Lessons_LessonId] FOREIGN KEY ([LessonId]) 
        REFERENCES [dbo].[Lessons] ([Id]) ON DELETE CASCADE
);

-- Create index on LessonId for query performance
CREATE INDEX [IX_LessonArtifacts_LessonId] ON [dbo].[LessonArtifacts] ([LessonId]);

-- Re-insert migration history record
INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260401182245_AddLessonArtifacts', N'10.0.0');
