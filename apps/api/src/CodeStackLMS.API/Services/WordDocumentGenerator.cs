using System.Text.RegularExpressions;
using CodeStackLMS.Application.Reports.DTOs;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CodeStackLMS.API.Services;

public sealed class WordDocumentGenerator
{
    public byte[] Generate(ProgressReportDetailDto report)
    {
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            var isClass = report.ReportType == "ClassSummary";

            // ── Title ────────────────────────────────────────────────────────
            var titleText = isClass ? "Class Summary Report" : "Student Progress Report";
            body.AppendChild(MakeParagraph(titleText, 28, bold: true, spaceAfter: 120));

            // ── Subtitle ─────────────────────────────────────────────────────
            var sub = isClass
                ? $"Week of {report.WeekOf:MMMM d, yyyy}"
                : $"{report.StudentName} — Week of {report.WeekOf:MMMM d, yyyy}";
            body.AppendChild(MakeParagraph(sub, 16, bold: false, color: "555555", spaceAfter: 100));

            // ── Metadata ─────────────────────────────────────────────────────
            var meta = new List<string> { $"Status: {report.Status}" };
            if (report.GeneratedAt.HasValue)
                meta.Add($"Generated: {report.GeneratedAt.Value:MMM d, yyyy h:mm tt} UTC");
            meta.Add($"Model: {report.Model}");
            body.AppendChild(MakeParagraph(string.Join("   |   ", meta), 9, bold: false, color: "888888", spaceAfter: 240));

            // ── Divider ───────────────────────────────────────────────────────
            body.AppendChild(MakeDivider());

            // ── Content ───────────────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(report.Content))
            {
                foreach (var p in ParseMarkdown(report.Content))
                    body.AppendChild(p);
            }
            else
            {
                body.AppendChild(MakeParagraph("No content available.", 11, bold: false, color: "999999"));
            }

            // ── Page margins ──────────────────────────────────────────────────
            body.AppendChild(new SectionProperties(
                new PageMargin { Top = 1440, Bottom = 1440, Left = 1440, Right = 1440 }
            ));

            mainPart.Document.Save();
        }

        return ms.ToArray();
    }

    // ── Paragraph builders ────────────────────────────────────────────────────

    private static Paragraph MakeParagraph(
        string text, int ptSize, bool bold,
        string? color = null, int spaceAfter = 160)
    {
        var rp = new RunProperties();
        if (bold) rp.AppendChild(new Bold());
        rp.AppendChild(new FontSize { Val = (ptSize * 2).ToString() });
        rp.AppendChild(new FontSizeComplexScript { Val = (ptSize * 2).ToString() });
        if (color != null)
            rp.AppendChild(new DocumentFormat.OpenXml.Wordprocessing.Color { Val = color });

        var pp = new ParagraphProperties(
            new SpacingBetweenLines { Before = "0", After = spaceAfter.ToString() }
        );

        return new Paragraph(pp,
            new Run(rp, new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
    }

    private static Paragraph MakeDivider()
    {
        var pp = new ParagraphProperties(
            new ParagraphBorders(new BottomBorder
            {
                Val = BorderValues.Single,
                Size = 6,
                Space = 1,
                Color = "CCCCCC",
            }),
            new SpacingBetweenLines { Before = "0", After = "240" }
        );
        return new Paragraph(pp);
    }

    // ── Heading builders ──────────────────────────────────────────────────────

    private static Paragraph MakeH1(string text)
    {
        var rp = new RunProperties(
            new Bold(),
            new FontSize { Val = "40" },
            new FontSizeComplexScript { Val = "40" }
        );
        var pp = new ParagraphProperties(
            new SpacingBetweenLines { Before = "480", After = "120" }
        );
        return new Paragraph(pp, new Run(rp, new Text(text)));
    }

    private static Paragraph MakeH2(string text)
    {
        var rp = new RunProperties(
            new Bold(),
            new FontSize { Val = "26" },
            new FontSizeComplexScript { Val = "26" },
            new DocumentFormat.OpenXml.Wordprocessing.Color { Val = "2563EB" }
        );
        var pp = new ParagraphProperties(
            new SpacingBetweenLines { Before = "360", After = "80" }
        );
        return new Paragraph(pp, new Run(rp, new Text(text)));
    }

    private static Paragraph MakeListItem(string text)
    {
        var pp = new ParagraphProperties(
            new Indentation { Left = "720" },
            new SpacingBetweenLines { Before = "0", After = "80" }
        );
        var para = new Paragraph(pp);
        para.AppendChild(new Run(
            new RunProperties(new FontSize { Val = "22" }),
            new Text("• ") { Space = SpaceProcessingModeValues.Preserve }
        ));
        foreach (var r in InlineRuns(text, 11))
            para.AppendChild(r);
        return para;
    }

    private static Paragraph MakeBody(string text)
    {
        var pp = new ParagraphProperties(
            new SpacingBetweenLines { Before = "0", After = "120" }
        );
        var para = new Paragraph(pp);
        foreach (var r in InlineRuns(text, 11))
            para.AppendChild(r);
        return para;
    }

    // ── Markdown parser ───────────────────────────────────────────────────────

    private static List<Paragraph> ParseMarkdown(string markdown)
    {
        var result = new List<Paragraph>();
        foreach (var raw in markdown.Split('\n'))
        {
            var line = raw.TrimEnd('\r');

            if (string.IsNullOrWhiteSpace(line))
            {
                result.Add(new Paragraph(
                    new ParagraphProperties(new SpacingBetweenLines { Before = "0", After = "80" })
                ));
                continue;
            }

            if (line.StartsWith("## "))      result.Add(MakeH2(line[3..]));
            else if (line.StartsWith("# "))  result.Add(MakeH1(line[2..]));
            else if (line.StartsWith("- ") || line.StartsWith("* ")) result.Add(MakeListItem(line[2..]));
            else result.Add(MakeBody(line));
        }
        return result;
    }

    // ── Inline bold parser (**text**) ─────────────────────────────────────────

    private static IEnumerable<Run> InlineRuns(string text, int ptSize)
    {
        var parts = Regex.Split(text, @"\*\*(.+?)\*\*");
        for (var i = 0; i < parts.Length; i++)
        {
            if (string.IsNullOrEmpty(parts[i])) continue;
            var bold = i % 2 == 1;
            var rp = new RunProperties(
                new FontSize { Val = (ptSize * 2).ToString() },
                new FontSizeComplexScript { Val = (ptSize * 2).ToString() }
            );
            if (bold) rp.PrependChild(new Bold());
            yield return new Run(rp,
                new Text(parts[i]) { Space = SpaceProcessingModeValues.Preserve });
        }
    }
}
