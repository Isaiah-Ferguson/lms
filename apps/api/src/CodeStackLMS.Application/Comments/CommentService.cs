using CodeStackLMS.Application.Comments.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Comments;

public class CommentService : ICommentService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CommentService(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<CommentDto>> GetCommentsForAssignmentAsync(string assignmentId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(assignmentId, out var id))
            throw new ValidationException("Invalid assignment ID.");

        var userId = _currentUser.UserId;

        // Get the student's submission for this assignment
        var submission = await _db.Submissions
            .AsNoTracking()
            .Where(s => s.AssignmentId == id && s.StudentId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (submission == null)
        {
            // No submission yet, return empty comments
            return Array.Empty<CommentDto>();
        }

        // Get all comments for this submission
        var comments = await _db.FeedbackComments
            .AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.SubmissionId == submission.Id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(
                c.Id.ToString(),
                c.SubmissionId.ToString(),
                c.AuthorId.ToString(),
                c.Author.Name,
                c.Message,
                c.CreatedAt,
                c.FilePath,
                c.LineStart,
                c.LineEnd
            ))
            .ToListAsync(cancellationToken);

        return comments;
    }

    public async Task<CommentDto> AddCommentAsync(string assignmentId, CreateCommentDto dto, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(assignmentId, out var id))
            throw new ValidationException("Invalid assignment ID.");

        var userId = _currentUser.UserId;

        // Verify assignment exists
        var assignmentExists = await _db.Assignments.AnyAsync(a => a.Id == id, cancellationToken);
        if (!assignmentExists)
        {
            throw new NotFoundException("Assignment", assignmentId);
        }

        // Get or create the student's submission for this assignment
        var submission = await _db.Submissions
            .Where(s => s.AssignmentId == id && s.StudentId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (submission == null)
        {
            // Auto-create a placeholder submission so comments can be posted
            submission = new Submission
            {
                Id = Guid.NewGuid(),
                AssignmentId = id,
                StudentId = userId,
                Status = CodeStackLMS.Domain.Enums.SubmissionStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Submissions.Add(submission);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var user = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found.");
        }

        var comment = new FeedbackComment
        {
            Id = Guid.NewGuid(),
            SubmissionId = submission.Id,
            AuthorId = userId,
            Message = dto.Message,
            CreatedAt = DateTime.UtcNow,
            FilePath = null,
            LineStart = null,
            LineEnd = null
        };

        _db.FeedbackComments.Add(comment);
        await _db.SaveChangesAsync(cancellationToken);

        return new CommentDto(
            comment.Id.ToString(),
            comment.SubmissionId.ToString(),
            comment.AuthorId.ToString(),
            user.Name,
            comment.Message,
            comment.CreatedAt,
            comment.FilePath,
            comment.LineStart,
            comment.LineEnd
        );
    }
}
