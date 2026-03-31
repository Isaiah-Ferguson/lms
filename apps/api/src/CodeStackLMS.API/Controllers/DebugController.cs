using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/debug")]
[Authorize(Roles = "Admin")]
public class DebugController : ControllerBase
{
    private readonly IApplicationDbContext _db;

    public DebugController(IApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("check-email/{email}")]
    public async Task<IActionResult> CheckEmail(string email)
    {
        var emailLower = email.Trim().ToLower();
        var user = await _db.Users
            .Where(u => u.Email == emailLower)
            .Select(u => new { u.Id, u.Email, u.Name, u.CreatedAt })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return Ok(new { exists = false, searchedFor = emailLower });
        }

        return Ok(new { exists = true, user, searchedFor = emailLower });
    }

    [HttpGet("all-emails")]
    public async Task<IActionResult> GetAllEmails()
    {
        var emails = await _db.Users
            .Select(u => new { u.Email, u.Name, u.CreatedAt })
            .OrderBy(u => u.Email)
            .ToListAsync();

        return Ok(new { count = emails.Count, emails });
    }
}
