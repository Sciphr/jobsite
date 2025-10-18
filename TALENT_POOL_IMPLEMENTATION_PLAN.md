# Talent Pool & Internal Hiring Implementation Plan

## Overview
Add talent pool management and internal hiring capabilities to allow hiring managers to proactively source candidates and control job visibility.

---

## Features Summary

### 1. **Job Visibility Control**
- External Only (public - current default)
- Internal Only (authenticated company users)
- Both (hybrid)

### 2. **Talent Pool** (`/admin/talent-pool`)
- Browse all registered users
- Search by name, email, skills, location
- View application history
- Filter by availability, experience, account type

### 3. **Direct Outreach**
- Invite candidates to apply to specific jobs
- Add candidates directly to pipeline ("sourced")
- Track interactions and invitations

---

## Database Changes

### SQL Migration
**File:** `prisma/migrations/add_talent_pool_internal_hiring.sql`

**Run:**
```bash
psql -U your_username -d your_database -f prisma/migrations/add_talent_pool_internal_hiring.sql
npx prisma db pull
npx prisma generate
```

### New Fields on Existing Tables:

**jobs:**
- `visibility` - VARCHAR(20): 'external', 'internal', 'both'

**applications:**
- `source_type` - VARCHAR(20): 'applied', 'sourced', 'invited'
- `sourced_by` - UUID: Admin who sourced
- `sourced_at` - TIMESTAMP
- `invitation_sent_at` - TIMESTAMP
- `invitation_token` - VARCHAR(255)

**users:**
- `skills` - TEXT[]: Skill tags
- `bio` - TEXT: Professional bio
- `linkedin_url` - VARCHAR(500)
- `portfolio_url` - VARCHAR(500)
- `years_experience` - INT
- `current_company` - VARCHAR(255)
- `current_title` - VARCHAR(255)
- `location` - VARCHAR(255)
- `available_for_opportunities` - BOOLEAN
- `last_profile_update` - TIMESTAMP

### New Tables:

**talent_pool_interactions:**
- Tracks admin actions (viewed profile, sent invitation, etc.)
- Links admin → candidate → job
- Stores notes and metadata

**job_invitations:**
- Tracks invitation lifecycle (sent → viewed → applied/declined/expired)
- Unique token for invitation links
- Custom message from admin
- Expiration tracking

---

## Implementation Phases

### Phase 1: Database & Backend APIs

#### 1.1 Job Visibility
**Files to create/modify:**
- `app/api/admin/jobs/[id]/route.js` - Add visibility field
- `app/api/jobs/route.js` - Filter by visibility
- Update JobForm component

**Logic:**
```javascript
// Check if job is visible to current user
const canViewJob = (job, user) => {
  if (job.visibility === 'external') return true;
  if (job.visibility === 'both') return true;
  if (job.visibility === 'internal') {
    if (!user) return false;
    // Check if user has company email domain or LDAP account
    return isInternalUser(user);
  }
};

const isInternalUser = (user) => {
  // LDAP users are always internal
  if (user.account_type === 'ldap') return true;

  // Check email domain against company domains setting
  const companyDomains = getSystemSetting('company_domains', '').split(',');
  const userDomain = user.email.split('@')[1];
  return companyDomains.includes(userDomain);
};
```

#### 1.2 Talent Pool APIs
**Location:** `app/api/admin/talent-pool/`

**Endpoints:**
- `GET /api/admin/talent-pool` - List all candidates with filters
- `GET /api/admin/talent-pool/[id]` - Get candidate details + application history
- `POST /api/admin/talent-pool/[id]/invite` - Send job invitation
- `POST /api/admin/talent-pool/[id]/source` - Add directly to job pipeline
- `POST /api/admin/talent-pool/[id]/note` - Add private note
- `GET /api/admin/talent-pool/[id]/interactions` - Get interaction history

**Query params for listing:**
```javascript
{
  search: 'john doe',
  skills: ['javascript', 'react'],
  location: 'Toronto',
  availableOnly: true,
  accountType: 'ldap', // or 'local'
  hasResume: true,
  minExperience: 3,
  maxExperience: 10,
  page: 1,
  limit: 20
}
```

#### 1.3 Job Invitations APIs
**Location:** `app/api/invitations/`

**Endpoints:**
- `POST /api/admin/invitations` - Create invitation
- `GET /api/invitations/[token]` - Public endpoint to view invitation
- `POST /api/invitations/[token]/accept` - Accept invitation (creates application)
- `POST /api/invitations/[token]/decline` - Decline invitation

---

### Phase 2: Admin UI - Job Visibility

#### 2.1 Update Job Form
**File:** `app/admin/jobs/components/JobForm.js`

Add visibility selector:
```jsx
<div>
  <label className="block text-sm font-medium admin-text mb-2">
    Job Visibility
  </label>
  <select
    name="visibility"
    value={formData.visibility}
    onChange={handleChange}
    className="w-full px-3 py-2 border admin-border rounded-lg..."
  >
    <option value="external">External (Public)</option>
    <option value="internal">Internal (Company Only)</option>
    <option value="both">Both (Hybrid)</option>
  </select>
  <p className="text-sm admin-text-light mt-1">
    {visibilityDescription}
  </p>
</div>
```

#### 2.2 Update Job Listings
**File:** `app/admin/jobs/page.js`

Add visibility badge to job cards:
```jsx
{job.visibility === 'internal' && (
  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
    Internal Only
  </span>
)}
```

---

### Phase 3: Admin UI - Talent Pool

#### 3.1 Talent Pool Main Page
**File:** `app/admin/talent-pool/page.js`

**Features:**
- Search bar (name, email, skills)
- Advanced filters sidebar
  - Skills (multi-select with autocomplete)
  - Location
  - Experience level
  - Account type (LDAP/Local)
  - Has resume
  - Available for opportunities
- Results table/cards
  - Photo, name, title, location
  - Skills tags
  - Application count badge
  - Last activity date
  - Quick actions: View Profile, Invite to Job

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Talent Pool                      [Search...]   │
├──────────┬──────────────────────────────────────┤
│ Filters  │  Results (12 candidates)             │
│          │  ┌──────────────────────────────┐    │
│ □ Has    │  │ 👤 John Doe                  │    │
│   Resume │  │ Senior Developer • Toronto    │    │
│          │  │ [JS] [React] [Node]          │    │
│ □ LDAP   │  │ 3 applications • Active      │    │
│   Only   │  │ [View] [Invite to Job]       │    │
│          │  └──────────────────────────────┘    │
│ Location │  ┌──────────────────────────────┐    │
│ [____]   │  │ 👤 Jane Smith                │    │
│          │  │ ...                           │    │
│ Skills   │  └──────────────────────────────┘    │
│ [____]   │                                       │
└──────────┴──────────────────────────────────────┘
```

#### 3.2 Candidate Detail Page
**File:** `app/admin/talent-pool/[id]/page.js`

**Sections:**
- **Profile Header**
  - Name, title, location
  - Contact info (email, phone)
  - LinkedIn, portfolio links
  - Skills tags (editable by admin)

- **Bio/Summary**

- **Resume(s)**
  - List of uploaded resumes with download links

- **Application History**
  - All jobs applied to
  - Status of each application
  - Date applied
  - Link to view full application

- **Interaction History**
  - Timeline of admin actions
  - Notes added by admins
  - Invitations sent
  - When profile was viewed

- **Actions Sidebar**
  - Invite to Job (dropdown selector)
  - Source to Job (add directly to pipeline)
  - Send Email
  - Add Note

#### 3.3 Invite to Job Modal
**Component:** `app/admin/talent-pool/components/InviteToJobModal.js`

**Fields:**
- Job selector (dropdown of active jobs)
- Custom message (textarea)
- Expiration (default 7 days, adjustable)
- Send email immediately (checkbox)

**On submit:**
- Create job_invitation record
- Send email with unique invitation link
- Log interaction in talent_pool_interactions

---

### Phase 4: Public UI - Job Visibility

#### 4.1 Update Job Listings
**File:** `app/jobs/page.js`

Filter jobs based on visibility:
```javascript
const { data: session } = useSession();

// In API or component
const visibleJobs = jobs.filter(job => {
  if (job.visibility === 'external' || job.visibility === 'both') {
    return true;
  }
  if (job.visibility === 'internal' && session) {
    return isInternalUser(session.user);
  }
  return false;
});
```

Add badge for internal jobs:
```jsx
{job.visibility === 'internal' && (
  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
    🏢 Internal Only
  </span>
)}
```

#### 4.2 Job Detail Page Protection
**File:** `app/jobs/[slug]/page.js`

Add visibility check:
```javascript
// Server-side check
const session = await getServerSession();

if (job.visibility === 'internal' && !session) {
  redirect('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
}

if (job.visibility === 'internal' && session && !isInternalUser(session.user)) {
  notFound(); // 404 or "Not authorized" page
}
```

#### 4.3 Invitation Flow
**File:** `app/invitations/[token]/page.js`

**Public page showing:**
- Job details
- Custom message from admin
- "Apply Now" button (pre-fills application)
- Expiration notice
- Option to decline

**On apply:**
- Creates application with `source_type: 'invited'`
- Updates job_invitations status to 'applied'
- Sends confirmation to candidate and admin

---

### Phase 5: User Profile Enhancement

#### 5.1 Profile Settings Page
**File:** `app/profile/settings/page.js`

Add new fields for talent pool:
- Professional bio
- Current job title
- Current company
- Years of experience
- Skills (tag input)
- LinkedIn URL
- Portfolio URL
- Location
- Open to opportunities (toggle)

#### 5.2 Privacy Settings
Add control:
```jsx
<div className="flex items-center justify-between">
  <div>
    <h3>Visible in Talent Pool</h3>
    <p className="text-sm text-gray-600">
      Allow hiring managers to find your profile and send job invitations
    </p>
  </div>
  <input
    type="checkbox"
    checked={availableForOpportunities}
    onChange={(e) => updateProfile({ available_for_opportunities: e.target.checked })}
  />
</div>
```

---

## Email Templates

### 1. Job Invitation Email
**Subject:** You're invited to apply: {Job Title}

**Body:**
```
Hi {Candidate Name},

{Admin Name} from {Company} thinks you'd be a great fit for our {Job Title} position.

{Custom Message from Admin}

Learn more and apply: {Invitation Link}

This invitation expires on {Expiration Date}.

Best regards,
{Company Name}
```

### 2. Application Received (Invited Candidate)
**Subject:** Thanks for applying to {Job Title}

**Body:**
```
Hi {Candidate Name},

Thank you for applying to {Job Title}! We've received your application and will review it shortly.

You were invited by {Admin Name}, who will be notified that you've applied.

...
```

---

## Settings to Add

**System Settings** (in `/admin/settings`):

1. **company_domains**
   - Category: General
   - Type: Text
   - Description: "Comma-separated list of company email domains for internal candidate identification (e.g., mycompany.com,subsidiary.com)"
   - Default: ""

2. **talent_pool_enabled**
   - Category: Hiring
   - Type: Boolean
   - Description: "Enable talent pool and proactive sourcing features"
   - Default: true

3. **invitation_expiry_days**
   - Category: Hiring
   - Type: Number
   - Description: "Default number of days until job invitations expire"
   - Default: 7

4. **allow_internal_job_visibility**
   - Category: Jobs
   - Type: Boolean
   - Description: "Allow jobs to be marked as internal-only"
   - Default: true

---

## Permissions

Add new permissions:

**Resource:** `talent_pool`
**Actions:**
- `read` - View talent pool
- `invite` - Send job invitations
- `source` - Add candidates to pipeline
- `note` - Add notes to candidate profiles

**Resource:** `jobs`
**Actions:**
- `set_visibility` - Change job visibility (internal/external/both)

---

## Analytics & Reporting

### Metrics to Track:

**Talent Pool:**
- Total candidates in pool
- Candidates with resumes
- Internal vs external candidates
- Most common skills
- Profile completion rate

**Sourcing:**
- Invitations sent
- Invitation acceptance rate
- Sourced applications vs self-applied
- Time to hire (sourced vs applied)
- Top sourcing admins

**Internal Hiring:**
- Internal job applications
- Internal vs external application ratio
- Internal hire rate

---

## Implementation Timeline

### Week 1: Database & Core APIs
- ✅ Run SQL migration
- Create talent pool APIs
- Create job visibility logic
- Create invitation APIs

### Week 2: Admin UI - Job Visibility
- Update job form
- Update job listings
- Add visibility badges
- Test internal job access control

### Week 3: Admin UI - Talent Pool
- Create talent pool main page
- Build search and filters
- Create candidate detail page
- Implement invite modal

### Week 4: Public UI & Invitations
- Update job listings visibility
- Create invitation page
- Update user profile settings
- Email templates

### Week 5: Testing & Polish
- End-to-end testing
- Permission testing
- Email testing
- Analytics setup
- Documentation

---

## Security Considerations

1. **Internal Job Protection:**
   - Server-side validation of user domain/LDAP status
   - Don't expose internal job IDs in public APIs
   - Rate limit job listing queries

2. **Talent Pool Privacy:**
   - Only show candidates who opted in (`available_for_opportunities`)
   - Mask personal data in search results
   - Audit log all profile views
   - GDPR compliance (ability to opt out, data export)

3. **Invitations:**
   - Token-based with expiration
   - One-time use or tracked views
   - Rate limit invitation sending
   - Prevent invitation spam

4. **Data Access:**
   - Restrict talent pool to privileged admins only
   - Application history visible only to authorized users
   - Notes private to hiring team

---

## Testing Checklist

### Job Visibility:
- [ ] External jobs visible to all
- [ ] Internal jobs hidden from non-authenticated users
- [ ] Internal jobs hidden from external users
- [ ] Internal jobs visible to LDAP users
- [ ] Internal jobs visible to company domain users
- [ ] Both visibility shows to everyone

### Talent Pool:
- [ ] Search by name/email works
- [ ] Filter by skills works
- [ ] Filter by location works
- [ ] Filter by experience works
- [ ] Only opted-in users shown
- [ ] Application history displays correctly
- [ ] Resume download works

### Invitations:
- [ ] Send invitation creates record
- [ ] Email sent successfully
- [ ] Invitation link works
- [ ] Expired invitations rejected
- [ ] Apply via invitation creates application
- [ ] Source type correctly set
- [ ] Admin notified of acceptance

### Permissions:
- [ ] Non-admin can't access talent pool
- [ ] Users without permission can't invite
- [ ] Regular users can't see internal jobs

---

## Future Enhancements

1. **AI-Powered Matching**
   - Auto-suggest candidates for jobs
   - Skills matching algorithm
   - Resume parsing for auto-tagging

2. **Talent Pool Campaigns**
   - Bulk invite multiple candidates
   - Email drip campaigns
   - Talent nurturing sequences

3. **Employee Referral System**
   - Current employees refer candidates
   - Referral bonus tracking
   - Referral analytics

4. **Advanced Sourcing**
   - Boolean search syntax
   - Save search queries
   - Alert when new candidates match criteria

5. **Integration with LinkedIn**
   - Import candidate profiles
   - Auto-sync skills
   - Connection tracking

---

## Questions to Consider

1. **Should internal candidates see their application priority?**
   - Badge showing "Internal Candidate" on applications?

2. **Should sourced candidates get preferential treatment?**
   - Auto-advance to certain stage?
   - Different pipeline view?

3. **Should candidates be notified they're in talent pool?**
   - "Your profile is now visible to hiring managers"?

4. **Should there be candidate consent for talent pool?**
   - Opt-in vs opt-out approach?
   - Currently: opt-out (available_for_opportunities defaults to true)

5. **Should internal employees get early access to jobs?**
   - Post internally first, then externally after X days?

6. **Should there be anonymized talent pool browsing?**
   - Hide names until invitation sent?

---

This is a comprehensive feature that will significantly enhance your hiring workflow! Let me know which phase you'd like to start with.
