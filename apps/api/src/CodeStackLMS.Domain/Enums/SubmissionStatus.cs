namespace CodeStackLMS.Domain.Enums;

public enum SubmissionStatus
{
    Draft = 1,
    PendingUpload = 2,
    Uploaded = 3,
    Processing = 4,
    ReadyToGrade = 5,
    Grading = 6,
    Graded = 7,
    Returned = 8
}
