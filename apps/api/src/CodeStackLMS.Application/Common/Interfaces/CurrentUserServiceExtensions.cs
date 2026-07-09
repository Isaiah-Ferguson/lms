namespace CodeStackLMS.Application.Common.Interfaces;

/// <summary>
/// The single place role names are compared. Controllers gate access with
/// [Authorize(Roles = ...)]; these helpers exist for the defence-in-depth and
/// ownership checks inside services.
/// </summary>
public static class CurrentUserServiceExtensions
{
    public static bool IsAdmin(this ICurrentUserService user)
        => user.Role == "Admin";

    /// <summary>Admin or Instructor.</summary>
    public static bool IsStaff(this ICurrentUserService user)
        => user.Role is "Admin" or "Instructor";
}
