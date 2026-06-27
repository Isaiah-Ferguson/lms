namespace CodeStackLMS.Application.Common;

/// <summary>
/// The standard +/- letter-grade scale and 4.0 GPA points used across the grade,
/// profile, and transcript views. Single source of truth so the ladders can't drift.
/// </summary>
public static class GradeScale
{
    /// <summary>Map a 0-100 percentage to the standard letter grade.</summary>
    public static string ToLetter(int percent)
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

    /// <summary>GPA points (4.0 scale) for a letter grade.</summary>
    public static double GpaPoints(string letter) => letter switch
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
