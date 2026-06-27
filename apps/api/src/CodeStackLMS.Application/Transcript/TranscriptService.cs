using CodeStackLMS.Application.Common;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Transcript.DTOs;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
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

        // Every course the student is enrolled in should appear, even when it has no
        // graded work yet. Key by title so duplicate Course rows (same title) merge.
        var enrolledTitles = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Where(e => e.UserId == parsedUserId)
            .Join(
                _db.Courses.AsNoTracking(),
                e => e.CourseId,
                c => c.Id,
                (e, c) => c.Title)
            .Distinct()
            .ToListAsync(cancellationToken);

        var submissionsByCourseTitle = submissions
            .GroupBy(s => s.Assignment.Module.Course.Title)
            .ToDictionary(g => g.Key, g => g.ToList());

        var courseTitles = enrolledTitles
            .Union(submissionsByCourseTitle.Keys)
            .Distinct();

        var courses = courseTitles
            .Select(title =>
            {
                var courseSubmissions = submissionsByCourseTitle.TryGetValue(title, out var subs)
                    ? subs
                    : new List<Submission>();
                var graded = courseSubmissions.Where(s => s.Grade != null).ToList();
                var percent = graded.Count == 0
                    ? 0
                    : (int)Math.Round(graded.Average(s => (double)s.Grade!.TotalScore));
                var letter = GradeScale.ToLetter(percent);

                return new TranscriptCourseDto(
                    title,
                    graded.Count == 0 ? "—" : letter,
                    percent,
                    graded.Count == 0 ? 0 : GradeScale.GpaPoints(letter),
                    graded.Count,
                    courseSubmissions.Count);
            })
            .OrderBy(c => c.CourseName)
            .ToList();

        var gradedCourses = courses.Where(c => c.GradedCount > 0).ToList();
        var overallGpa = gradedCourses.Count == 0
            ? 0
            : Math.Round(gradedCourses.Average(c => c.GpaPoints), 2);

        var (cohortName, classSize, classRank) =
            await ComputeClassRankingAsync(parsedUserId, cancellationToken);

        return new TranscriptDto(
            user.Name,
            user.Id.ToString(),
            user.Email,
            courses,
            overallGpa,
            courses.Sum(c => c.GradedCount),
            courses.Sum(c => c.TotalCount),
            cohortName,
            classSize,
            classRank,
            DateTime.UtcNow);
    }

    /// <summary>
    /// Determines the student's cohort (the "combine"), the number of students
    /// currently enrolled in that cohort's courses (class size), and the student's
    /// rank among those peers by cumulative GPA. Returns nulls when the student is
    /// not associated with any cohort.
    /// </summary>
    private async Task<(string? CohortName, int? ClassSize, int? ClassRank)> ComputeClassRankingAsync(
        Guid studentId, CancellationToken cancellationToken)
    {
        var enrolledCourseIds = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Where(e => e.UserId == studentId)
            .Select(e => e.CourseId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (enrolledCourseIds.Count == 0)
            return (null, null, null);

        // Pick the most relevant cohort the student belongs to: active first, then newest.
        var cohort = await _db.CohortCourses
            .AsNoTracking()
            .Where(cc => enrolledCourseIds.Contains(cc.CourseId))
            .Select(cc => cc.Cohort)
            .Distinct()
            .OrderByDescending(c => c.IsActive)
            .ThenByDescending(c => c.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (cohort is null)
            return (null, null, null);

        var cohortCourseIds = await _db.CohortCourses
            .AsNoTracking()
            .Where(cc => cc.CohortId == cohort.Id)
            .Select(cc => cc.CourseId)
            .ToListAsync(cancellationToken);

        var peerIds = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Where(e => cohortCourseIds.Contains(e.CourseId) && e.User.Role == UserRole.Student)
            .Select(e => e.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (peerIds.Count == 0)
            return (cohort.Name, null, null);

        var peerSubmissions = await _db.Submissions
            .AsNoTracking()
            .Where(s => peerIds.Contains(s.StudentId)
                && cohortCourseIds.Contains(s.Assignment.Module.CourseId))
            .Include(s => s.Assignment).ThenInclude(a => a.Module)
            .Include(s => s.Grade)
            .ToListAsync(cancellationToken);

        var gpaByStudent = peerSubmissions
            .GroupBy(s => s.StudentId)
            .ToDictionary(g => g.Key, ComputeCumulativeGpa);

        var myGpa = gpaByStudent.TryGetValue(studentId, out var mine) ? mine : 0;

        // Standard competition ranking: rank = 1 + number of peers strictly ahead.
        var rank = 1 + gpaByStudent.Values.Count(v => v > myGpa + 1e-9);

        return (cohort.Name, peerIds.Count, rank);
    }

    private static double ComputeCumulativeGpa(IEnumerable<Submission> submissions)
    {
        var courseGpaPoints = submissions
            .GroupBy(s => s.Assignment.Module.CourseId)
            .Select(g =>
            {
                var graded = g.Where(s => s.Grade != null).ToList();
                if (graded.Count == 0) return (double?)null;
                var percent = (int)Math.Round(graded.Average(s => (double)s.Grade!.TotalScore));
                return GradeScale.GpaPoints(GradeScale.ToLetter(percent));
            })
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .ToList();

        return courseGpaPoints.Count == 0 ? 0 : courseGpaPoints.Average();
    }

}
