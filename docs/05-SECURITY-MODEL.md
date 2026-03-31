# CodeStack LMS - Security Model & Permissions

## Role-Based Access Control (RBAC)

### Roles

| Role | Description | Default Permissions |
|------|-------------|-------------------|
| **Student** | Learner enrolled in courses | View enrolled courses, submit assignments, view own grades |
| **Instructor** | Course creator and grader | All Student permissions + create/manage courses, grade submissions |
| **Admin** | System administrator | All permissions across the system |

### Role Hierarchy
```
Admin (highest privilege)
  ↓
Instructor
  ↓
Student (lowest privilege)
```

---

## Permissions Matrix

### Legend
- ✅ = Allowed
- ❌ = Denied
- 🔒 = Allowed with ownership/enrollment check
- ⚠️ = Allowed with conditions

### Authentication & Users

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| Register account | ✅ | ✅ | ❌ | Admins created by other admins |
| Login | ✅ | ✅ | ✅ | |
| View own profile | ✅ | ✅ | ✅ | |
| Update own profile | ✅ | ✅ | ✅ | |
| View other user profiles | ❌ | ⚠️ | ✅ | Instructors: enrolled students only |
| Update other user profiles | ❌ | ❌ | ✅ | |
| Delete users | ❌ | ❌ | ✅ | Soft delete (deactivate) |
| Change user roles | ❌ | ❌ | ✅ | |

### Courses

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View published courses | ✅ | ✅ | ✅ | Public catalog |
| View unpublished courses | ❌ | 🔒 | ✅ | Instructors: own courses only |
| View course details | 🔒 | 🔒 | ✅ | Must be enrolled/owner |
| Create course | ❌ | ✅ | ✅ | |
| Update course | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Delete course | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Publish/unpublish course | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Enrollments

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| Enroll self in course | ✅ | ✅ | ✅ | Published courses only |
| Enroll others | ❌ | 🔒 | ✅ | Instructors: own courses only |
| View own enrollments | ✅ | ✅ | ✅ | |
| View course roster | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Unenroll self | ✅ | ✅ | ✅ | |
| Unenroll others | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Lessons

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View published lessons | 🔒 | 🔒 | ✅ | Must be enrolled/owner |
| View unpublished lessons | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Stream lesson video | 🔒 | 🔒 | ✅ | SAS token with 1-hour expiry |
| Create lesson | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Update lesson | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Delete lesson | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Upload video | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Assignments

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View assignments | 🔒 | 🔒 | ✅ | Must be enrolled/owner |
| View assignment details | 🔒 | 🔒 | ✅ | Includes rubric |
| Create assignment | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Update assignment | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Delete assignment | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Create/edit rubric | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Submissions

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View own submissions | ✅ | ✅ | ✅ | |
| View others' submissions | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Create submission | 🔒 | ❌ | ❌ | Must be enrolled student |
| Update submission (draft) | 🔒 | ❌ | ❌ | Own submissions, before submit |
| Submit assignment | 🔒 | ❌ | ❌ | Own submissions |
| Download submission files | 🔒 | 🔒 | ✅ | Student: own; Instructor: course |
| Delete submission | ❌ | ❌ | ✅ | |

### Grading

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View own grades | ✅ | ✅ | ✅ | Published grades only |
| View others' grades | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Create/update grade | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Publish grade | ❌ | 🔒 | ✅ | Instructors: own courses only |
| View gradebook | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Storage (Azure Blob)

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| Upload submission files | 🔒 | ❌ | ❌ | Own submissions only |
| Download submission files | 🔒 | 🔒 | ✅ | Student: own; Instructor: course |
| Upload lesson videos | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Stream lesson videos | 🔒 | 🔒 | ✅ | Must be enrolled/owner |

### Admin Functions

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View system stats | ❌ | ❌ | ✅ | |
| Manage all users | ❌ | ❌ | ✅ | |
| Manage all courses | ❌ | ❌ | ✅ | |
| View audit logs | ❌ | ❌ | ✅ | Future feature |
| Add admin notes to users | ❌ | ❌ | ✅ | |
| View admin notes | ❌ | ❌ | ✅ | |
| Set user probation status | ❌ | ❌ | ✅ | |
| Export admin notes to DOCX | ❌ | ❌ | ✅ | |
| Manage cohorts | ❌ | ❌ | ✅ | |
| Enroll users in courses | ❌ | ❌ | ✅ | |

### Feedback Comments

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View comments on own submissions | ✅ | ✅ | ✅ | |
| View comments on course submissions | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Add comment to submission | 🔒 | 🔒 | ✅ | Students: own submissions; Instructors: course submissions |
| Delete own comment | ✅ | ✅ | ✅ | |
| Delete others' comments | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Announcements

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View course announcements | 🔒 | 🔒 | ✅ | Must be enrolled/owner |
| Create announcement | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Update announcement | ❌ | 🔒 | ✅ | Instructors: own courses only |
| Delete announcement | ❌ | 🔒 | ✅ | Instructors: own courses only |

### Cohorts

| Action | Student | Instructor | Admin | Notes |
|--------|---------|------------|-------|-------|
| View cohorts | ❌ | ❌ | ✅ | |
| Create cohort | ❌ | ❌ | ✅ | |
| Update cohort | ❌ | ❌ | ✅ | |
| Delete cohort | ❌ | ❌ | ✅ | |
| Link courses to cohort | ❌ | ❌ | ✅ | |

---

## Authorization Implementation

### 1. JWT Token Structure

```json
{
  "sub": "user-guid",
  "email": "user@example.com",
  "role": "Student | Instructor | Admin",
  "name": "John Doe",
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "CodeStackLMS",
  "aud": "CodeStackLMS"
}
```

**Token Expiry**:
- Access Token: 60 minutes
- Refresh Token: 7 days (stored in DB, can be revoked)

### 2. Authorization Attributes (C#)

```csharp
// Simple role check
[Authorize(Roles = "Admin")]
public async Task<IActionResult> GetAllUsers() { }

// Multiple roles
[Authorize(Roles = "Instructor,Admin")]
public async Task<IActionResult> CreateCourse() { }

// Custom policy
[Authorize(Policy = "CourseOwner")]
public async Task<IActionResult> UpdateCourse(Guid id) { }
```

### 3. Custom Authorization Policies

```csharp
// Startup.cs / Program.cs
services.AddAuthorization(options =>
{
    // Course ownership
    options.AddPolicy("CourseOwner", policy =>
        policy.Requirements.Add(new CourseOwnerRequirement()));
    
    // Enrollment check
    options.AddPolicy("EnrolledStudent", policy =>
        policy.Requirements.Add(new EnrollmentRequirement()));
    
    // Submission ownership
    options.AddPolicy("SubmissionOwner", policy =>
        policy.Requirements.Add(new SubmissionOwnerRequirement()));
});
```

### 4. Authorization Handlers

```csharp
public class CourseOwnerHandler : AuthorizationHandler<CourseOwnerRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CourseOwnerRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var courseId = GetCourseIdFromContext(context);
        
        // Check if user is Admin
        if (context.User.IsInRole("Admin"))
        {
            context.Succeed(requirement);
            return;
        }
        
        // Check if user is course instructor
        var course = await _dbContext.Courses.FindAsync(courseId);
        if (course?.InstructorId.ToString() == userId)
        {
            context.Succeed(requirement);
        }
    }
}
```

### 5. Resource-Based Authorization

For fine-grained control (e.g., checking submission ownership):

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetSubmission(Guid id)
{
    var submission = await _dbContext.Submissions.FindAsync(id);
    if (submission == null) return NotFound();
    
    // Check authorization
    var authResult = await _authorizationService.AuthorizeAsync(
        User, submission, "SubmissionAccess");
    
    if (!authResult.Succeeded)
        return Forbid();
    
    return Ok(submission);
}
```

---

## Security Best Practices

### 1. Password Security
- **Hashing**: BCrypt with salt (work factor: 12)
- **Requirements**: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
- **Storage**: Never store plaintext; only hashed passwords

### 2. JWT Security
- **Secret**: 256-bit random key (stored in environment variables)
- **Algorithm**: HS256 (HMAC-SHA256)
- **Validation**: Verify signature, expiry, issuer, audience
- **Refresh Tokens**: Stored in DB with user association, can be revoked

### 3. API Security
- **HTTPS Only**: Enforce TLS 1.2+
- **CORS**: Whitelist frontend domain only
- **Rate Limiting**: 100 req/min per user
- **Request Size**: Max 50MB (for file uploads)
- **Headers**: 
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000`

### 4. Input Validation
- **Server-Side**: Always validate (never trust client)
- **Sanitization**: Escape HTML, prevent SQL injection (use parameterized queries)
- **File Uploads**: Validate type, size, scan for malware (future)

### 5. Sensitive Data
- **Connection Strings**: Environment variables only
- **API Keys**: Azure Key Vault (production)
- **Secrets**: Never commit to Git
- **Logging**: Never log passwords, tokens, or PII

---

## Pluggable Auth Provider Design

### Current: JWT with Custom Implementation

```csharp
public interface IAuthenticationProvider
{
    Task<AuthResult> AuthenticateAsync(string email, string password);
    Task<AuthResult> RefreshTokenAsync(string refreshToken);
    Task<bool> ValidateTokenAsync(string token);
    Task RevokeTokenAsync(string refreshToken);
}

public class JwtAuthenticationProvider : IAuthenticationProvider
{
    // Current implementation
}
```

### Future: Microsoft Entra ID (Azure AD)

```csharp
public class EntraIdAuthenticationProvider : IAuthenticationProvider
{
    // OAuth 2.0 / OpenID Connect flow
    // Delegate to Microsoft.Identity.Web
}
```

**Migration Path**:
1. Keep `IAuthenticationProvider` interface
2. Implement `EntraIdAuthenticationProvider`
3. Configure via `appsettings.json`:
```json
{
  "Authentication": {
    "Provider": "JWT" | "EntraId",
    "EntraId": {
      "TenantId": "...",
      "ClientId": "...",
      "ClientSecret": "..."
    }
  }
}
```
4. Swap provider in DI container
5. User roles synced from Entra ID groups

---

## Audit Logging (Future Enhancement)

Track security-relevant events:
- Login attempts (success/failure)
- Role changes
- Course access
- Submission access
- Grade changes
- Admin actions

**Schema**:
```csharp
public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; }  // "Login", "ViewSubmission", etc.
    public string Resource { get; set; }  // "Submission:guid"
    public string IpAddress { get; set; }
    public bool Success { get; set; }
    public DateTime Timestamp { get; set; }
}
```
