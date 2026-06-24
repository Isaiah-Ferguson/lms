using CodeStackLMS.Application.Transcript.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CodeStackLMS.API.Services;

public sealed class TranscriptPdfGenerator
{
    // ── Static school header (configured per institution) ──────────────────────
    private const string SchoolName = "CodeStack Academy";
    private const string SchoolAddress = "2911 Transworld Dr, Stockton, CA 95206";
    private const string SchoolPhone = "209-468-5924";

    private static readonly string AccentColor = Colors.Blue.Darken2;
    private static readonly string BorderColor = Colors.Grey.Darken1;
    private static readonly string MutedColor = Colors.Grey.Darken1;

    static TranscriptPdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Generate(TranscriptDto transcript)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Black));

                page.Header().Element(c => ComposeHeader(c, transcript));
                page.Content().Element(c => ComposeContent(c, transcript));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    // ── Header: school identity + student identity ──────────────────────────────
    private void ComposeHeader(IContainer container, TranscriptDto t)
    {
        container.Column(col =>
        {
            col.Item().Border(1).BorderColor(BorderColor).Padding(12).Row(row =>
            {
                // Student identity
                row.RelativeItem().Column(student =>
                {
                    student.Item().Text("OFFICIAL TRANSCRIPT")
                        .FontSize(11).Bold().FontColor(AccentColor).LetterSpacing(0.05f);
                    student.Item().PaddingTop(6).Text(t.StudentName).FontSize(15).Bold();
                    student.Item().Text(txt =>
                    {
                        txt.Span("Student ID: ").FontColor(MutedColor);
                        txt.Span(t.StudentId);
                    });
                    student.Item().Text(txt =>
                    {
                        txt.Span("Email: ").FontColor(MutedColor);
                        txt.Span(t.Email);
                    });
                });

                // School identity
                row.ConstantItem(220).Column(school =>
                {
                    school.Item().AlignRight().Text(SchoolName).FontSize(13).Bold();
                    school.Item().AlignRight().Text(SchoolAddress).FontColor(MutedColor);
                    school.Item().AlignRight().Text(SchoolPhone).FontColor(MutedColor);
                });
            });

            col.Item().PaddingBottom(10);
        });
    }

    // ── Content: course table + GPA summary ─────────────────────────────────────
    private void ComposeContent(IContainer container, TranscriptDto t)
    {
        container.Column(col =>
        {
            col.Item().Text("Academic Record").FontSize(12).Bold().FontColor(AccentColor);
            col.Item().PaddingTop(6).Element(c => ComposeCourseTable(c, t));

            col.Item().PaddingTop(16).Element(c => ComposeGpaSummary(c, t));
        });
    }

    private void ComposeCourseTable(IContainer container, TranscriptDto t)
    {
        container.Border(1).BorderColor(BorderColor).Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(4);   // Course
                columns.RelativeColumn(1.4f); // Mark
                columns.RelativeColumn(1.4f); // Percent
                columns.RelativeColumn(1.4f); // GPA
                columns.RelativeColumn(1.8f); // Graded
            });

            // Header row
            table.Header(header =>
            {
                header.Cell().Element(HeaderCell).Text("Course");
                header.Cell().Element(HeaderCell).AlignCenter().Text("Mark");
                header.Cell().Element(HeaderCell).AlignCenter().Text("Percent");
                header.Cell().Element(HeaderCell).AlignCenter().Text("GPA");
                header.Cell().Element(HeaderCell).AlignCenter().Text("Graded");
            });

            if (t.Courses.Count == 0)
            {
                table.Cell().ColumnSpan(5).Element(BodyCell).AlignCenter()
                    .Text("No enrolled courses on record.").FontColor(MutedColor).Italic();
                return;
            }

            foreach (var course in t.Courses)
            {
                table.Cell().Element(BodyCell).Text(course.CourseName);
                table.Cell().Element(BodyCell).AlignCenter().Text(course.LetterGrade).Bold();
                table.Cell().Element(BodyCell).AlignCenter()
                    .Text(course.GradedCount == 0 ? "—" : $"{course.Percent}%");
                table.Cell().Element(BodyCell).AlignCenter()
                    .Text(course.GradedCount == 0 ? "—" : course.GpaPoints.ToString("0.00"));
                table.Cell().Element(BodyCell).AlignCenter()
                    .Text($"{course.GradedCount} / {course.TotalCount}");
            }
        });
    }

    private void ComposeGpaSummary(IContainer container, TranscriptDto t)
    {
        container.Row(row =>
        {
            row.RelativeItem();
            row.ConstantItem(240).Border(1).BorderColor(BorderColor).Padding(10).Column(col =>
            {
                col.Item().Row(r =>
                {
                    r.RelativeItem().Text("Cumulative GPA").Bold();
                    r.ConstantItem(70).AlignRight().Text(t.OverallGpa.ToString("0.00"))
                        .FontSize(13).Bold().FontColor(AccentColor);
                });
                col.Item().PaddingTop(4).Row(r =>
                {
                    r.RelativeItem().Text("Assignments Graded").FontColor(MutedColor);
                    r.ConstantItem(70).AlignRight().Text($"{t.TotalGradedCount} / {t.TotalCount}")
                        .FontColor(MutedColor);
                });

                if (t.ClassRank.HasValue && t.ClassSize.HasValue)
                {
                    col.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("Class Rank").Bold();
                        r.ConstantItem(70).AlignRight().Text($"{t.ClassRank} of {t.ClassSize}").Bold();
                    });
                }

                if (t.ClassSize.HasValue)
                {
                    col.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("Class Size").FontColor(MutedColor);
                        r.ConstantItem(70).AlignRight().Text(t.ClassSize.ToString())
                            .FontColor(MutedColor);
                    });
                }

                if (!string.IsNullOrWhiteSpace(t.CohortName))
                {
                    col.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("Cohort").FontColor(MutedColor);
                        r.ConstantItem(110).AlignRight().Text(t.CohortName)
                            .FontColor(MutedColor);
                    });
                }
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text(txt =>
                {
                    txt.Span("Generated ").FontSize(8).FontColor(MutedColor);
                    txt.Span(DateTime.UtcNow.ToString("MMMM d, yyyy")).FontSize(8).FontColor(MutedColor);
                    txt.Span(" UTC").FontSize(8).FontColor(MutedColor);
                });
                row.RelativeItem().AlignRight().Text(txt =>
                {
                    txt.Span("Page ").FontSize(8).FontColor(MutedColor);
                    txt.CurrentPageNumber().FontSize(8).FontColor(MutedColor);
                    txt.Span(" of ").FontSize(8).FontColor(MutedColor);
                    txt.TotalPages().FontSize(8).FontColor(MutedColor);
                });
            });
        });
    }

    // ── Cell styling helpers ────────────────────────────────────────────────────
    private static IContainer HeaderCell(IContainer container) =>
        container
            .Background(Colors.Grey.Lighten3)
            .BorderBottom(1).BorderColor(BorderColor)
            .PaddingVertical(6).PaddingHorizontal(8)
            .DefaultTextStyle(x => x.SemiBold().FontSize(9));

    private static IContainer BodyCell(IContainer container) =>
        container
            .BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1)
            .PaddingVertical(5).PaddingHorizontal(8);
}
