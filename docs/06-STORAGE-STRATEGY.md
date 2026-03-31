# CodeStack LMS - Storage Strategy with SAS Tokens

## Overview

CodeStack LMS uses **Azure Blob Storage** for all large file storage with **short-lived SAS (Shared Access Signature) tokens** for secure, direct client access. This approach:
- Offloads file transfer from API servers
- Provides secure, time-limited access
- Scales horizontally without API bottlenecks
- Reduces bandwidth costs on API infrastructure

---

## Storage Architecture

### Container Structure

```
codestack-lms-storage (Storage Account)
├── courses/
│   └── {courseId}/
│       └── lessons/
│           └── {lessonId}/
│               ├── video.mp4
│               ├── thumbnail.jpg
│               └── artifacts/
│                   ├── {artifactId}/
│                   │   ├── document.pdf
│                   │   └── resource.zip
├── submissions/
│   └── {assignmentId}/
│       └── {submissionId}/
│           ├── artifacts/
│           │   ├── {artifactId}/
│           │   │   ├── solution.zip
│           │   │   ├── report.pdf
│           │   │   └── code.py
│           └── metadata.json
├── avatars/
│   └── {userId}/
│       └── avatar.{ext}
└── temp/
    └── {userId}/
        └── {uploadId}/
            └── pending-files...
```

### Path Conventions

| Resource Type | Path Pattern | Example |
|--------------|--------------|---------|
| Lesson Video | `courses/{courseId}/lessons/{lessonId}/video.{ext}` | `courses/a1b2.../lessons/c3d4.../video.mp4` |
| Lesson Artifact | `courses/{courseId}/lessons/{lessonId}/artifacts/{artifactId}/{fileName}` | `courses/a1b2.../lessons/c3d4.../artifacts/e5f6.../document.pdf` |
| Submission Artifact | `submissions/{assignmentId}/{submissionId}/artifacts/{artifactId}/{fileName}` | `submissions/g7h8.../i9j0.../artifacts/k1l2.../solution.zip` |
| User Avatar | `avatars/{userId}/avatar.{ext}` | `avatars/m3n4.../avatar.jpg` |
| Temp Upload | `temp/{userId}/{uploadId}/{fileName}` | `temp/o5p6.../q7r8.../draft.zip` |

---

## SAS Token Strategy

### Token Types & Expiry

| Use Case | Permissions | Expiry | Scope |
|----------|-------------|--------|-------|
| **Upload Submission Artifact** | Write, Create | 1 hour | Specific path: `submissions/{assignmentId}/{submissionId}/artifacts/{artifactId}/*` |
| **Download Submission Artifact** | Read | 1 hour | Specific file: `submissions/{assignmentId}/{submissionId}/artifacts/{artifactId}/{fileName}` |
| **Upload Lesson Artifact** | Write, Create | 2 hours | Specific path: `courses/{courseId}/lessons/{lessonId}/artifacts/{artifactId}/*` |
| **Download Lesson Artifact** | Read | 24 hours | Specific file: `courses/{courseId}/lessons/{lessonId}/artifacts/{artifactId}/{fileName}` |
| **Stream Video** | Read | 1 hour | Specific file: `courses/{courseId}/lessons/{lessonId}/video.{ext}` |
| **Upload Video (Instructor)** | Write, Create | 2 hours | Specific path: `courses/{courseId}/lessons/{lessonId}/*` |
| **Upload Avatar** | Write, Create | 1 hour | Specific path: `avatars/{userId}/*` |
| **Download Avatar** | Read | 24 hours | Specific file: `avatars/{userId}/avatar.{ext}` |

### SAS Token Parameters

```csharp
public class SasTokenOptions
{
    public string BlobPath { get; set; }           // e.g., "submissions/guid/guid/file.zip"
    public BlobSasPermissions Permissions { get; set; }  // Read, Write, Create, Delete
    public TimeSpan ExpiresIn { get; set; }        // Default: 1 hour
    public string ContentType { get; set; }        // e.g., "application/zip"
    public long? MaxFileSizeBytes { get; set; }    // Optional size limit
}
```

---

## Upload Flow (Submissions)

### Step-by-Step Process

```
┌─────────┐                  ┌─────────┐                  ┌─────────┐
│ Client  │                  │   API   │                  │  Blob   │
└────┬────┘                  └────┬────┘                  └────┬────┘
     │                            │                            │
     │ 1. POST /submissions       │                            │
     ├───────────────────────────▶│                            │
     │   { assignmentId, type }   │                            │
     │                            │                            │
     │                            │ 2. Create DB record        │
     │                            │    (status: Draft)         │
     │                            │                            │
     │                            │ 3. Generate SAS token      │
     │                            │    (write, 1hr expiry)     │
     │                            │                            │
     │ 4. Return submission +     │                            │
     │    uploadUrls[]            │                            │
     │◀───────────────────────────┤                            │
     │                            │                            │
     │ 5. Upload files directly   │                            │
     ├────────────────────────────┼───────────────────────────▶│
     │    PUT {sasUrl}            │                            │
     │    Body: file bytes        │                            │
     │                            │                            │
     │ 6. Upload complete         │                            │
     │◀───────────────────────────┼────────────────────────────┤
     │                            │                            │
     │ 7. POST /submissions/{id}/submit                        │
     ├───────────────────────────▶│                            │
     │   { fileBlobPaths[] }      │                            │
     │                            │                            │
     │                            │ 8. Verify files exist      │
     │                            ├───────────────────────────▶│
     │                            │                            │
     │                            │ 9. Update status: Submitted│
     │                            │                            │
     │ 10. Success                │                            │
     │◀───────────────────────────┤                            │
```

### API Implementation

```csharp
// Step 1-4: Create submission and return upload URLs
[HttpPost]
[Authorize(Roles = "Student")]
public async Task<IActionResult> CreateSubmission(CreateSubmissionDto dto)
{
    // Validate student is enrolled
    var enrollment = await _dbContext.Enrollments
        .FirstOrDefaultAsync(e => e.UserId == CurrentUserId && 
                                  e.CourseId == assignment.CourseId);
    if (enrollment == null) return Forbid();
    
    // Create submission record
    var submission = new Submission
    {
        Id = Guid.NewGuid(),
        AssignmentId = dto.AssignmentId,
        StudentId = CurrentUserId,
        Type = dto.Type,
        Status = SubmissionStatus.Draft,
        SubmittedAt = DateTime.UtcNow
    };
    
    await _dbContext.Submissions.AddAsync(submission);
    await _dbContext.SaveChangesAsync();
    
    // Generate upload URLs if file upload type
    List<UploadUrlDto> uploadUrls = null;
    if (dto.Type.HasFlag(SubmissionType.FileUpload))
    {
        uploadUrls = new List<UploadUrlDto>();
        foreach (var file in dto.Files)
        {
            var blobPath = $"submissions/{dto.AssignmentId}/{submission.Id}/{file.FileName}";
            var sasUrl = await _storageService.GenerateUploadSasUrlAsync(new SasTokenOptions
            {
                BlobPath = blobPath,
                Permissions = BlobSasPermissions.Write | BlobSasPermissions.Create,
                ExpiresIn = TimeSpan.FromHours(1),
                ContentType = file.ContentType,
                MaxFileSizeBytes = 50 * 1024 * 1024  // 50MB limit
            });
            
            uploadUrls.Add(new UploadUrlDto
            {
                FileName = file.FileName,
                SasUrl = sasUrl,
                BlobPath = blobPath,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            });
        }
    }
    
    return Ok(new { submission, uploadUrls });
}

// Step 7-10: Finalize submission
[HttpPost("{id}/submit")]
[Authorize(Roles = "Student")]
public async Task<IActionResult> SubmitAssignment(Guid id, SubmitDto dto)
{
    var submission = await _dbContext.Submissions.FindAsync(id);
    if (submission == null) return NotFound();
    if (submission.StudentId != CurrentUserId) return Forbid();
    if (submission.Status != SubmissionStatus.Draft) 
        return BadRequest("Submission already submitted");
    
    // Verify files exist in blob storage
    if (dto.FileBlobPaths?.Any() == true)
    {
        foreach (var path in dto.FileBlobPaths)
        {
            var exists = await _storageService.BlobExistsAsync(path);
            if (!exists)
                return BadRequest($"File not found: {path}");
        }
        submission.FileBlobPaths = dto.FileBlobPaths;
    }
    
    // Update status
    submission.Status = SubmissionStatus.Submitted;
    submission.SubmittedAt = DateTime.UtcNow;
    
    await _dbContext.SaveChangesAsync();
    
    // Trigger background job for instructor notification
    _backgroundJobService.Enqueue<SendSubmissionNotificationJob>(
        job => job.ExecuteAsync(submission.Id));
    
    return Ok(submission);
}
```

---

## Download Flow (Submissions & Videos)

### Submission Download

```csharp
[HttpGet("{id}/download-url")]
[Authorize]
public async Task<IActionResult> GetSubmissionDownloadUrl(Guid id)
{
    var submission = await _dbContext.Submissions
        .Include(s => s.Assignment)
        .ThenInclude(a => a.Course)
        .FirstOrDefaultAsync(s => s.Id == id);
    
    if (submission == null) return NotFound();
    
    // Authorization: Student (owner) or Instructor (course owner) or Admin
    var isOwner = submission.StudentId == CurrentUserId;
    var isInstructor = submission.Assignment.Course.InstructorId == CurrentUserId;
    var isAdmin = User.IsInRole("Admin");
    
    if (!isOwner && !isInstructor && !isAdmin)
        return Forbid();
    
    // Generate SAS URLs for all files
    var fileUrls = new List<FileDownloadDto>();
    foreach (var blobPath in submission.FileBlobPaths)
    {
        var sasUrl = await _storageService.GenerateDownloadSasUrlAsync(new SasTokenOptions
        {
            BlobPath = blobPath,
            Permissions = BlobSasPermissions.Read,
            ExpiresIn = TimeSpan.FromHours(1)
        });
        
        fileUrls.Add(new FileDownloadDto
        {
            FileName = Path.GetFileName(blobPath),
            SasUrl = sasUrl,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
    }
    
    return Ok(new { files = fileUrls });
}
```

### Video Streaming

```csharp
[HttpGet("{id}")]
[Authorize]
public async Task<IActionResult> GetLesson(Guid id)
{
    var lesson = await _dbContext.Lessons
        .Include(l => l.Course)
        .FirstOrDefaultAsync(l => l.Id == id);
    
    if (lesson == null) return NotFound();
    
    // Check enrollment/ownership
    var hasAccess = await CheckLessonAccessAsync(lesson, CurrentUserId);
    if (!hasAccess) return Forbid();
    
    // Generate video SAS URL
    var videoSasUrl = await _storageService.GenerateDownloadSasUrlAsync(new SasTokenOptions
    {
        BlobPath = lesson.VideoBlobPath,
        Permissions = BlobSasPermissions.Read,
        ExpiresIn = TimeSpan.FromHours(1)
    });
    
    var lessonDto = new LessonDetailDto
    {
        Id = lesson.Id,
        Title = lesson.Title,
        Description = lesson.Description,
        VideoUrl = videoSasUrl,  // SAS URL with 1-hour expiry
        VideoExpiresAt = DateTime.UtcNow.AddHours(1),
        DurationSeconds = lesson.DurationSeconds
    };
    
    return Ok(lessonDto);
}
```

---

## Storage Service Implementation

```csharp
public interface IStorageService
{
    Task<string> GenerateUploadSasUrlAsync(SasTokenOptions options);
    Task<string> GenerateDownloadSasUrlAsync(SasTokenOptions options);
    Task<bool> BlobExistsAsync(string blobPath);
    Task DeleteBlobAsync(string blobPath);
    Task<BlobProperties> GetBlobPropertiesAsync(string blobPath);
}

public class AzureBlobStorageService : IStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly string _containerName;
    
    public AzureBlobStorageService(IConfiguration configuration)
    {
        var connectionString = configuration["AzureStorage:ConnectionString"];
        _blobServiceClient = new BlobServiceClient(connectionString);
        _containerName = configuration["AzureStorage:ContainerName"];
    }
    
    public async Task<string> GenerateUploadSasUrlAsync(SasTokenOptions options)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(options.BlobPath);
        
        // Create SAS token
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _containerName,
            BlobName = options.BlobPath,
            Resource = "b",  // Blob
            ExpiresOn = DateTimeOffset.UtcNow.Add(options.ExpiresIn)
        };
        
        sasBuilder.SetPermissions(options.Permissions);
        
        // Optional: Set content type and size constraints
        if (!string.IsNullOrEmpty(options.ContentType))
        {
            sasBuilder.ContentType = options.ContentType;
        }
        
        var sasToken = blobClient.GenerateSasUri(sasBuilder);
        return sasToken.ToString();
    }
    
    public async Task<string> GenerateDownloadSasUrlAsync(SasTokenOptions options)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(options.BlobPath);
        
        // Verify blob exists
        if (!await blobClient.ExistsAsync())
            throw new NotFoundException($"Blob not found: {options.BlobPath}");
        
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _containerName,
            BlobName = options.BlobPath,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(options.ExpiresIn)
        };
        
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        
        var sasToken = blobClient.GenerateSasUri(sasBuilder);
        return sasToken.ToString();
    }
    
    public async Task<bool> BlobExistsAsync(string blobPath)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);
        return await blobClient.ExistsAsync();
    }
    
    public async Task DeleteBlobAsync(string blobPath)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);
        await blobClient.DeleteIfExistsAsync();
    }
    
    public async Task<BlobProperties> GetBlobPropertiesAsync(string blobPath)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);
        var properties = await blobClient.GetPropertiesAsync();
        return properties.Value;
    }
}
```

---

## Security Considerations

### 1. Path Scoping
- SAS tokens are scoped to specific paths (not container-wide)
- Students can only upload to their own submission folders
- Instructors can only upload to their own course folders

### 2. Time Limits
- Short expiry (1-2 hours) prevents token reuse
- Tokens cannot be extended; must request new ones

### 3. Validation
- API validates file existence before marking submission as complete
- File size limits enforced (50MB per file, 200MB total per submission)
- File type validation (whitelist: .zip, .pdf, .py, .java, .cpp, .js, .ts, .md, .txt)

### 4. Cleanup
- Background job deletes expired temp uploads (>24 hours old)
- Soft-delete submissions retain files for 30 days before permanent deletion

---

## File Size Limits

| Resource | Max Size | Notes |
|----------|----------|-------|
| Single File | 50 MB | Per file in submission |
| Total Submission | 200 MB | All files combined |
| Lesson Video | 2 GB | Instructor upload |

---

## Cost Optimization

### Storage Tiers
- **Hot**: Active course videos, recent submissions (< 30 days)
- **Cool**: Archived submissions (30-90 days)
- **Archive**: Old course materials (> 90 days)

### Lifecycle Policy
```json
{
  "rules": [
    {
      "name": "MoveSubmissionsToCool",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["submissions/"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 30
            },
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          }
        }
      }
    }
  ]
}
```

---

## Future Enhancements

### 1. Video Streaming (Post-MVP)
**Current**: Direct blob URLs with SAS tokens  
**Future**: Azure Media Services
- Adaptive bitrate streaming (HLS/DASH)
- Multiple quality levels (360p, 720p, 1080p)
- CDN integration for global delivery
- DRM protection for premium content

**Migration Path**:
1. Keep blob storage for source videos
2. Add Media Services encoding job on upload
3. Store streaming URLs in `Lesson.StreamingUrl`
4. Fallback to blob URL if streaming not available

### 2. Malware Scanning
- Azure Defender for Storage
- Scan uploads before marking submission complete
- Quarantine suspicious files

### 3. Content Delivery Network (CDN)
- Azure CDN in front of blob storage
- Cache lesson videos globally
- Reduce latency for international students

### 4. Chunked Uploads
- For large files (>100MB)
- Resume interrupted uploads
- Progress tracking

### 5. Client-Side Encryption
- Encrypt files before upload
- Store encryption keys securely
- Decrypt on download
