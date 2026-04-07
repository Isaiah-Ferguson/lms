using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeStackLMS.Application.BackgroundJobs;

public class SendGradeNotificationJob
{
    private readonly IApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<SendGradeNotificationJob> _logger;

    public SendGradeNotificationJob(
        IApplicationDbContext db,
        IEmailService emailService,
        IConfiguration config,
        ILogger<SendGradeNotificationJob> logger)
    {
        _db = db;
        _emailService = emailService;
        _config = config;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid submissionId)
    {
        try
        {
            var submission = await _db.Submissions
                .AsNoTracking()
                .Include(s => s.Student)
                .Include(s => s.Grade)
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Module)
                        .ThenInclude(m => m.Course)
                .FirstOrDefaultAsync(s => s.Id == submissionId);

            if (submission == null)
            {
                _logger.LogWarning("Submission {SubmissionId} not found for grade notification", submissionId);
                return;
            }

            if (submission.Grade == null)
            {
                _logger.LogWarning("Submission {SubmissionId} has no grade", submissionId);
                return;
            }

            var student = submission.Student;
            if (!student.EmailNotificationsEnabled)
            {
                _logger.LogInformation("Student {StudentId} has email notifications disabled", student.Id);
                return;
            }

            var assignment = submission.Assignment;
            var subject = $"Your assignment has been graded: {assignment.Title}";
            var frontendUrl = _config["Frontend:Url"] ?? "http://localhost:3000";
            var maxScore = 100m;
            var percentScore = maxScore > 0
                ? Math.Round(submission.Grade.TotalScore / maxScore * 100, 1)
                : submission.Grade.TotalScore;

            var htmlBody = BuildGradeNotificationEmailBody(
                student.Name,
                assignment.Title,
                assignment.Module.Course.Title,
                percentScore,
                submission.Grade.OverallComment,
                frontendUrl);

            await _emailService.SendAsync(student.Email, subject, htmlBody, CancellationToken.None);
            
            _logger.LogInformation("Grade notification sent for submission {SubmissionId} to {Email}", 
                submissionId, student.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send grade notification for submission {SubmissionId}", submissionId);
            throw; // Hangfire will retry
        }
    }

    private static string BuildGradeNotificationEmailBody(
        string studentName,
        string assignmentTitle,
        string courseTitle,
        decimal score,
        string comment,
        string frontendUrl)
    {
        var letterGrade = score switch
        {
            >= 90 => "A",
            >= 80 => "B",
            >= 70 => "C",
            >= 60 => "D",
            _ => "F"
        };

        var safeName = System.Net.WebUtility.HtmlEncode(studentName);
        var safeTitle = System.Net.WebUtility.HtmlEncode(assignmentTitle);
        var safeCourse = System.Net.WebUtility.HtmlEncode(courseTitle);
        var safeComment = System.Net.WebUtility.HtmlEncode(comment);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
        .content {{ background-color: #f9fafb; padding: 20px; }}
        .grade-box {{ background-color: white; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; }}
        .button {{ display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Assignment Graded</h1>
        </div>
        <div class='content'>
            <p>Hi {safeName},</p>
            <p>Your assignment has been graded!</p>
            
            <div class='grade-box'>
                <h3>{safeTitle}</h3>
                <p><strong>Course:</strong> {safeCourse}</p>
                <p><strong>Score:</strong> {score}% ({letterGrade})</p>
            </div>
            
            <h4>Instructor Feedback:</h4>
            <p>{safeComment}</p>
            
            <a href='{frontendUrl}/grades' class='button'>View Your Grades</a>
        </div>
        <div class='footer'>
            <p>CodeStack LMS - Learning Management System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";
    }
}
