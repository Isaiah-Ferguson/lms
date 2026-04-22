using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Lessons.DTOs;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Lessons;

public class LessonService : ILessonService
{
    // SAS expiry for direct blob video streaming.
    // Long enough to cover a full video watch session without re-requesting.
    private static readonly TimeSpan BlobSasExpiry = TimeSpan.FromMinutes(60);

    private readonly IApplicationDbContext _db;
    private readonly IBlobStorageService _blob;
    private readonly ICurrentUserService _currentUser;

    public LessonService(
        IApplicationDbContext db,
        IBlobStorageService blob,
        ICurrentUserService currentUser)
    {
        _db = db;
        _blob = blob;
        _currentUser = currentUser;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/lessons/{lessonId}/video-token
    //
    // Returns a short-lived stream URL for the lesson video.
    //
    // VideoSource dispatch:
    //   AzureBlob      → generate read-only SAS (60 min) for the blob path
    //   AzureFrontDoor → generate signed Front Door URL (near-term, not yet implemented)
    //   External       → return VideoUrl directly (YouTube/Vimeo embed URL)
    //   HlsManifest    → generate read-only SAS for the .m3u8 manifest blob path
    //   DashManifest   → generate read-only SAS for the .mpd manifest blob path
    //   None           → 400 Bad Request
    //
    // Authorization: any authenticated and enrolled user may request a token.
    // Enrollment check is intentionally lightweight here — the SAS itself is
    // the security boundary (short-lived, read-only, path-scoped).
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<VideoTokenDto> GetVideoTokenAsync(
        Guid lessonId,
        CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Module)
            .FirstOrDefaultAsync(l => l.Id == lessonId, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.Lesson), lessonId);

        // Verify caller is enrolled in this course,
        // or is an Instructor/Admin (who can access any lesson).
        var callerRole = _currentUser.Role;
        var isPrivileged =
            callerRole == nameof(UserRole.Instructor) ||
            callerRole == nameof(UserRole.Admin);

        if (!isPrivileged)
        {
            var courseId = lesson.Module.CourseId;
            var enrolled = await _db.UserCourseEnrollments
                .AnyAsync(e => e.UserId == _currentUser.UserId && e.CourseId == courseId, cancellationToken);
            if (!enrolled)
                throw new ForbiddenException("You are not enrolled in this course.");
        }

        return lesson.VideoSource switch
        {
            VideoSourceType.AzureBlob => await GenerateBlobTokenAsync(lesson, cancellationToken),

            VideoSourceType.HlsManifest => await GenerateBlobTokenAsync(lesson, cancellationToken),

            VideoSourceType.DashManifest => await GenerateBlobTokenAsync(lesson, cancellationToken),

            VideoSourceType.AzureFrontDoor =>
                // Near-term: replace with Azure Front Door signed URL generation.
                // For now fall back to blob SAS so the endpoint is functional.
                await GenerateBlobTokenAsync(lesson, cancellationToken),

            VideoSourceType.External => new VideoTokenDto(
                lesson.Id,
                lesson.VideoSource.ToString(),
                lesson.VideoUrl
                    ?? throw new ValidationException("Lesson has no external video URL configured."),
                lesson.VideoMimeType,
                lesson.DurationSeconds,
                DateTimeOffset.UtcNow.AddYears(1)), // external URLs don't expire

            VideoSourceType.None or _ =>
                throw new ValidationException(
                    $"Lesson '{lessonId}' has no video source configured.")
        };
    }

    private async Task<VideoTokenDto> GenerateBlobTokenAsync(
        Domain.Entities.Lesson lesson,
        CancellationToken cancellationToken)
    {
        var blobPath = lesson.VideoBlobPath
            ?? throw new ValidationException(
                $"Lesson '{lesson.Id}' is configured as {lesson.VideoSource} but has no blob path.");

        var expiresAt = DateTimeOffset.UtcNow.Add(BlobSasExpiry);

        var streamUrl = await _blob.GenerateReadSasAsync(
            blobPath, BlobSasExpiry, cancellationToken);

        return new VideoTokenDto(
            lesson.Id,
            lesson.VideoSource.ToString(),
            streamUrl,
            lesson.VideoMimeType,
            lesson.DurationSeconds,
            expiresAt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/lessons
    // Create a new lesson with video URL
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<LessonDto> CreateLessonAsync(
        CreateLessonDto dto,
        CancellationToken cancellationToken = default)
    {
        // Verify user is Admin or Instructor
        var callerRole = _currentUser.Role;
        if (callerRole != nameof(UserRole.Instructor) && callerRole != nameof(UserRole.Admin))
            throw new ForbiddenException("Only instructors and admins can create lessons.");

        // Verify module exists
        var moduleExists = await _db.Modules
            .AnyAsync(m => m.Id == dto.ModuleId, cancellationToken);
        if (!moduleExists)
            throw new NotFoundException(nameof(Domain.Entities.Module), dto.ModuleId);

        var lesson = new Domain.Entities.Lesson
        {
            Id = Guid.NewGuid(),
            ModuleId = dto.ModuleId,
            Title = dto.Title,
            Order = dto.Order,
            Type = LessonType.Video,
            VideoUrl = dto.VideoUrl,
            VideoSource = string.IsNullOrWhiteSpace(dto.VideoUrl) 
                ? VideoSourceType.None 
                : VideoSourceType.External,
            CreatedAt = DateTime.UtcNow
        };

        _db.Lessons.Add(lesson);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(lesson, Array.Empty<LessonArtifactDto>());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/lessons/{lessonId}
    // Update a lesson's title and/or video URL
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<LessonDto> UpdateLessonAsync(
        Guid lessonId,
        UpdateLessonDto dto,
        CancellationToken cancellationToken = default)
    {
        // Verify user is Admin or Instructor
        var callerRole = _currentUser.Role;
        if (callerRole != nameof(UserRole.Instructor) && callerRole != nameof(UserRole.Admin))
            throw new ForbiddenException("Only instructors and admins can update lessons.");

        var lesson = await _db.Lessons
            .FirstOrDefaultAsync(l => l.Id == lessonId, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.Lesson), lessonId);

        lesson.Title = dto.Title;
        lesson.VideoUrl = dto.VideoUrl;
        lesson.VideoSource = string.IsNullOrWhiteSpace(dto.VideoUrl)
            ? VideoSourceType.None
            : VideoSourceType.External;
        lesson.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(lesson, Array.Empty<LessonArtifactDto>());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/lessons/{lessonId}
    // Delete a lesson
    // ─────────────────────────────────────────────────────────────────────────
    public async Task DeleteLessonAsync(
        Guid lessonId,
        CancellationToken cancellationToken = default)
    {
        // Verify user is Admin or Instructor
        var callerRole = _currentUser.Role;
        if (callerRole != nameof(UserRole.Instructor) && callerRole != nameof(UserRole.Admin))
            throw new ForbiddenException("Only instructors and admins can delete lessons.");

        var lesson = await _db.Lessons
            .FirstOrDefaultAsync(l => l.Id == lessonId, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.Lesson), lessonId);

        _db.Lessons.Remove(lesson);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/lessons/{lessonId}/artifacts
    // Upload a code file artifact to a lesson
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<LessonArtifactDto> UploadArtifactAsync(
        Guid lessonId,
        string fileName,
        string contentType,
        Stream fileStream,
        CancellationToken cancellationToken = default)
    {
        // Verify user is Admin or Instructor
        var callerRole = _currentUser.Role;
        if (callerRole != nameof(UserRole.Instructor) && callerRole != nameof(UserRole.Admin))
            throw new ForbiddenException("Only instructors and admins can upload artifacts.");

        var lesson = await _db.Lessons
            .Include(l => l.Module)
            .FirstOrDefaultAsync(l => l.Id == lessonId, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.Lesson), lessonId);

        // Generate blob path: lessons/{moduleId}/{lessonId}/{fileName}
        var blobPath = $"lessons/{lesson.ModuleId}/{lessonId}/{fileName}";

        var sizeBytes = fileStream.Length;

        // Upload the file to blob storage before persisting metadata
        await _blob.UploadBlobAsync(blobPath, fileStream, contentType, cancellationToken);

        // Create artifact record
        var artifact = new Domain.Entities.LessonArtifact
        {
            Id = Guid.NewGuid(),
            LessonId = lessonId,
            BlobPath = blobPath,
            FileName = fileName,
            ContentType = contentType,
            SizeBytes = sizeBytes,
            CreatedAt = DateTime.UtcNow
        };

        _db.LessonArtifacts.Add(artifact);
        await _db.SaveChangesAsync(cancellationToken);

        // Generate download URL
        var downloadUrl = await _blob.GenerateReadSasAsync(
            blobPath,
            TimeSpan.FromMinutes(30),
            cancellationToken);

        return ToDto(artifact, downloadUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/lessons/artifacts/{artifactId}
    // Delete a lesson artifact
    // ─────────────────────────────────────────────────────────────────────────
    public async Task DeleteArtifactAsync(
        Guid artifactId,
        CancellationToken cancellationToken = default)
    {
        // Verify user is Admin or Instructor
        var callerRole = _currentUser.Role;
        if (callerRole != nameof(UserRole.Instructor) && callerRole != nameof(UserRole.Admin))
            throw new ForbiddenException("Only instructors and admins can delete artifacts.");

        var artifact = await _db.LessonArtifacts
            .FirstOrDefaultAsync(a => a.Id == artifactId, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.LessonArtifact), artifactId);

        // Delete from blob storage
        await _blob.DeleteBlobAsync(artifact.BlobPath, cancellationToken);

        // Delete from database
        _db.LessonArtifacts.Remove(artifact);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/lessons?moduleId={moduleId}
    // Get all lessons for a module
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<IReadOnlyList<LessonDto>> GetModuleLessonsAsync(
        Guid moduleId,
        CancellationToken cancellationToken = default)
    {
        var lessons = await _db.Lessons
            .AsNoTracking()
            .Include(l => l.Artifacts)
            .Where(l => l.ModuleId == moduleId)
            .OrderBy(l => l.Order)
            .ToListAsync(cancellationToken);

        var result = new List<LessonDto>();
        foreach (var lesson in lessons)
        {
            var artifactDtos = new List<LessonArtifactDto>();
            
            if (lesson.Artifacts != null && lesson.Artifacts.Any())
            {
                foreach (var artifact in lesson.Artifacts)
                {
                    try
                    {
                        var downloadUrl = await _blob.GenerateReadSasAsync(
                            artifact.BlobPath,
                            TimeSpan.FromHours(1),
                            cancellationToken);

                        artifactDtos.Add(ToDto(artifact, downloadUrl));
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue processing other artifacts
                        // This prevents one bad artifact from breaking the entire lesson list
                        System.Diagnostics.Debug.WriteLine($"Failed to generate SAS for artifact {artifact.Id}: {ex.Message}");
                    }
                }
            }

            result.Add(ToDto(lesson, artifactDtos));
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mappers
    // ─────────────────────────────────────────────────────────────────────────
    private static LessonDto ToDto(
        Domain.Entities.Lesson lesson,
        IReadOnlyList<LessonArtifactDto> artifacts)
        => new(
            lesson.Id,
            lesson.ModuleId,
            lesson.Title,
            lesson.Order,
            lesson.Type.ToString(),
            lesson.VideoUrl,
            lesson.CreatedAt,
            artifacts);

    private static LessonArtifactDto ToDto(
        Domain.Entities.LessonArtifact artifact,
        string downloadUrl)
        => new(
            artifact.Id,
            artifact.FileName,
            artifact.ContentType,
            artifact.SizeBytes,
            downloadUrl);
}
