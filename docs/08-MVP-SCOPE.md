# CodeStack LMS - MVP Scope & Sprint Plan

## MVP Goals

Build a functional LMS that supports:
1. **User Management**: Students, Instructors, Admins with role-based access
2. **Course Creation**: Instructors create courses with lessons (video-based)
3. **Assignments**: Create assignments with optional file attachments, accept file/GitHub submissions
4. **Grading**: Instructors grade submissions on a 100-point scale with detailed feedback
5. **Notifications**: Email notifications for key events

**Target Timeline**: 2-3 sprints (4-6 weeks)  
**Team Size**: 2-3 developers (1 frontend, 1 backend, 1 full-stack)

---

## Feature Prioritization

### Must-Have (P0) - MVP Core
- ✅ User authentication (JWT)
- ✅ Course CRUD with instructor ownership
- ✅ Lesson management with video upload
- ✅ Assignment creation with optional file attachments
- ✅ File upload submissions (Azure Blob + SAS)
- ✅ GitHub URL submissions
- ✅ 100-point scale grading with detailed feedback
- ✅ Student/Instructor dashboards
- ✅ Email notifications (submission, grading)

### Should-Have (P1) - Post-MVP
- Enrollment management (self-enroll)
- Course catalog with search
- Assignment due date reminders
- Gradebook view for instructors
- Student progress tracking
- Video streaming optimization

### Nice-to-Have (P2) - Future
- GitHub commit validation
- Plagiarism detection
- Analytics dashboard
- Discussion forums
- Live coding sessions
- Mobile app

---

## Sprint Breakdown

### **Sprint 1: Foundation & Authentication** (Week 1-2)

#### Backend Tasks
| Task | Estimate | Owner | Priority |
|------|----------|-------|----------|
| Setup .NET 10 project structure | 4h | Backend | P0 |
| Configure PostgreSQL + EF Core | 3h | Backend | P0 |
| Implement domain entities | 6h | Backend | P0 |
| Setup JWT authentication | 6h | Backend | P0 |
| Implement User CRUD endpoints | 4h | Backend | P0 |
| Setup Hangfire for background jobs | 3h | Backend | P0 |
| Configure Azure Blob Storage | 4h | Backend | P0 |
| Implement SAS token generation | 4h | Backend | P0 |
| Write unit tests (auth, users) | 6h | Backend | P0 |

**Total Backend**: ~40 hours

#### Frontend Tasks
| Task | Estimate | Owner | Priority |
|------|----------|-------|----------|
| Setup Next.js 14 project | 3h | Frontend | P0 |
| Configure TailwindCSS + shadcn/ui | 2h | Frontend | P0 |
| Implement authentication flow | 8h | Frontend | P0 |
| Create login/register pages | 6h | Frontend | P0 |
| Setup API client with interceptors | 4h | Frontend | P0 |
| Implement protected routes | 3h | Frontend | P0 |
| Create layout components (header, sidebar) | 6h | Frontend | P0 |
| Build user profile page | 4h | Frontend | P0 |

**Total Frontend**: ~36 hours

#### Deliverables
- ✅ Users can register and login
- ✅ JWT tokens issued and validated
- ✅ Role-based access control working
- ✅ Basic dashboard layout
- ✅ Database schema created and migrated

---

### **Sprint 2: Courses, Lessons & Assignments** (Week 3-4)

#### Backend Tasks
| Task | Estimate | Owner | Priority |
|------|----------|-------|----------|
| Implement Course CRUD endpoints | 6h | Backend | P0 |
| Implement Lesson CRUD endpoints | 6h | Backend | P0 |
| Implement video upload SAS flow | 6h | Backend | P0 |
| Implement Assignment CRUD endpoints | 6h | Backend | P0 |
| Implement assignment file attachment support | 3h | Backend | P0 |
| Implement Enrollment endpoints | 4h | Backend | P0 |
| Add authorization policies (course owner) | 5h | Backend | P0 |
| Write unit tests (courses, assignments) | 8h | Backend | P0 |
| Setup email service integration | 4h | Backend | P0 |

**Total Backend**: ~50 hours

#### Frontend Tasks
| Task | Estimate | Owner | Priority |
|------|----------|-------|----------|
| Build course list page | 6h | Frontend | P0 |
| Build course detail page | 6h | Frontend | P0 |
| Build course creation form | 8h | Frontend | P0 |
| Build lesson player component | 8h | Frontend | P0 |
| Build lesson creation form with video upload | 10h | Frontend | P0 |
| Build assignment list page | 5h | Frontend | P0 |
| Build assignment detail page | 6h | Frontend | P0 |
| Build assignment creation form with file upload | 8h | Frontend | P0 |
| Build assignment file attachment display | 3h | Frontend | P0 |
| Implement file upload with progress | 6h | Frontend | P0 |

**Total Frontend**: ~71 hours

#### Deliverables
- ✅ Instructors can create courses
- ✅ Instructors can add lessons with videos
- ✅ Videos uploaded to Azure Blob Storage
- ✅ Students can view enrolled courses and lessons
- ✅ Instructors can create assignments with optional file attachments
- ✅ Students can view assignments

---

### **Sprint 3: Submissions & Grading** (Week 5-6)

#### Backend Tasks
| Task | Estimate | Owner | Priority |
|------|----------|-------|----------|
| Implement Submission CRUD endpoints | 8h | Backend | P0 |
| Implement submission upload SAS flow | 6h | Backend | P0 |
| Implement GitHub submission validation | 5h | Backend | P0 |
| Implement Grade CRUD endpoints | 6h | Backend | P0 |
| Implement gradebook endpoint | 5h | Backend | P0 |
| Implement submission notification job | 4h | Backend | P0 |
| Implement grade notification job | 4h | Backend | P0 |
| Add download SAS URLs for submissions | 4h | Backend | P0 |
| Write integration tests (E2E flows) | 10h | Backend | P0 |
| API documentation (Swagger) | 3h | Backend | P0 |

**Total Backend**: ~55 hours

#### Frontend Tasks
| Task | Estimate | Owner | Priority |
|------|----------|-------|----------|
| Build submission form (file upload) | 8h | Frontend | P0 |
| Build submission form (GitHub URL) | 5h | Frontend | P0 |
| Build student submissions list page | 6h | Frontend | P0 |
| Build submission detail page | 6h | Frontend | P0 |
| Build grading interface | 10h | Frontend | P0 |
| Build grading form (100-point scale) | 6h | Frontend | P0 |
| Build gradebook page (instructor) | 8h | Frontend | P0 |
| Build student grades page | 5h | Frontend | P0 |
| Implement file download functionality | 4h | Frontend | P0 |
| Polish UI/UX across all pages | 8h | Frontend | P0 |
| Write E2E tests (Playwright) | 8h | Frontend | P0 |

**Total Frontend**: ~76 hours

#### Deliverables
- ✅ Students can submit assignments (file upload)
- ✅ Students can submit GitHub repo URLs
- ✅ Instructors receive submission notifications
- ✅ Instructors can grade submissions on 100-point scale
- ✅ Students receive grade notifications
- ✅ Gradebook shows all student grades
- ✅ Full E2E user flows tested

---

## MVP Feature Matrix

| Feature | Student | Instructor | Admin | Sprint |
|---------|---------|------------|-------|--------|
| **Authentication** |
| Register/Login | ✅ | ✅ | ✅ | 1 |
| View Profile | ✅ | ✅ | ✅ | 1 |
| **Courses** |
| View Enrolled Courses | ✅ | - | - | 2 |
| View Course Details | ✅ | ✅ | ✅ | 2 |
| Create Course | - | ✅ | ✅ | 2 |
| Edit Course | - | ✅ | ✅ | 2 |
| **Lessons** |
| Watch Lesson Videos | ✅ | ✅ | ✅ | 2 |
| Create Lesson | - | ✅ | ✅ | 2 |
| Upload Video | - | ✅ | ✅ | 2 |
| **Assignments** |
| View Assignments | ✅ | ✅ | ✅ | 2 |
| Create Assignment | - | ✅ | ✅ | 2 |
| Add Assignment Attachments | - | ✅ | ✅ | 2 |
| **Submissions** |
| Submit Assignment (File) | ✅ | - | - | 3 |
| Submit Assignment (GitHub) | ✅ | - | - | 3 |
| View Own Submissions | ✅ | - | - | 3 |
| View All Submissions | - | ✅ | ✅ | 3 |
| Download Submissions | - | ✅ | ✅ | 3 |
| **Grading** |
| Grade Submission | - | ✅ | ✅ | 3 |
| View Gradebook | - | ✅ | ✅ | 3 |
| View Own Grades | ✅ | - | - | 3 |
| **Notifications** |
| Submission Notification | - | ✅ | - | 3 |
| Grade Notification | ✅ | - | - | 3 |

---

## Technical Debt & Known Limitations

### MVP Shortcuts (To Address Post-MVP)
1. **No video encoding**: Videos stored as-is (no adaptive bitrate)
2. **Basic email**: Simple SMTP (no templates, no queuing)
3. **No GitHub validation**: Accept URL/commit without verification
4. **No file type validation**: Trust client-side checks
5. **No plagiarism detection**: Manual review only
6. **No analytics**: No tracking of video views, engagement
7. **No search**: Simple list views only
8. **No pagination optimization**: Load all records (limit 100)

### Post-MVP Improvements
1. Implement Azure Media Services for video streaming
2. Add email template system (Handlebars/Razor)
3. Integrate GitHub API for commit validation
4. Add server-side file scanning (malware, type validation)
5. Integrate MOSS or similar for plagiarism detection
6. Add analytics dashboard (student engagement, video completion)
7. Implement full-text search (PostgreSQL FTS)
8. Optimize pagination with cursor-based approach

---

## Testing Strategy

### Unit Tests
- **Backend**: 80%+ coverage on domain logic, services
- **Frontend**: Test utilities, hooks, complex components

### Integration Tests
- **Backend**: Test API endpoints with in-memory database
- **Frontend**: Test API client integration

### E2E Tests (Critical Paths)
1. Student registers → enrolls → views lesson → submits assignment
2. Instructor creates course → adds lesson → creates assignment → grades submission
3. Admin manages users and courses

### Manual Testing Checklist
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness (iOS Safari, Android Chrome)
- [ ] File upload (various sizes, types)
- [ ] Video playback (various formats, sizes)
- [ ] Permission checks (role-based access)
- [ ] Error handling (network failures, validation errors)

---

## Deployment Plan

### Infrastructure Setup
1. **Azure Resources**:
   - App Service (API)
   - PostgreSQL Flexible Server
   - Blob Storage Account
   - Application Insights (monitoring)

2. **Frontend Hosting**:
   - Vercel (recommended) or Azure Static Web Apps
   - Environment variables configured

3. **CI/CD Pipeline**:
   - GitHub Actions for automated testing
   - Deploy on merge to `main` branch

### Environment Configuration

**Development**:
- Local PostgreSQL
- Azure Blob Storage (dev container)
- Local Hangfire dashboard

**Staging**:
- Azure PostgreSQL (small instance)
- Azure Blob Storage (staging container)
- Full monitoring enabled

**Production**:
- Azure PostgreSQL (production instance)
- Azure Blob Storage (production container)
- CDN enabled
- Backup strategy configured

---

## Success Metrics

### MVP Launch Criteria
- [ ] All P0 features implemented and tested
- [ ] API response time < 200ms (p95)
- [ ] Frontend page load < 2s
- [ ] Zero critical security vulnerabilities
- [ ] 80%+ test coverage (backend)
- [ ] All E2E tests passing
- [ ] Documentation complete (API, deployment)

### Post-Launch Metrics (Week 1-4)
- **Adoption**: 50+ active users
- **Engagement**: 80%+ course completion rate
- **Performance**: 99% uptime
- **Quality**: < 5 critical bugs reported
- **Satisfaction**: 4+ star average rating

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Azure Blob Storage costs exceed budget** | High | Medium | Implement lifecycle policies, monitor usage, set alerts |
| **Video upload fails for large files** | High | Medium | Implement chunked uploads, add retry logic, show progress |
| **GitHub API rate limits** | Medium | Low | Cache validation results, implement exponential backoff |
| **Database performance degrades** | High | Low | Add indexes, implement caching, optimize queries |
| **Email delivery fails** | Medium | Medium | Use reliable provider (SendGrid), implement retry queue |
| **Security vulnerability discovered** | Critical | Low | Regular dependency updates, security audits, penetration testing |

---

## Post-MVP Roadmap

### Phase 2 (Weeks 7-10)
- Self-enrollment with course codes
- Course catalog with search and filters
- Student progress tracking
- Assignment due date reminders
- Gradebook export (CSV)
- Instructor analytics dashboard

### Phase 3 (Weeks 11-14)
- Azure Media Services integration
- GitHub commit validation
- Plagiarism detection (MOSS)
- Discussion forums
- Peer review assignments
- Mobile-responsive improvements

### Phase 4 (Weeks 15-18)
- Microsoft Entra ID integration
- Advanced analytics (engagement, retention)
- Video transcription and captions
- Live coding sessions (CodeMirror)
- API rate limiting per user
- Multi-language support

---

## Team Responsibilities

### Backend Developer
- API development (.NET Core)
- Database design and migrations
- Azure Blob Storage integration
- Background jobs (Hangfire)
- Unit and integration tests
- API documentation

### Frontend Developer
- Next.js application development
- UI component library (shadcn/ui)
- State management
- API integration
- E2E tests (Playwright)
- Responsive design

### Full-Stack Developer (Flex)
- Support both frontend and backend
- DevOps and deployment
- Performance optimization
- Security reviews
- Bug fixes and technical debt

---

## Daily Standup Format

**What did you complete yesterday?**
- Specific tasks/features completed

**What will you work on today?**
- Planned tasks for the day

**Any blockers?**
- Dependencies, questions, issues

**Sprint Review**: End of each sprint (demo + retrospective)

---

## Definition of Done

A feature is "done" when:
- ✅ Code implemented and reviewed
- ✅ Unit tests written and passing
- ✅ Integration tests passing
- ✅ Manual testing completed
- ✅ Documentation updated
- ✅ Deployed to staging
- ✅ Product owner approval

---

## Launch Checklist

### Pre-Launch (1 week before)
- [ ] All MVP features complete
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Backup and recovery tested
- [ ] Monitoring and alerts configured
- [ ] User documentation written
- [ ] Support process defined

### Launch Day
- [ ] Deploy to production
- [ ] Smoke tests passing
- [ ] Monitoring active
- [ ] Support team ready
- [ ] Announcement sent

### Post-Launch (1 week after)
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Address critical bugs
- [ ] Plan Phase 2 features
- [ ] Retrospective meeting

---

## Budget Estimate (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Azure App Service | B2 (2 cores, 3.5GB) | $73 |
| PostgreSQL Flexible Server | B1ms (1 core, 2GB) | $25 |
| Azure Blob Storage | Hot tier, 100GB | $5 |
| Application Insights | 5GB/month | $12 |
| SendGrid Email | 40K emails/month | $15 |
| **Total** | | **~$130/month** |

**Note**: Costs scale with usage. Monitor and adjust as needed.
