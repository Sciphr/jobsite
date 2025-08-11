# JobSite API v1 Documentation

## Overview

This comprehensive external API provides full CRUD operations for jobs, applications, and users. The API uses API key authentication and includes features like filtering, pagination, sorting, and rate limiting.

## Base URL
```
https://yourdomain.com/api/v1
```

## Authentication

All API endpoints require authentication using API keys. Include your API key in the Authorization header:

```
Authorization: Bearer sk_live_your_api_key_here
```

### API Key Permissions

API keys require specific permissions for different operations:
- `applications:read` - Read applications
- `applications:create` - Create applications  
- `applications:update` - Update applications
- `applications:delete` - Delete applications
- `jobs:read` - Read jobs
- `jobs:create` - Create jobs
- `jobs:update` - Update jobs
- `jobs:delete` - Delete jobs
- `users:read` - Read users
- `users:create` - Create users
- `users:update` - Update users
- `users:delete` - Delete users

## Rate Limiting

API requests are rate limited based on your API key configuration (default: 1000 requests per hour).

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Your rate limit
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: When the rate limit resets

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "data": {
    // Response data here
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0"
}
```

### Error Response
```json
{
  "error": {
    "code": 400,
    "message": "Error description",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Paginated Response
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

# Applications API

## Endpoints

### GET /api/v1/applications
List all applications with filtering and pagination.

**Required Permission**: `applications:read`

**Query Parameters:**
- `limit` (int, 1-100): Number of results to return (default: 20)
- `offset` (int): Number of results to skip (default: 0)
- `status` (string): Filter by status (`Applied`, `Screening`, `Interview`, `Offer`, `Hired`, `Rejected`, `Withdrawn`)
- `stage` (string): Filter by stage (`Applied`, `Reviewing`, `Phone Screen`, `Technical Interview`, `Final Interview`, `Offer Extended`, `Hired`, `Rejected`)
- `job_id` (uuid): Filter by specific job ID
- `user_id` (uuid): Filter by specific user ID
- `applied_from` (ISO date): Filter applications from date
- `applied_to` (ISO date): Filter applications to date
- `created_from` (ISO date): Filter by creation date from
- `created_to` (ISO date): Filter by creation date to
- `name_contains` (string): Search in candidate name
- `email_contains` (string): Search in candidate email
- `include_archived` (boolean): Include archived applications (default: false)
- `search` (string): Search in candidate name and email

**Response:**
```json
{
  "data": {
    "applications": [
      {
        "id": "uuid",
        "status": "Applied",
        "stage": "Applied", 
        "candidate": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "job": {
          "id": "uuid",
          "title": "Software Engineer",
          "slug": "software-engineer",
          "department": "Engineering",
          "location": "Remote",
          "status": "Published",
          "employmentType": "Full-time",
          "remotePolicy": "Remote"
        },
        "application": {
          "coverLetter": "...",
          "resumeUrl": "https://...",
          "notes": "...",
          "appliedAt": "2025-01-15T10:00:00Z",
          "updatedAt": "2025-01-15T10:00:00Z"
        },
        "tracking": {
          "currentStageEnteredAt": "2025-01-15T10:00:00Z",
          "timeInCurrentStageSeconds": 86400,
          "totalApplicationTimeSeconds": 259200
        },
        "archived": {
          "isArchived": false,
          "archivedAt": null,
          "archiveReason": null
        }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### GET /api/v1/applications/{id}
Get specific application by ID.

**Required Permission**: `applications:read`

### POST /api/v1/applications
Create a new job application.

**Required Permission**: `applications:create`

**Request Body:**
```json
{
  "jobId": "uuid",
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "coverLetter": "...",
  "resumeUrl": "https://...",
  "notes": "..."
}
```

### PUT /api/v1/applications/{id}
Update specific application.

**Required Permission**: `applications:update`

**Request Body** (all fields optional):
```json
{
  "status": "Interview",
  "stage": "Technical Interview",
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com", 
    "phone": "+1234567890"
  },
  "coverLetter": "...",
  "resumeUrl": "https://...",
  "notes": "...",
  "archived": {
    "isArchived": true,
    "reason": "Position filled"
  }
}
```

### DELETE /api/v1/applications/{id}
Delete specific application.

**Required Permission**: `applications:delete`

---

# Jobs API

## Endpoints

### GET /api/v1/jobs
List all jobs with filtering and pagination.

**Required Permission**: `jobs:read`

**Query Parameters:**
- `limit` (int, 1-100): Number of results to return (default: 20)
- `offset` (int): Number of results to skip (default: 0)
- `status` (string): Filter by status (`Published`, `Draft`, `Expired`)
- `department` (string): Filter by department
- `search` (string): Search in title and description
- `featured` (boolean): Filter featured jobs
- `employment_type` (string): Filter by employment type
- `remote_policy` (string): Filter by remote policy
- `experience_level` (string): Filter by experience level
- `salary_min` (number): Minimum salary filter
- `salary_max` (number): Maximum salary filter

**Response:**
```json
{
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "title": "Software Engineer",
        "slug": "software-engineer",
        "description": "...",
        "summary": "...",
        "department": "Engineering",
        "employmentType": "Full-time",
        "experienceLevel": "Mid Level",
        "location": "Remote",
        "remotePolicy": "Remote",
        "salary": {
          "min": 80000,
          "max": 120000,
          "currency": "USD",
          "type": "Annual",
          "showSalary": true
        },
        "benefits": "...",
        "requirements": "...",
        "preferredQualifications": "...",
        "educationRequired": "Bachelor's",
        "yearsExperienceRequired": 3,
        "status": "Published",
        "featured": true,
        "priority": 1,
        "viewCount": 150,
        "applicationCount": 25,
        "dates": {
          "createdAt": "2025-01-01T00:00:00Z",
          "updatedAt": "2025-01-15T10:00:00Z",
          "postedAt": "2025-01-01T12:00:00Z",
          "applicationDeadline": "2025-02-01T23:59:59Z",
          "startDate": "2025-02-15T00:00:00Z"
        },
        "category": {
          "name": "Engineering",
          "description": "Software development roles"
        },
        "createdBy": {
          "name": "Jane Smith",
          "email": "jane@company.com"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### GET /api/v1/jobs/{id}
Get specific job by ID.

**Required Permission**: `jobs:read`

### POST /api/v1/jobs
Create a new job.

**Required Permission**: `jobs:create`

**Request Body:**
```json
{
  "title": "Software Engineer",
  "description": "Job description...",
  "summary": "Brief summary...",
  "department": "Engineering",
  "employmentType": "Full-time",
  "experienceLevel": "Mid Level",
  "location": "Remote",
  "remotePolicy": "Remote",
  "salary": {
    "min": 80000,
    "max": 120000,
    "currency": "USD",
    "type": "Annual",
    "showSalary": true
  },
  "benefits": "Health, dental, 401k...",
  "requirements": "Required skills...",
  "preferredQualifications": "Nice to have skills...",
  "educationRequired": "Bachelor's",
  "yearsExperienceRequired": 3,
  "applicationDeadline": "2025-02-01T23:59:59Z",
  "startDate": "2025-02-15T00:00:00Z",
  "applicationInstructions": "How to apply...",
  "status": "Draft",
  "featured": false,
  "priority": 0,
  "categoryId": "uuid"
}
```

### PUT /api/v1/jobs/{id}
Update specific job.

**Required Permission**: `jobs:update`

### DELETE /api/v1/jobs/{id}
Delete specific job.

**Required Permission**: `jobs:delete`

**Note**: Jobs with applications cannot be deleted.

---

# Users API

## Endpoints

### GET /api/v1/users
List all users with filtering and pagination.

**Required Permission**: `users:read`

**Query Parameters:**
- `limit` (int, 1-100): Number of results to return (default: 20)
- `offset` (int): Number of results to skip (default: 0)
- `active` (boolean): Filter by active status
- `privilege_level` (int, 0-3): Filter by privilege level
- `search` (string): Search in name and email
- `role` (string): Filter by role name
- `created_from` (ISO date): Filter by creation date from
- `created_to` (ISO date): Filter by creation date to

**Response:**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "phone": "+1234567890",
        "isActive": true,
        "privilegeLevel": 1,
        "emailVerified": true,
        "avatar": "https://...",
        "bio": "Software engineer with 5 years experience",
        "location": "San Francisco, CA",
        "website": "https://johndoe.com",
        "linkedin": "https://linkedin.com/in/johndoe",
        "github": "https://github.com/johndoe",
        "roles": [
          {
            "id": "uuid",
            "name": "Developer",
            "description": "Software development role",
            "color": "blue",
            "assignedAt": "2025-01-01T00:00:00Z"
          }
        ],
        "stats": {
          "applicationCount": 5,
          "createdJobsCount": 10
        },
        "dates": {
          "createdAt": "2025-01-01T00:00:00Z",
          "updatedAt": "2025-01-15T10:00:00Z",
          "lastLoginAt": "2025-01-15T09:00:00Z",
          "emailVerifiedAt": "2025-01-01T00:30:00Z"
        }
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### GET /api/v1/users/{id}
Get specific user by ID with additional details.

**Required Permission**: `users:read`

**Response includes**:
- Full user details
- Recent applications (last 10)
- Recent created jobs (last 10)
- Complete statistics

### POST /api/v1/users
Create a new user.

**Required Permission**: `users:create`

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "isActive": true,
  "privilegeLevel": 0,
  "bio": "...",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com",
  "linkedin": "https://linkedin.com/in/johndoe",
  "github": "https://github.com/johndoe",
  "emailVerified": false,
  "roles": ["role-uuid-1", "role-uuid-2"]
}
```

### PUT /api/v1/users/{id}
Update specific user.

**Required Permission**: `users:update`

### DELETE /api/v1/users/{id}
Delete specific user.

**Required Permission**: `users:delete`

**Note**: Users with created jobs or applications cannot be deleted.

---

# Error Codes

## Common HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate resource)
- `429` - Rate limit exceeded
- `500` - Internal server error

## Common Error Messages

### Authentication Errors
```json
{
  "error": {
    "code": 401,
    "message": "API key required. Include 'Authorization: Bearer sk_live_...' header"
  }
}
```

### Permission Errors
```json
{
  "error": {
    "code": 403,
    "message": "Insufficient permissions. Required: applications:read"
  }
}
```

### Validation Errors
```json
{
  "error": {
    "code": 400,
    "message": "Missing required fields",
    "missingFields": ["email", "firstName"]
  }
}
```

### Rate Limit Errors
```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded"
  }
}
```

---

# Usage Examples

## Using cURL

### Get Applications
```bash
curl -X GET "https://yourdomain.com/api/v1/applications?limit=10&status=Applied" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json"
```

### Create Application
```bash
curl -X POST "https://yourdomain.com/api/v1/applications" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-uuid",
    "candidate": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "coverLetter": "I am interested in this position...",
    "resumeUrl": "https://example.com/resume.pdf"
  }'
```

### Update Job
```bash
curl -X PUT "https://yourdomain.com/api/v1/jobs/job-uuid" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Published",
    "featured": true
  }'
```

## Using JavaScript/Node.js

```javascript
const API_BASE = 'https://yourdomain.com/api/v1';
const API_KEY = 'sk_live_your_api_key_here';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// Get applications
const getApplications = async () => {
  const response = await fetch(`${API_BASE}/applications?status=Applied&limit=20`, {
    method: 'GET',
    headers
  });
  return await response.json();
};

// Create job
const createJob = async (jobData) => {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(jobData)
  });
  return await response.json();
};
```

## Using Python

```python
import requests

API_BASE = 'https://yourdomain.com/api/v1'
API_KEY = 'sk_live_your_api_key_here'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Get users
def get_users(limit=20, active=True):
    params = {'limit': limit, 'active': active}
    response = requests.get(f'{API_BASE}/users', headers=headers, params=params)
    return response.json()

# Update application
def update_application(app_id, data):
    response = requests.put(f'{API_BASE}/applications/{app_id}', 
                          headers=headers, json=data)
    return response.json()
```

---

# API Versioning

This API is version 1.0. Future versions will be available at `/api/v2/`, `/api/v3/`, etc.

All responses include a version header: `X-API-Version: 1.0`

# Support

For API support, please contact your system administrator or check the API key management interface in your admin panel for usage statistics and troubleshooting information.