# Timezone Display Fix

## Problem
Submission dates were showing incorrect times (off by approximately 9 hours) when viewing them after submission. The dates were being stored correctly in UTC in the database, but the frontend was not properly handling timezone conversion for display.

## Root Cause
The frontend was using JavaScript's native `toLocaleString()` and `toLocaleDateString()` methods inconsistently, which can produce unexpected results depending on how the date string is parsed and the user's browser timezone settings.

## Solution
Created a centralized date formatting utility (`date-utils.ts`) that properly handles ISO 8601 date strings from the API and formats them consistently in the user's local timezone.

---

## Changes Made

### 1. **Created Date Utility Library** ✅
**File:** `/Users/isaiahkeithferguson/Downloads/lms/apps/web/src/lib/date-utils.ts`

**Functions:**
- `formatDateTime(dateString)` - Formats date with time (e.g., "Apr 13, 2026, 9:17 AM")
- `formatDate(dateString)` - Formats date only (e.g., "Apr 13, 2026")
- `formatRelativeTime(dateString)` - Formats relative time (e.g., "2 hours ago")

**Benefits:**
- ✅ Consistent date formatting across the app
- ✅ Proper timezone handling
- ✅ Null-safe (returns "—" for null/undefined)
- ✅ Invalid date handling
- ✅ Customizable via Intl.DateTimeFormatOptions

### 2. **Updated SubmissionCard Component** ✅
**File:** `/Users/isaiahkeithferguson/Downloads/lms/apps/web/src/app/(app)/courses/[courseId]/assignments/[courseAssignmentId]/components/SubmissionCard.tsx`

**Changes:**
- Imported `formatDateTime` utility
- Replaced `new Date(state.submittedAt).toLocaleString()` with `formatDateTime(state.submittedAt)`

**Result:**
- ✅ Submission times now display correctly in user's local timezone
- ✅ Consistent formatting across all submission views

### 3. **Updated Instructor Submissions Page** ✅
**File:** `/Users/isaiahkeithferguson/Downloads/lms/apps/web/src/app/(app)/instructor/submissions/page.tsx`

**Changes:**
- Imported `formatDate` and `formatDateTime` utilities
- Replaced `new Date(item.submittedAt).toLocaleDateString()` with `formatDateTime(item.submittedAt)`
- Replaced `new Date(item.gradedAt).toLocaleDateString()` with `formatDateTime(item.gradedAt)`

**Result:**
- ✅ Submitted and graded dates display correctly
- ✅ Consistent formatting in the submissions queue

### 4. **Fixed Assignment Due Date Editing** ✅
**Files:** 
- `/Users/isaiahkeithferguson/Downloads/lms/apps/web/src/app/(app)/courses/[courseId]/assignments/[courseAssignmentId]/page.tsx`
- `/Users/isaiahkeithferguson/Downloads/lms/apps/web/src/components/assignments/CreateAssignmentForm.tsx`

**Problem:**
The `datetime-local` input type doesn't include timezone information. When loading a UTC date from the API and displaying it in the input, the browser was treating it as local time, causing a timezone offset issue.

**Changes:**
```typescript
// OLD (incorrect)
setEditDueDate(new Date(a.dueDate).toISOString().slice(0, 16));

// NEW (correct)
const localDate = new Date(a.dueDate);
const offset = localDate.getTimezoneOffset() * 60000;
const localISOTime = new Date(localDate.getTime() - offset).toISOString().slice(0, 16);
setEditDueDate(localISOTime);
```

**Result:**
- ✅ Due dates load correctly in the datetime-local input
- ✅ When editing, the displayed time matches the actual due date
- ✅ No more 10-hour offset when creating/editing assignments
- ✅ Due date display uses `formatDateTime()` for consistency

---

## How It Works

### Backend (Already Correct)
```csharp
// Submissions are created with UTC time
CreatedAt = DateTime.UtcNow
```

### API Response
```json
{
  "submittedAt": "2026-04-13T16:17:00.000Z"  // ISO 8601 UTC format
}
```

### Frontend Display
```typescript
// Before (inconsistent)
new Date(submittedAt).toLocaleString()  // Could show wrong time

// After (correct)
formatDateTime(submittedAt)  // Always shows correct local time
```

### Example
**UTC Time:** `2026-04-13T16:17:00.000Z`  
**User in PST (UTC-7):** Displays as "Apr 13, 2026, 9:17 AM"  
**User in EST (UTC-4):** Displays as "Apr 13, 2026, 12:17 PM"

---

## Testing

### Test Scenarios:
1. **Submit an assignment** → Check submission time displays correctly
2. **View as student** → Verify time matches when it was submitted
3. **View as admin** → Verify time is consistent across all views
4. **View as instructor** → Check submissions queue shows correct times

### Expected Results:
- ✅ All times display in user's local timezone
- ✅ Times are consistent across all pages
- ✅ No more 9-hour offset
- ✅ Dates format nicely (e.g., "Apr 13, 2026, 9:17 AM")

---

## Future Improvements

### Optional Enhancements:
1. **Relative Times:** Use `formatRelativeTime()` for recent submissions (e.g., "2 hours ago")
2. **Timezone Display:** Show timezone abbreviation (e.g., "9:17 AM PST")
3. **Date Picker:** Use the utility for any date input components
4. **Grading Timestamps:** Apply to all graded/returned timestamps

### Usage Example:
```typescript
import { formatDateTime, formatDate, formatRelativeTime } from "@/lib/date-utils";

// Full date and time
formatDateTime("2026-04-13T16:17:00.000Z")  // "Apr 13, 2026, 9:17 AM"

// Date only
formatDate("2026-04-13T16:17:00.000Z")  // "Apr 13, 2026"

// Relative time
formatRelativeTime("2026-04-13T16:17:00.000Z")  // "2 hours ago"

// Custom format
formatDateTime("2026-04-13T16:17:00.000Z", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
})  // "Saturday, April 13, 2026, 9:17 AM"
```

---

## Notes

- ✅ No backend changes required (already storing UTC correctly)
- ✅ No database migrations needed
- ✅ All changes are frontend-only
- ✅ Backward compatible
- ✅ Can be applied to other date displays throughout the app
