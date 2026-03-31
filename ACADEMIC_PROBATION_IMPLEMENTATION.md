# Academic Probation Feature Implementation

## Overview
This document describes the Academic Probation feature that allows automatic and manual placement of students on probation, with a red banner displayed on their profile.

## Database Changes

### SQL Migration Required
Run this script in Azure Portal Query Editor:

```sql
-- Add Academic Probation fields to Users table
ALTER TABLE Users 
ADD IsOnProbation BIT NOT NULL DEFAULT 0,
    ProbationReason NVARCHAR(500) NOT NULL DEFAULT '';
```

**File:** `add-probation-fields.sql`

## Backend Changes

### 1. User Entity (`User.cs`)
Added two new properties:
- `IsOnProbation` (bool) - Default: false
- `ProbationReason` (string) - Default: empty string

### 2. ProfileUserDto (`AdminParticipantsDtos.cs`)
Added probation fields to the DTO:
- `bool IsOnProbation`
- `string ProbationReason`

### 3. ProfileService (`ProfileService.cs`)
- Updated all `ProfileUserDto` constructions to include probation status
- Added `SetProbationStatusAsync()` method for admins to manually set probation

### 4. IProfileService Interface
Added method signature:
```csharp
Task SetProbationStatusAsync(string userId, bool isOnProbation, string reason, CancellationToken cancellationToken = default);
```

### 5. ProfileController (`ProfileController.cs`)
Added new endpoint:
```
POST /api/profile/admin/participants/{userId}/probation
```

Request body:
```json
{
  "isOnProbation": true,
  "reason": "Grade below 70% in Level 2"
}
```

**Authorization:** Admin only

## Frontend Changes

### 1. TypeScript Interfaces
Updated `ProfileUser` interface in `profile-data.ts`:
```typescript
export interface ProfileUser {
  // ... existing fields
  isOnProbation: boolean;
  probationReason: string;
}
```

Updated `ProfileUserResponse` in `api-client.ts` to match.

### 2. ProbationBanner Component
Created new component: `ProbationBanner.tsx`
- Displays red alert banner with warning icon
- Shows probation reason if provided
- Includes guidance message for students
- Supports dark mode

### 3. ProfileViewClient
- Imports and displays `ProbationBanner` when `user.isOnProbation === true`
- Banner appears at the top of the profile page, below the header

## Features Implemented

### ✅ Manual Probation (Admin)
Admins can manually place students on probation via API endpoint with a custom reason.

### ✅ Red Banner Display
Students on probation see a prominent red banner on their profile page with:
- Warning icon
- "Academic Probation" heading
- Reason for probation
- Guidance message

### ✅ Admin-Only Notes
The existing `AdminNotesCard` component already provides admin-only notes functionality:
- Only visible to admins (controlled by `canViewAdminNotes` permission)
- Not visible to students
- Full history of notes with timestamps and authors

## Features NOT Yet Implemented

### ⚠️ Automatic Probation (Grade < 70%)
The automatic probation trigger based on grade percentage is **not yet implemented**.

To implement this, you would need to:
1. Add logic in `ProfileService.GetMyProfileAsync()` or `GetProfileForAdminAsync()`
2. Calculate current level grade percentage from `GradesOverviewDto`
3. Automatically set `IsOnProbation = true` if grade < 70%
4. Set `ProbationReason = "Grade below 70% in [Level Name]"`

**Suggested implementation location:**
After calculating `gradesOverview` in `ProfileService.cs`, add:
```csharp
// Auto-probation check
if (gradesOverview.OverallPercent < 70 && gradesOverview.GradedCount > 0)
{
    user.IsOnProbation = true;
    user.ProbationReason = $"Current grade ({gradesOverview.OverallPercent}%) is below the required 70% threshold";
    await _db.SaveChangesAsync(cancellationToken);
}
```

## Testing Checklist

### Database Setup
- [ ] Run `add-probation-fields.sql` in Azure Portal
- [ ] Verify columns exist with correct data types

### Backend Testing
- [ ] Rebuild API (`dotnet build`)
- [ ] Restart API (`dotnet run`)
- [ ] Test manual probation endpoint as admin
- [ ] Verify probation status persists in database

### Frontend Testing
- [ ] View profile as student on probation - should see red banner
- [ ] View profile as student NOT on probation - should NOT see banner
- [ ] Verify banner displays reason correctly
- [ ] Test dark mode appearance of banner
- [ ] Verify admin notes are visible only to admins

### Admin Workflow
- [ ] Admin can set probation status via API
- [ ] Admin can clear probation (set `isOnProbation: false`)
- [ ] Admin can update probation reason
- [ ] Admin notes section works independently

## API Endpoints Summary

### Get Profile (includes probation status)
```
GET /api/profile/me
GET /api/profile/admin/participants/{userId}
```

### Set Probation Status (Admin Only)
```
POST /api/profile/admin/participants/{userId}/probation
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "isOnProbation": true,
  "reason": "Late submissions and grade below 70%"
}
```

### Clear Probation (Admin Only)
```
POST /api/profile/admin/participants/{userId}/probation
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "isOnProbation": false,
  "reason": ""
}
```

## Notes
- Admin notes functionality was already implemented and is working
- Phone number and GitHub username fields were also added in this session
- Remember to run the SQL migration before testing!
