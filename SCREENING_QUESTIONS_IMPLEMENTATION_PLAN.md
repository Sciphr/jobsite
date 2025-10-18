# Screening Questions Implementation Plan

## Overview
Add support for custom screening questions in job applications with two application types: "Quick Apply" (existing) and "Full Application" (with screening questions).

---

## Database Changes

### SQL Migration File
Location: `prisma/migrations/add_screening_questions.sql`

**Run these commands:**
```bash
# Apply the SQL migration
psql -U your_username -d your_database -f prisma/migrations/add_screening_questions.sql

# Then pull the schema and generate Prisma client
npx prisma db pull
npx prisma generate
```

### New Tables Created:
1. **question_templates** - Reusable question templates
2. **job_screening_questions** - Questions assigned to specific jobs
3. **application_screening_answers** - Applicant answers

### Modified Tables:
1. **jobs** - Added `application_type` column (quick/full)

---

## Implementation Steps

### Phase 1: Backend API Routes (Priority 1)

#### 1.1 Question Templates API
**Location:** `app/api/admin/question-templates/`

- **GET** `/api/admin/question-templates` - List all templates
- **POST** `/api/admin/question-templates` - Create new template
- **GET** `/api/admin/question-templates/[id]` - Get single template
- **PATCH** `/api/admin/question-templates/[id]` - Update template
- **DELETE** `/api/admin/question-templates/[id]` - Delete template (soft delete by setting is_active=false)

#### 1.2 Job Screening Questions API
**Location:** `app/api/admin/jobs/[id]/screening-questions/`

- **GET** `/api/admin/jobs/[id]/screening-questions` - Get all questions for a job
- **POST** `/api/admin/jobs/[id]/screening-questions` - Add question to job
- **PATCH** `/api/admin/jobs/[id]/screening-questions/[questionId]` - Update question
- **DELETE** `/api/admin/jobs/[id]/screening-questions/[questionId]` - Remove question
- **POST** `/api/admin/jobs/[id]/screening-questions/reorder` - Update sort_order for all questions

#### 1.3 Public Job Questions API
**Location:** `app/api/jobs/[slug]/screening-questions/`

- **GET** `/api/jobs/[slug]/screening-questions` - Get questions for public job application (no auth required)

#### 1.4 Application Submission API
**Location:** Update existing `app/api/applications/route.js`

- Add support for `screening_answers` in request body
- Store answers in `application_screening_answers` table
- Validate required questions are answered

---

### Phase 2: Admin UI - Question Template Management (Priority 2)

#### 2.1 Question Templates Page
**Location:** `app/admin/settings/question-templates/page.js`

**Features:**
- List all question templates (table view)
- Search/filter templates
- Usage count and last used date
- Create new template button
- Edit/Delete actions
- Preview question as it appears to applicants

#### 2.2 Question Template Form
**Location:** `app/admin/settings/question-templates/[id]/page.js` (or modal)

**Form Fields:**
- Title (internal name)
- Question Text
- Question Type (dropdown)
- Options (conditionally shown for multiple_choice/checkbox)
- Required toggle
- Placeholder text
- Help text
- Active/Inactive toggle

**Question Type Components:**
- Text input
- Textarea
- Multiple choice (radio buttons)
- Checkboxes (multi-select)
- Yes/No (toggle or radio)
- File upload
- Date picker

---

### Phase 3: Admin UI - Job Creation/Editing (Priority 3)

#### 3.1 Update Job Creation Form
**Location:** `app/admin/jobs/new/page.js`

**Changes:**
- Add **Application Type** selector (Quick/Full) in Step 1
- If "Full" selected, add **Step 2: Screening Questions**
- Step 2 UI includes:
  - "Add from Template" button → Opens template selector modal
  - "Create Custom Question" button → Opens question form
  - List of added questions (drag-to-reorder with react-beautiful-dnd or similar)
  - Edit/Delete buttons for each question
  - Preview mode

#### 3.2 Update Job Editing Form
**Location:** `app/admin/jobs/[id]/page.js`

**Changes:**
- Show application type (with ability to change with warning)
- If type is "Full", show screening questions section
- **Warning modal** when editing questions if job has applicants:
  - "This job has X applicants. Editing questions may result in inconsistent data."
  - "Continue" / "Cancel" buttons

#### 3.3 Job Settings Section
**Location:** Add new section in job details

**Features:**
- Toggle between Quick/Full application type
- If changing from Full → Quick with existing questions, show warning
- If changing from Quick → Full with existing applicants, show info message

---

### Phase 4: Public UI - Application Flow (Priority 4)

#### 4.1 Job Listing Page
**Location:** `app/jobs/[slug]/page.js`

**Changes:**
- Check `application_type` from job data
- If "quick", show existing inline form
- If "full", change "Apply Now" button to link to `/jobs/[slug]/apply`

#### 4.2 Full Application Page (NEW)
**Location:** `app/jobs/[slug]/apply/page.js`

**Layout:**
```
┌─────────────────────────────────────┐
│  Job Title                          │
│  Company Name                       │
├─────────────────────────────────────┤
│  Application Form                   │
│  ├─ Name (pre-filled if logged in) │
│  ├─ Email (pre-filled)              │
│  ├─ Phone                           │
│  ├─ Resume Upload (pre-filled)      │
│  ├─ Cover Letter                    │
│  │                                   │
│  ├─ Screening Questions Header      │
│  ├─ Question 1                      │
│  ├─ Question 2                      │
│  ├─ ...                             │
│  │                                   │
│  └─ Submit Application Button       │
└─────────────────────────────────────┘
```

**Features:**
- Fetch screening questions via API
- Dynamically render question components based on type
- Show required indicators (*)
- Client-side validation
- Pre-fill user data if logged in
- Submit all data together
- Success/error handling
- Redirect to success page or show confirmation

#### 4.3 Question Type Renderers
**Create reusable components:** `app/components/ScreeningQuestions/`

- `TextQuestion.js`
- `TextareaQuestion.js`
- `MultipleChoiceQuestion.js`
- `CheckboxQuestion.js`
- `YesNoQuestion.js`
- `FileUploadQuestion.js`
- `DateQuestion.js`

Each component:
- Accepts question data as props
- Handles its own validation
- Returns answer in consistent format

---

### Phase 5: Admin UI - Viewing Responses (Priority 5)

#### 5.1 Candidate Detail Page
**Location:** `app/applications-manager/candidate/[id]/page.js`

**Changes:**
- Add **Screening Answers** section (after basic info, before background checks)
- Display questions and answers in clean format
- Handle different answer types appropriately
- Show file download links for file uploads
- Empty state if no screening questions for this job

#### 5.2 Applications Pipeline View (Optional)
**Location:** `app/applications-manager/page.js`

**Potential Enhancement:**
- Show screening answer count badge
- Quick preview of key answers in hover tooltip
- Filter by specific screening answer criteria

---

## Implementation Order

### Week 1: Backend & Database
1. ✅ Create SQL migration
2. Run migration and generate Prisma client
3. Create all API routes for templates
4. Create all API routes for job questions
5. Update application submission API
6. Test all APIs with Postman/Thunder Client

### Week 2: Admin UI - Templates
1. Create question templates list page
2. Create template form (create/edit)
3. Add template selector component
4. Test template CRUD operations

### Week 3: Admin UI - Job Management
1. Update job creation form (add application type + Step 2)
2. Add question management UI to job editing
3. Implement drag-to-reorder functionality
4. Add warning modals for editing published jobs
5. Test full job creation flow

### Week 4: Public UI - Application Flow
1. Update job listing page to detect application type
2. Create full application page (`/jobs/[slug]/apply`)
3. Create all question type components
4. Implement form submission with screening answers
5. Test application flow end-to-end

### Week 5: Viewing & Polish
1. Add screening answers section to candidate detail page
2. Test with various question types and answers
3. Handle edge cases (deleted questions, edited questions, etc.)
4. Add loading states, error handling
5. Mobile responsiveness
6. Final QA and bug fixes

---

## Key Technical Decisions

### 1. Question Type Storage
- Store as ENUM in database for validation
- Supported types: `text`, `textarea`, `multiple_choice`, `checkbox`, `yes_no`, `file_upload`, `date`

### 2. Options Storage (for multiple choice/checkbox)
- Store as JSONB array: `["Option 1", "Option 2", "Option 3"]`
- Allows flexible number of options
- Easy to query and update

### 3. Answer Storage
- `answer_text` for simple answers (text, textarea, yes_no, date)
- `answer_json` for complex answers (checkbox selections, multiple_choice index)
- `file_url` and `file_name` for uploads
- Store original question text for historical accuracy

### 4. Question Reordering
- Use `sort_order` integer field
- When reordering, update all questions in one transaction
- Gaps in numbering are OK (e.g., 10, 20, 30 instead of 1, 2, 3)

### 5. File Uploads for Screening Questions
- Upload to same storage as resumes
- Store URL in `file_url` field
- Naming convention: `screening-answers/{application_id}/{question_id}/{filename}`

### 6. Editing Published Jobs
- Allow editing with warning
- Store original question text in answers table
- If question is deleted, answers remain (orphaned but preserved)

---

## Validation Rules

### Question Templates:
- Title: Required, max 255 chars
- Question text: Required
- Question type: Required, must be valid type
- Options: Required for multiple_choice/checkbox, must have at least 2 options

### Job Screening Questions:
- Same as templates
- sort_order: Must be unique per job
- At least 1 question required for "Full" application type jobs

### Application Answers:
- Required questions must have answers
- Validate answer format matches question type
- File uploads must be under size limit (use existing resume upload limit)

---

## UI/UX Considerations

### Admin Side:
- Use drag handles for reordering questions
- Show preview of how question appears to applicants
- Quick actions: duplicate question, delete, edit
- Template selector with search and previews
- Unsaved changes warning when navigating away

### Applicant Side:
- Progress indicator if many questions (e.g., "Question 3 of 8")
- Save draft functionality? (Optional, future enhancement)
- Clear error messages for validation
- Mobile-friendly form controls
- Responsive layout for all question types

---

## Testing Checklist

### Backend:
- [ ] Create question template
- [ ] Edit question template
- [ ] Delete question template (soft delete)
- [ ] Add question to job from template
- [ ] Add custom question to job
- [ ] Reorder questions
- [ ] Edit job question (with existing applicants)
- [ ] Delete job question
- [ ] Submit application with screening answers
- [ ] Validate required questions
- [ ] Handle file uploads in screening answers

### Admin UI:
- [ ] Create/edit/delete templates
- [ ] Create "Quick Apply" job
- [ ] Create "Full" job with screening questions
- [ ] Add questions from templates
- [ ] Add custom questions
- [ ] Reorder questions via drag-drop
- [ ] Edit questions on published job (see warning)
- [ ] Change job from Quick → Full
- [ ] Change job from Full → Quick (with warning)
- [ ] View screening answers in candidate detail page

### Public UI:
- [ ] Apply to "Quick Apply" job (existing flow)
- [ ] Apply to "Full" job via dedicated page
- [ ] Answer all question types correctly
- [ ] Validation for required questions
- [ ] File upload in screening question
- [ ] Pre-filled data when logged in
- [ ] Mobile responsive application form

---

## Future Enhancements (Not in Scope Now)

1. **Conditional Questions** - Show question B only if answer to question A is X
2. **Question Analytics** - Track which questions correlate with hired candidates
3. **Bulk Import Questions** - Import from CSV/Excel
4. **Question Categories** - Group questions (Experience, Education, Skills, etc.)
5. **Score Screening Answers** - Auto-score answers and flag promising candidates
6. **Application Draft Saving** - Allow applicants to save and resume later
7. **Custom Validation Rules** - Regex patterns, min/max length, etc.

---

## Notes & Considerations

- All screening questions features should be privilege-protected (admin only)
- Audit logging should track question template creation/editing
- Consider rate limiting on application submissions
- File uploads should be scanned for malware (if not already implemented)
- GDPR compliance: screening answers should be deleted when application is deleted

---

## Questions to Revisit

1. Should we allow duplicating entire question sets from one job to another?
2. Should templates be global or per-user/per-team?
3. Do we need question categories/tags for organization?
4. Should we limit max number of questions per job?

