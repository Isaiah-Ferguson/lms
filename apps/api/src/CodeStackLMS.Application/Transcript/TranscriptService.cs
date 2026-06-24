using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Transcript.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Transcript;

public class TranscriptService : ITranscriptService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public TranscriptService(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TranscriptDto?> GetTranscriptAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
            throw new ValidationException("Invalid user identifier.");

        var isSelf = _currentUser.UserId == parsedUserId;
        var isStaff = _currentUser.Role is "Admin" or "Instructor";
        if (!isSelf && !isStaff)
            throw new ForbiddenException();

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == parsedUserId, cancellationToken);

        if (user is null)
            return null;

        var submissions = await _db.Submissions
            .AsNoTracking()
            .Where(s => s.StudentId == parsedUserId)
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Module)
                .ThenInclude(m => m.Course)
            .Include(s => s.Grade)
            .ToListAsync(cancellationToken);

        var courses = submissions
            .GroupBy(s => new { s.Assignment.Module.Course.Id, s.Assignment.Module.Course.Title })
            .Select(g =>
            {
                var courseSubmissions = g.ToList();
                var graded = courseSubmissions.Where(s => s.Grade != null).ToList();
                var percent = graded.Count == 0
                    ? 0
                    : (int)Math.Round(graded.Average(s => (double)s.Grade!.TotalScore));
                var letter = CalculateLetterGrade(percent);

                return new TranscriptCourseDto(
                    g.Key.Title,
                    graded.Count == 0 ? "—" : letter,
                    percent,
                    graded.Count == 0 ? 0 : GpaPoints(letter),
                    graded.Count,
                    courseSubmissions.Count);
            })
            .OrderBy(c => c.CourseName)
            .ToList();

        var gradedCourses = courses.Where(c => c.GradedCount > 0).ToList();
        var overallGpa = gradedCourses.Count == 0
            ? 0
            : Math.Round(gradedCourses.Average(c => c.GpaPoints), 2);

        return new TranscriptDto(
            user.Name,
            user.Id.ToString(),
            user.Email,
            courses,
            overallGpa,
            courses.Sum(c => c.GradedCount),
            courses.Sum(c => c.TotalCount),
            DateTime.UtcNow);
    }

    private static string CalculateLetterGrade(int percent)
    {
        if (percent >= 93) return "A";
        if (percent >= 90) return "A-";
        if (percent >= 87) return "B+";
        if (percent >= 83) return "B";
        if (percent >= 80) return "B-";
        if (percent >= 77) return "C+";
        if (percent >= 73) return "C";
        if (percent >= 70) return "C-";
        if (percent >= 67) return "D+";
        if (percent >= 63) return "D";
        if (percent >= 60) return "D-";
        return "F";
    }

    private static double GpaPoints(string letter) => letter switch
    {
        "A" => 4.0,
        "A-" => 3.7,
        "B+" => 3.3,
        "B" => 3.0,
        "B-" => 2.7,
        "C+" => 2.3,
        "C" => 2.0,
        "C-" => 1.7,
        "D+" => 1.3,
        "D" => 1.0,
        "D-" => 0.7,
        _ => 0.0,
    };
}
