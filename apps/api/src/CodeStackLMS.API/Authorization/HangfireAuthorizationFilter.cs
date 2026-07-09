using System.Security.Cryptography;
using System.Text;
using Hangfire.Dashboard;

namespace CodeStackLMS.API.Authorization;

/// <summary>
/// Gates access to the Hangfire dashboard (/hangfire): open in Development;
/// in other environments requires either an authenticated Admin (JWT) or the
/// HTTP Basic credentials configured under Hangfire:Dashboard. If neither a
/// valid JWT nor Basic credentials are configured/supplied, access is denied.
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // In development, allow all access
        if (httpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            return true;

        // Authenticated Admin via the JWT bearer pipeline (tooling/API access)
        if (httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole("Admin"))
            return true;

        // Browsers navigating to /hangfire can't attach a bearer token, so also
        // accept HTTP Basic credentials configured under Hangfire:Dashboard.
        var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var configuredUsername = config["Hangfire:Dashboard:Username"];
        var configuredPassword = config["Hangfire:Dashboard:Password"];

        if (!string.IsNullOrEmpty(configuredUsername)
            && !string.IsNullOrEmpty(configuredPassword)
            && TryGetBasicCredentials(httpContext.Request, out var username, out var password)
            && FixedTimeEquals(username, configuredUsername)
            && FixedTimeEquals(password, configuredPassword))
        {
            return true;
        }

        // Challenge so browsers prompt for credentials instead of a bare 401.
        httpContext.Response.Headers.WWWAuthenticate = "Basic realm=\"Hangfire Dashboard\", charset=\"UTF-8\"";
        return false;
    }

    private static bool TryGetBasicCredentials(HttpRequest request, out string username, out string password)
    {
        username = string.Empty;
        password = string.Empty;

        var header = request.Headers.Authorization.ToString();
        if (!header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return false;

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header["Basic ".Length..].Trim()));
            var separator = decoded.IndexOf(':');
            if (separator < 0)
                return false;

            username = decoded[..separator];
            password = decoded[(separator + 1)..];
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool FixedTimeEquals(string a, string b)
        => CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(a),
            Encoding.UTF8.GetBytes(b));
}
