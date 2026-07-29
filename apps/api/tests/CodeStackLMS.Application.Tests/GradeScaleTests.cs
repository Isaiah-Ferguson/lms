using CodeStackLMS.Application.Common;
using Xunit;

namespace CodeStackLMS.Application.Tests;

/// <summary>
/// The letter/GPA ladder feeds grades, profiles and transcripts, so a drift in
/// any boundary silently changes every student's reported standing.
/// </summary>
public class GradeScaleTests
{
    [Theory]
    // Boundary of every band, plus the value one below it.
    [InlineData(100, "A")]
    [InlineData(93, "A")]
    [InlineData(92, "A-")]
    [InlineData(90, "A-")]
    [InlineData(89, "B+")]
    [InlineData(87, "B+")]
    [InlineData(86, "B")]
    [InlineData(83, "B")]
    [InlineData(82, "B-")]
    [InlineData(80, "B-")]
    [InlineData(79, "C+")]
    [InlineData(77, "C+")]
    [InlineData(76, "C")]
    [InlineData(73, "C")]
    [InlineData(72, "C-")]
    [InlineData(70, "C-")]
    [InlineData(69, "D+")]
    [InlineData(67, "D+")]
    [InlineData(66, "D")]
    [InlineData(63, "D")]
    [InlineData(62, "D-")]
    [InlineData(60, "D-")]
    [InlineData(59, "F")]
    [InlineData(0, "F")]
    public void ToLetter_MapsEachBandBoundary(int percent, string expected)
        => Assert.Equal(expected, GradeScale.ToLetter(percent));

    [Theory]
    [InlineData("A", 4.0)]
    [InlineData("A-", 3.7)]
    [InlineData("B+", 3.3)]
    [InlineData("B", 3.0)]
    [InlineData("B-", 2.7)]
    [InlineData("C+", 2.3)]
    [InlineData("C", 2.0)]
    [InlineData("C-", 1.7)]
    [InlineData("D+", 1.3)]
    [InlineData("D", 1.0)]
    [InlineData("D-", 0.7)]
    [InlineData("F", 0.0)]
    public void GpaPoints_MapsEveryLetter(string letter, double expected)
        => Assert.Equal(expected, GradeScale.GpaPoints(letter));

    [Fact]
    public void GpaPoints_ForUnknownLetter_IsZeroRatherThanThrowing()
        => Assert.Equal(0.0, GradeScale.GpaPoints("not-a-grade"));

    [Fact]
    public void EveryLetterProducedByToLetter_HasGpaPoints()
    {
        // Guards the two ladders against drifting apart: any letter the scale can
        // emit must be scoreable, otherwise a real grade silently becomes a 0.0.
        for (var percent = 0; percent <= 100; percent++)
        {
            var letter = GradeScale.ToLetter(percent);
            if (letter == "F") continue;

            Assert.True(
                GradeScale.GpaPoints(letter) > 0,
                $"{percent}% maps to '{letter}', which has no GPA points.");
        }
    }
}
