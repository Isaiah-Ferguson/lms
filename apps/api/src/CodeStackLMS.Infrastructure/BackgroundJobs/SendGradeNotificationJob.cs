using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeStackLMS.Infrastructure.BackgroundJobs;

public class SendGradeNotificationJob
{
    private readonly IApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<SendGradeNotificationJob> _logger;

    public SendGradeNotificationJob(
        IApplicationDbContext db,
        IEmailService emailService,
        ILogger<SendGradeNotificationJob> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid submissionId)
    {
        var submission = await _db.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .Include(s => s.Grade)
                .ThenInclude(g => g!.Instructor)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission == null || submission.Grade == null)
        {
            _logger.LogWarning("Submission {SubmissionId} or grade not found", submissionId);
            return;
        }

        var subject = $"Your submission for \"{submission.Assignment.Title}\" has been graded";
        var body = $@"
<h2>Submission Graded</h2>
<p>Hi {submission.Student.Name},</p>
<p>Your submission for <strong>{submission.Assignment.Title}</strong> has been graded.</p>
<p><strong>Score:</strong> {submission.Grade.TotalScore}/100</p>
{(string.IsNullOrWhiteSpace(submission.Grade.OverallComment) ? "" : $"<p><strong>Feedback:</strong><br/>{submission.Grade.OverallComment}</p>")}
<p><strong>Graded by:</strong> {submission.Grade.Instructor?.Name ?? "Instructor"}</p>
<p>View your full grade details in the LMS.</p>
";

        await _emailService.SendAsync(submission.Student.Email, subject, body);
        _logger.LogInformation("Grade notification sent for submission {SubmissionId}", submissionId);
    }
}
