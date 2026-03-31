using CodeStackLMS.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace CodeStackLMS.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, detail, errors) = exception switch
        {
            NotFoundException nfe =>
                (StatusCodes.Status404NotFound, "Not Found", nfe.Message, (IReadOnlyList<string>?)null),

            ForbiddenException fe =>
                (StatusCodes.Status403Forbidden, "Forbidden", fe.Message, null),

            Application.Common.Exceptions.ValidationException ve =>
                (StatusCodes.Status400BadRequest, "Validation Error",
                 ve.Errors.Count > 0 ? ve.Errors[0] : ve.Message,
                 ve.Errors),

            UnauthorizedAccessException uae =>
                (StatusCodes.Status401Unauthorized, "Unauthorized", uae.Message, null),

            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error",
                  "An unexpected error occurred.", null)
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
            _logger.LogError(exception, "Unhandled exception");
        else
            _logger.LogWarning(exception, "Handled exception: {Title}", title);

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        if (errors is not null)
            problem.Extensions["errors"] = errors;

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(problem, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
    }
}
