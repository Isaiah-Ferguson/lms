using CodeStackLMS.Application.Assignments.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Assignments;

public class AssignmentService : IAssignmentService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public AssignmentService(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<AssignmentDto> GetAssignmentAsync(string assignmentId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(assignmentId, out var id))
            throw new ValidationException("Invalid assignment ID.");

        var assignment = await _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module)
            .ThenInclude(m => m.Course)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
            throw new NotFoundException("Assignment", assignmentId);

        return MapToDto(assignment);
    }

    public async Task<IReadOnlyList<AssignmentListDto>> GetAssignmentsByCourseAsync(string courseId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(courseId, out var courseGuid))
            throw new ValidationException("Invalid course ID.");

        var assignments = await _db.Assignments
            .AsNoTracking()
            .Where(a => a.Module.CourseId == courseGuid)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.AssignmentType,
                a.DueDate,
                a.CreatedAt,
                ModuleTitle = a.Module.Title,
                CourseTitle = a.Module.Course.Title,
                SubmissionCount = _db.Submissions.Count(s => s.AssignmentId == a.Id)
            })
            .OrderBy(a => a.ModuleTitle)
            .ThenBy(a => a.DueDate)
            .ToListAsync(cancellationToken);

        return assignments
            .Select(a => new AssignmentListDto(
                a.Id.ToString(),
                a.Title,
                a.AssignmentType,
                a.DueDate,
                a.ModuleTitle,
                a.CourseTitle,
                a.SubmissionCount,
                a.CreatedAt))
            .ToList();
    }

    public async Task<IReadOnlyList<AssignmentListDto>> GetAssignmentsByModuleAsync(string moduleId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(moduleId, out var moduleGuid))
            throw new ValidationException("Invalid module ID.");

        var assignments = await _db.Assignments
            .AsNoTracking()
            .Where(a => a.ModuleId == moduleGuid)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.AssignmentType,
                a.DueDate,
                a.CreatedAt,
                ModuleTitle = a.Module.Title,
                CourseTitle = a.Module.Course.Title,
                SubmissionCount = _db.Submissions.Count(s => s.AssignmentId == a.Id)
            })
            .OrderBy(a => a.DueDate)
            .ToListAsync(cancellationToken);

        return assignments
            .Select(a => new AssignmentListDto(
                a.Id.ToString(),
                a.Title,
                a.AssignmentType,
                a.DueDate,
                a.ModuleTitle,
                a.CourseTitle,
                a.SubmissionCount,
                a.CreatedAt))
            .ToList();
    }

    public async Task<AssignmentDto> CreateAssignmentAsync(CreateAssignmentDto dto, CancellationToken cancellationToken = default)
    {
        // Verify module exists
        var module = await _db.Modules
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == dto.ModuleId, cancellationToken);

        if (module == null)
            throw new NotFoundException("Module", dto.ModuleId);

        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            AssignmentType = string.IsNullOrWhiteSpace(dto.AssignmentType) ? "Challenge" : dto.AssignmentType,
            Instructions = dto.Instructions,
            DueDate = dto.DueDate,
            RubricJson = dto.RubricJson,
            ModuleId = dto.ModuleId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Assignments.Add(assignment);
        await _db.SaveChangesAsync(cancellationToken);

        // Reload with includes for the response
        var createdAssignment = await _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module)
            .ThenInclude(m => m.Course)
            .FirstAsync(a => a.Id == assignment.Id, cancellationToken);

        return MapToDto(createdAssignment);
    }

    public async Task<AssignmentDto> UpdateAssignmentAsync(string assignmentId, UpdateAssignmentDto dto, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(assignmentId, out var id))
            throw new ValidationException("Invalid assignment ID.");

        var assignment = await _db.Assignments
            .Include(a => a.Module)
            .ThenInclude(m => m.Course)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
            throw new NotFoundException("Assignment", assignmentId);

        assignment.Title = dto.Title;
        assignment.AssignmentType = string.IsNullOrWhiteSpace(dto.AssignmentType) ? assignment.AssignmentType : dto.AssignmentType;
        assignment.Instructions = dto.Instructions;
        assignment.DueDate = dto.DueDate;
        assignment.RubricJson = dto.RubricJson;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return MapToDto(assignment);
    }

    public async Task DeleteAssignmentAsync(string assignmentId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(assignmentId, out var id))
            throw new ValidationException("Invalid assignment ID.");

        var assignment = await _db.Assignments.FindAsync(new object[] { id }, cancellationToken);
        if (assignment == null)
            throw new NotFoundException("Assignment", assignmentId);

        _db.Assignments.Remove(assignment);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<StudentSubmissionStatusDto> GetMySubmissionAsync(string assignmentId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(assignmentId, out var id))
            throw new ValidationException("Invalid assignment ID.");

        var userId = _currentUser.UserId;

        var submission = await _db.Submissions
            .AsNoTracking()
            .Include(s => s.Artifacts)
            .Where(s => s.AssignmentId == id && s.StudentId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (submission == null)
        {
            return new StudentSubmissionStatusDto(
                HasSubmitted: false,
                SubmissionId: null,
                SubmittedAt: null,
                FileName: null,
                FileSize: null,
                Status: null
            );
        }

        var firstArtifact = submission.Artifacts.FirstOrDefault();

        return new StudentSubmissionStatusDto(
            HasSubmitted: true,
            SubmissionId: submission.Id.ToString(),
            SubmittedAt: submission.CreatedAt,
            FileName: firstArtifact?.FileName,
            FileSize: firstArtifact?.Size,
            Status: submission.Status.ToString()
        );
    }

    private static AssignmentDto MapToDto(Assignment assignment)
    {
        return new AssignmentDto(
            assignment.Id.ToString(),
            assignment.Title,
            assignment.AssignmentType,
            assignment.Instructions,
            assignment.DueDate,
            assignment.RubricJson,
            assignment.ModuleId.ToString(),
            assignment.Module.Title,
            assignment.Module.CourseId.ToString(),
            assignment.Module.Course.Title,
            assignment.CreatedAt,
            assignment.UpdatedAt
        );
    }
}
