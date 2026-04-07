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
            
            // Get frontend URL - use last URL in comma-separated list (production) or fallback to localhost
            var urls = (_config["Frontend:Url"] ?? "http://localhost:3000").Split(',');
            var frontendUrl = urls[urls.Length - 1].Trim();
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
                frontendUrl,
                assignment.Module.CourseId,
                assignment.Id);

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
        string frontendUrl,
        Guid courseId,
        Guid assignmentId)
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
        var safeComment = string.IsNullOrWhiteSpace(comment) 
            ? string.Empty 
            : System.Net.WebUtility.HtmlEncode(comment);
        var hasFeedback = !string.IsNullOrWhiteSpace(comment);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
        .header {{ background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: white; padding: 32px 24px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
        .content {{ padding: 32px 24px; background-color: #ffffff; }}
        .grade-box {{ background: linear-gradient(to right, #EEF2FF 0%, #F5F3FF 100%); border-left: 5px solid #4F46E5; padding: 24px; margin: 24px 0; border-radius: 8px; }}
        .grade-box h3 {{ margin: 0 0 12px 0; color: #1f2937; font-size: 18px; }}
        .grade-box p {{ margin: 8px 0; color: #4b5563; }}
        .score {{ font-size: 32px; font-weight: bold; color: #4F46E5; margin: 16px 0; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; margin-top: 24px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3); }}
        .button:hover {{ background: linear-gradient(135deg, #4338CA 0%, #4F46E5 100%); }}
        .feedback {{ background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
        .feedback h4 {{ margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }}
        .feedback p {{ margin: 0; color: #1f2937; line-height: 1.8; }}
        .footer {{ text-align: center; padding: 24px; background-color: #f9fafb; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }}
        .footer p {{ margin: 8px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Assignment Graded</h1>
        </div>
        <div class='content'>
            <p style='font-size: 16px; color: #1f2937; margin-bottom: 8px;'>Hi {safeName},</p>
            <p style='font-size: 15px; color: #4b5563; margin-bottom: 24px;'>Great news! Your assignment has been graded.</p>
            
            <div class='grade-box'>
                <h3>{safeTitle}</h3>
                <p style='margin: 4px 0;'><strong>Course:</strong> {safeCourse}</p>
                <div class='score'>{score}% ({letterGrade})</div>
            </div>
            
            {(hasFeedback ? $@"
            <div class='feedback'>
                <h4>Instructor Feedback</h4>
                <p>{safeComment}</p>
            </div>
            " : "")}
            <center>
                <a href='{frontendUrl}/login?returnUrl=/courses/{courseId}/assignments/{assignmentId}' class='button' style='color: #ffffff;'>View Assignment & Grade</a>
            </center>
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
