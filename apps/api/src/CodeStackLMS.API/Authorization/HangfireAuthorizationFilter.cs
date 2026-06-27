using Hangfire.Dashboard;

namespace CodeStackLMS.API.Authorization;

/// <summary>
/// Gates access to the Hangfire dashboard (/hangfire): open in Development,
/// Admin-only (authenticated) in other environments.
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // In development, allow all access
        if (httpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            return true;

        // In production, require authentication and Admin role
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole("Admin");
    }
}
