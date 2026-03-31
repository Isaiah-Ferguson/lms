-- CodeStack LMS MySQL Schema
-- Generated for MySQL 8.0+
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci

-- Create Database
CREATE DATABASE IF NOT EXISTS codestack_lms
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE codestack_lms;

-- ============================================
-- Table: Users
-- ============================================
CREATE TABLE Users (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    PasswordHash VARCHAR(500) NOT NULL,
    Role INT NOT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    LastLoginAt DATETIME(6) NULL,
    
    UNIQUE INDEX IX_Users_Email (Email),
    INDEX IX_Users_Role (Role),
    INDEX IX_Users_IsActive (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Cohorts
-- ============================================
CREATE TABLE Cohorts (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    StartDate DATETIME(6) NOT NULL,
    EndDate DATETIME(6) NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    
    INDEX IX_Cohorts_Name (Name),
    INDEX IX_Cohorts_DateRange (StartDate, EndDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Courses
-- ============================================
CREATE TABLE Courses (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    Title VARCHAR(300) NOT NULL,
    Description VARCHAR(2000) NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    
    INDEX IX_Courses_Title (Title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: CohortCourses
-- ============================================
CREATE TABLE CohortCourses (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    CohortId CHAR(36) NOT NULL,
    CourseId CHAR(36) NOT NULL,
    
    UNIQUE INDEX IX_CohortCourses_CohortId_CourseId (CohortId, CourseId),
    INDEX IX_CohortCourses_CourseId (CourseId),
    
    CONSTRAINT FK_CohortCourses_Cohorts FOREIGN KEY (CohortId)
        REFERENCES Cohorts(Id) ON DELETE CASCADE,
    CONSTRAINT FK_CohortCourses_Courses FOREIGN KEY (CourseId)
        REFERENCES Courses(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Modules
-- ============================================
CREATE TABLE Modules (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    CourseId CHAR(36) NOT NULL,
    Title VARCHAR(300) NOT NULL,
    `Order` INT NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    
    INDEX IX_Modules_CourseId (CourseId),
    INDEX IX_Modules_CourseId_Order (CourseId, `Order`),
    
    CONSTRAINT FK_Modules_Courses FOREIGN KEY (CourseId)
        REFERENCES Courses(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Lessons
-- ============================================
CREATE TABLE Lessons (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    ModuleId CHAR(36) NOT NULL,
    Title VARCHAR(300) NOT NULL,
    `Order` INT NOT NULL,
    Type INT NOT NULL,
    VideoUrl VARCHAR(1000) NULL,
    VideoBlobPath VARCHAR(1000) NULL,
    DurationSeconds INT NULL,
    TextContent TEXT NULL,
    LinkUrl VARCHAR(1000) NULL,
    LinkDescription VARCHAR(500) NULL,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    
    INDEX IX_Lessons_ModuleId (ModuleId),
    INDEX IX_Lessons_ModuleId_Order (ModuleId, `Order`),
    INDEX IX_Lessons_Type (Type),
    
    CONSTRAINT FK_Lessons_Modules FOREIGN KEY (ModuleId)
        REFERENCES Modules(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Assignments
-- ============================================
CREATE TABLE Assignments (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    ModuleId CHAR(36) NOT NULL,
    Title VARCHAR(300) NOT NULL,
    Instructions TEXT NOT NULL,
    DueDate DATETIME(6) NOT NULL,
    RubricJson JSON NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    
    INDEX IX_Assignments_ModuleId (ModuleId),
    INDEX IX_Assignments_DueDate (DueDate),
    
    CONSTRAINT FK_Assignments_Modules FOREIGN KEY (ModuleId)
        REFERENCES Modules(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Submissions
-- ============================================
CREATE TABLE Submissions (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    AssignmentId CHAR(36) NOT NULL,
    StudentId CHAR(36) NOT NULL,
    AttemptNumber INT NOT NULL DEFAULT 1,
    Type INT NOT NULL,
    Status INT NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    UpdatedAt DATETIME(6) NULL,
    
    INDEX IX_Submissions_AssignmentId (AssignmentId),
    INDEX IX_Submissions_StudentId (StudentId),
    UNIQUE INDEX IX_Submissions_AssignmentId_StudentId_AttemptNumber (AssignmentId, StudentId, AttemptNumber),
    INDEX IX_Submissions_Status (Status),
    INDEX IX_Submissions_CreatedAt (CreatedAt),
    
    CONSTRAINT FK_Submissions_Assignments FOREIGN KEY (AssignmentId)
        REFERENCES Assignments(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Submissions_Users FOREIGN KEY (StudentId)
        REFERENCES Users(Id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: SubmissionArtifacts
-- ============================================
CREATE TABLE SubmissionArtifacts (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    SubmissionId CHAR(36) NOT NULL,
    BlobPath VARCHAR(1000) NOT NULL,
    FileName VARCHAR(500) NOT NULL,
    Size BIGINT NOT NULL,
    ContentType VARCHAR(200) NOT NULL,
    Checksum VARCHAR(128) NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    
    INDEX IX_SubmissionArtifacts_SubmissionId (SubmissionId),
    INDEX IX_SubmissionArtifacts_BlobPath (BlobPath),
    INDEX IX_SubmissionArtifacts_Checksum (Checksum),
    
    CONSTRAINT FK_SubmissionArtifacts_Submissions FOREIGN KEY (SubmissionId)
        REFERENCES Submissions(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: GitHubSubmissionInfos
-- ============================================
CREATE TABLE GitHubSubmissionInfos (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    SubmissionId CHAR(36) NOT NULL,
    RepoUrl VARCHAR(1000) NOT NULL,
    Branch VARCHAR(200) NOT NULL,
    CommitHash VARCHAR(100) NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    
    UNIQUE INDEX IX_GitHubSubmissionInfos_SubmissionId (SubmissionId),
    INDEX IX_GitHubSubmissionInfos_CommitHash (CommitHash),
    
    CONSTRAINT FK_GitHubSubmissionInfos_Submissions FOREIGN KEY (SubmissionId)
        REFERENCES Submissions(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: Grades
-- ============================================
CREATE TABLE Grades (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    SubmissionId CHAR(36) NOT NULL,
    InstructorId CHAR(36) NOT NULL,
    TotalScore DECIMAL(10,2) NOT NULL,
    RubricBreakdownJson JSON NOT NULL,
    OverallComment TEXT NOT NULL,
    GradedAt DATETIME(6) NOT NULL,
    
    UNIQUE INDEX IX_Grades_SubmissionId (SubmissionId),
    INDEX IX_Grades_InstructorId (InstructorId),
    INDEX IX_Grades_GradedAt (GradedAt),
    
    CONSTRAINT FK_Grades_Submissions FOREIGN KEY (SubmissionId)
        REFERENCES Submissions(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Grades_Users FOREIGN KEY (InstructorId)
        REFERENCES Users(Id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: FeedbackComments
-- ============================================
CREATE TABLE FeedbackComments (
    Id CHAR(36) NOT NULL PRIMARY KEY,
    SubmissionId CHAR(36) NOT NULL,
    AuthorId CHAR(36) NOT NULL,
    Message TEXT NOT NULL,
    CreatedAt DATETIME(6) NOT NULL,
    FilePath VARCHAR(1000) NULL,
    LineStart INT NULL,
    LineEnd INT NULL,
    
    INDEX IX_FeedbackComments_SubmissionId (SubmissionId),
    INDEX IX_FeedbackComments_AuthorId (AuthorId),
    INDEX IX_FeedbackComments_CreatedAt (CreatedAt),
    INDEX IX_FeedbackComments_SubmissionId_FilePath (SubmissionId, FilePath),
    
    CONSTRAINT FK_FeedbackComments_Submissions FOREIGN KEY (SubmissionId)
        REFERENCES Submissions(Id) ON DELETE CASCADE,
    CONSTRAINT FK_FeedbackComments_Users FOREIGN KEY (AuthorId)
        REFERENCES Users(Id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data
-- ============================================

-- Insert default users (passwords are BCrypt hashed)
INSERT INTO Users (Id, Name, Email, PasswordHash, Role, IsActive, CreatedAt) VALUES
(UUID(), 'Admin User', 'admin@codestack.com', '$2a$11$YourBCryptHashHere', 3, 1, UTC_TIMESTAMP()),
(UUID(), 'John Instructor', 'instructor@codestack.com', '$2a$11$YourBCryptHashHere', 2, 1, UTC_TIMESTAMP()),
(UUID(), 'Jane Student', 'student@codestack.com', '$2a$11$YourBCryptHashHere', 1, 1, UTC_TIMESTAMP());

-- Note: Replace '$2a$11$YourBCryptHashHere' with actual BCrypt hashes
-- Use the ApplicationDbContextSeed.cs for proper password hashing

-- ============================================
-- Enum Reference
-- ============================================

-- UserRole:
--   1 = Student
--   2 = Instructor
--   3 = Admin

-- LessonType:
--   1 = Video
--   2 = Text
--   3 = Link

-- SubmissionType:
--   1 = Upload
--   2 = GitHub

-- SubmissionStatus:
--   1 = Draft
--   2 = Submitted
--   3 = Grading
--   4 = Graded
--   5 = Returned
