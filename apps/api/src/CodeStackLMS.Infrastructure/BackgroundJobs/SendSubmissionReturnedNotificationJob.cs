using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeStackLMS.Infrastructure.BackgroundJobs;

public class SendSubmissionReturnedNotificationJob
{
    private readonly IApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<SendSubmissionReturnedNotificationJob> _logger;

    public SendSubmissionReturnedNotificationJob(
        IApplicationDbContext db,
        IEmailService emailService,
        ILogger<SendSubmissionReturnedNotificationJob> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid submissionId, string reason)
    {
        var submission = await _db.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission == null)
        {
            _logger.LogWarning("Submission {SubmissionId} not found", submissionId);
            return;
        }

        var subject = $"Your submission for \"{submission.Assignment.Title}\" has been returned";
        var body = $@"
<h2>Submission Returned</h2>
<p>Hi {submission.Student.Name},</p>
<p>Your submission for <strong>{submission.Assignment.Title}</strong> has been returned by your instructor.</p>
<p><strong>Reason:</strong></p>
<p>{reason}</p>
<p>Please review the feedback and resubmit your assignment.</p>
<p>You can view the assignment details and resubmit in the LMS.</p>
";

        await _emailService.SendAsync(submission.Student.Email, subject, body);
        _logger.LogInformation("Submission returned notification sent for submission {SubmissionId}", submissionId);
    }
}
