"use client";

import { useState, useEffect } from 'react';
import {
  Book,
  Key,
  Code,
  Globe,
  Shield,
  Zap,
  Copy,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function APIDocumentation() {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(null);
  const [baseUrl, setBaseUrl] = useState('https://your-domain.com');
  const [expandedEndpoints, setExpandedEndpoints] = useState({});

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const toggleEndpoint = (endpointId) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [endpointId]: !prev[endpointId]
    }));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'overview', name: 'Overview', icon: Book },
    { id: 'authentication', name: 'Authentication', icon: Key },
    { id: 'api-management', name: 'API Key Management', icon: Shield },
    { id: 'testing-interface', name: 'Built-in Testing', icon: Code },
    { id: 'jobs', name: 'Jobs API', icon: Briefcase },
    { id: 'users', name: 'Users API', icon: Users },
    { id: 'applications', name: 'Applications API', icon: FileText },
    { id: 'rate-limits', name: 'Rate Limits', icon: Clock },
    { id: 'errors', name: 'Error Handling', icon: AlertCircle }
  ];

  const endpoints = {
    jobs: [
      {
        method: 'GET',
        path: '/api/v1/jobs',
        name: 'List Jobs',
        description: 'Retrieve a paginated list of job postings',
        params: [
          { name: 'limit', type: 'number', description: 'Number of jobs to return (max 100)', default: '20' },
          { name: 'offset', type: 'number', description: 'Number of jobs to skip', default: '0' },
          { name: 'status', type: 'string', description: 'Filter by status (Published, Draft, Expired)' },
          { name: 'department', type: 'string', description: 'Filter by department' },
          { name: 'search', type: 'string', description: 'Search in title and description' },
          { name: 'featured', type: 'boolean', description: 'Filter featured jobs only' }
        ],
        sampleResponse: {
          success: true,
          jobs: [
            {
              id: "cm123abc",
              title: "Senior Software Engineer",
              description: "Join our engineering team...",
              department: "Engineering",
              location: "San Francisco, CA",
              status: "Published",
              salary_min: 120000,
              salary_max: 180000,
              is_featured: true,
              created_at: "2024-01-15T10:30:00Z",
              applications_count: 45
            }
          ],
          pagination: {
            total: 150,
            limit: 20,
            offset: 0,
            has_more: true
          }
        }
      },
      {
        method: 'POST',
        path: '/api/v1/jobs',
        name: 'Create Job',
        description: 'Create a new job posting',
        sampleBody: {
          title: "Senior Software Engineer",
          description: "We are looking for a Senior Software Engineer to join our team...",
          requirements: ["5+ years experience", "React expertise", "Node.js knowledge"],
          benefits: ["Health insurance", "401k", "Flexible hours"],
          department: "Engineering",
          location: "San Francisco, CA",
          status: "Published",
          salary_min: 120000,
          salary_max: 180000,
          is_featured: true,
          expires_at: "2024-06-30T23:59:59Z"
        },
        sampleResponse: {
          success: true,
          message: "Job created successfully",
          job: {
            id: "cm456def",
            title: "Senior Software Engineer",
            description: "We are looking for a Senior Software Engineer to join our team...",
            requirements: ["5+ years experience", "React expertise", "Node.js knowledge"],
            benefits: ["Health insurance", "401k", "Flexible hours"],
            department: "Engineering",
            location: "San Francisco, CA",
            status: "Published",
            salary_min: 120000,
            salary_max: 180000,
            is_featured: true,
            expires_at: "2024-06-30T23:59:59Z",
            created_at: "2024-01-22T10:30:00Z",
            updated_at: "2024-01-22T10:30:00Z",
            applications_count: 0
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/jobs/{id}',
        name: 'Get Job',
        description: 'Retrieve a specific job by ID',
        params: [
          { name: 'id', type: 'string', description: 'Job ID', required: true }
        ],
        sampleResponse: {
          success: true,
          job: {
            id: "cm123abc",
            title: "Senior Software Engineer",
            description: "Full job description here...",
            requirements: ["5+ years experience", "React expertise"],
            benefits: ["Health insurance", "401k"],
            department: "Engineering",
            location: "San Francisco, CA",
            status: "Published",
            salary_min: 120000,
            salary_max: 180000,
            is_featured: true,
            created_at: "2024-01-15T10:30:00Z",
            updated_at: "2024-01-20T14:22:00Z",
            applications_count: 45,
            created_by: {
              id: "user123",
              firstName: "John",
              lastName: "Doe"
            }
          }
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/jobs/{id}',
        name: 'Update Job',
        description: 'Update an existing job posting',
        params: [
          { name: 'id', type: 'string', description: 'Job ID', required: true }
        ],
        sampleBody: {
          title: "Senior Software Engineer (Updated)",
          description: "Updated job description...",
          status: "Published",
          salary_min: 130000,
          salary_max: 190000,
          is_featured: false
        },
        sampleResponse: {
          success: true,
          message: "Job updated successfully",
          job: {
            id: "cm123abc",
            title: "Senior Software Engineer (Updated)",
            description: "Updated job description...",
            requirements: ["5+ years experience", "React expertise"],
            benefits: ["Health insurance", "401k"],
            department: "Engineering",
            location: "San Francisco, CA",
            status: "Published",
            salary_min: 130000,
            salary_max: 190000,
            is_featured: false,
            created_at: "2024-01-15T10:30:00Z",
            updated_at: "2024-01-22T15:45:00Z",
            applications_count: 45
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/jobs/{id}',
        name: 'Delete Job',
        description: 'Delete a job posting (jobs with applications cannot be deleted)',
        params: [
          { name: 'id', type: 'string', description: 'Job ID', required: true }
        ],
        sampleResponse: {
          success: true,
          message: "Job deleted successfully"
        }
      }
    ],
    users: [
      {
        method: 'GET',
        path: '/api/v1/users',
        name: 'List Users',
        description: 'Retrieve a paginated list of users',
        params: [
          { name: 'limit', type: 'number', description: 'Number of users to return (max 100)', default: '20' },
          { name: 'offset', type: 'number', description: 'Number of users to skip', default: '0' },
          { name: 'role', type: 'string', description: 'Filter by privilege level' },
          { name: 'active', type: 'boolean', description: 'Filter by active status' },
          { name: 'search', type: 'string', description: 'Search in name and email' }
        ],
        sampleResponse: {
          success: true,
          users: [
            {
              id: "user123",
              email: "john.doe@company.com",
              firstName: "John",
              lastName: "Doe",
              phone: "+1234567890",
              privilegeLevel: "Hiring Manager",
              isActive: true,
              created_at: "2024-01-10T09:15:00Z",
              last_login: "2024-01-22T16:45:00Z"
            }
          ],
          pagination: {
            total: 89,
            limit: 20,
            offset: 0,
            has_more: true
          }
        }
      },
      {
        method: 'POST',
        path: '/api/v1/users',
        name: 'Create User',
        description: 'Create a new user account',
        sampleBody: {
          email: "jane.smith@company.com",
          firstName: "Jane",
          lastName: "Smith",
          phone: "+1987654321",
          privilegeLevel: "Hiring Manager",
          isActive: true,
          bio: "Experienced hiring manager with focus on engineering roles",
          location: "New York, NY"
        },
        sampleResponse: {
          success: true,
          message: "User created successfully",
          user: {
            id: "user456",
            email: "jane.smith@company.com",
            firstName: "Jane",
            lastName: "Smith",
            phone: "+1987654321",
            privilegeLevel: "Hiring Manager",
            isActive: true,
            bio: "Experienced hiring manager with focus on engineering roles",
            location: "New York, NY",
            created_at: "2024-01-22T11:30:00Z",
            updated_at: "2024-01-22T11:30:00Z",
            last_login: null
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/users/{id}',
        name: 'Get User',
        description: 'Retrieve a specific user by ID with additional details',
        params: [
          { name: 'id', type: 'string', description: 'User ID', required: true }
        ],
        sampleResponse: {
          success: true,
          user: {
            id: "user123",
            email: "john.doe@company.com",
            firstName: "John",
            lastName: "Doe",
            phone: "+1234567890",
            privilegeLevel: "Hiring Manager",
            isActive: true,
            bio: "Senior hiring manager specializing in technical recruitment",
            location: "San Francisco, CA",
            created_at: "2024-01-10T09:15:00Z",
            updated_at: "2024-01-20T14:30:00Z",
            last_login: "2024-01-22T16:45:00Z",
            jobs_created: 15,
            applications_managed: 234
          }
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/users/{id}',
        name: 'Update User',
        description: 'Update a specific user by ID',
        params: [
          { name: 'id', type: 'string', description: 'User ID', required: true }
        ],
        sampleBody: {
          firstName: "John",
          lastName: "Doe",
          phone: "+1234567890",
          isActive: true,
          bio: "Updated bio...",
          location: "New York, NY"
        },
        sampleResponse: {
          success: true,
          message: "User updated successfully",
          user: {
            id: "user123",
            email: "john.doe@company.com",
            firstName: "John",
            lastName: "Doe",
            phone: "+1234567890",
            privilegeLevel: "Hiring Manager",
            isActive: true,
            bio: "Updated bio...",
            location: "New York, NY",
            created_at: "2024-01-10T09:15:00Z",
            updated_at: "2024-01-22T15:20:00Z",
            last_login: "2024-01-22T16:45:00Z"
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/users/{id}',
        name: 'Delete User',
        description: 'Delete a specific user by ID (users with created jobs or applications cannot be deleted)',
        params: [
          { name: 'id', type: 'string', description: 'User ID', required: true }
        ],
        sampleResponse: {
          success: true,
          message: "User deleted successfully"
        }
      }
    ],
    applications: [
      {
        method: 'GET',
        path: '/api/v1/applications',
        name: 'List Applications',
        description: 'Retrieve a paginated list of job applications',
        params: [
          { name: 'limit', type: 'number', description: 'Number of applications to return (max 100)', default: '20' },
          { name: 'offset', type: 'number', description: 'Number to skip', default: '0' },
          { name: 'status', type: 'string', description: 'Filter by status (Applied, Screening, Interview, etc.)' },
          { name: 'job_id', type: 'string', description: 'Filter by specific job ID' },
          { name: 'user_id', type: 'string', description: 'Filter by applicant user ID' }
        ],
        sampleResponse: {
          success: true,
          applications: [
            {
              id: "app123",
              job_id: "cm123abc",
              user_id: "user456",
              status: "Interview",
              stage: "Technical Interview",
              applied_at: "2024-01-18T11:30:00Z",
              updated_at: "2024-01-20T15:22:00Z",
              job: {
                title: "Senior Software Engineer",
                department: "Engineering"
              },
              applicant: {
                firstName: "Jane",
                lastName: "Smith",
                email: "jane.smith@email.com"
              }
            }
          ],
          pagination: {
            total: 324,
            limit: 20,
            offset: 0,
            has_more: true
          }
        }
      },
      {
        method: 'POST',
        path: '/api/v1/applications',
        name: 'Create Application',
        description: 'Submit a new job application',
        sampleBody: {
          job_id: "cm123abc",
          user_id: "user789",
          cover_letter: "I am very interested in this position...",
          resume_url: "https://example.com/resume.pdf",
          status: "Applied",
          stage: "Applied"
        },
        sampleResponse: {
          success: true,
          message: "Application submitted successfully",
          application: {
            id: "app456",
            job_id: "cm123abc",
            user_id: "user789",
            cover_letter: "I am very interested in this position...",
            resume_url: "https://example.com/resume.pdf",
            status: "Applied",
            stage: "Applied",
            applied_at: "2024-01-22T14:30:00Z",
            updated_at: "2024-01-22T14:30:00Z",
            job: {
              title: "Senior Software Engineer",
              department: "Engineering"
            },
            applicant: {
              firstName: "Michael",
              lastName: "Johnson",
              email: "michael.johnson@email.com"
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/applications/{id}',
        name: 'Get Application',
        description: 'Retrieve a specific application by ID with full details',
        params: [
          { name: 'id', type: 'string', description: 'Application ID', required: true }
        ],
        sampleResponse: {
          success: true,
          application: {
            id: "app123",
            job_id: "cm123abc",
            user_id: "user456",
            cover_letter: "I am excited to apply for this Senior Software Engineer position...",
            resume_url: "https://example.com/resume.pdf",
            status: "Interview",
            stage: "Technical Interview",
            applied_at: "2024-01-18T11:30:00Z",
            updated_at: "2024-01-20T15:22:00Z",
            notes: "Strong technical background, moving to final round",
            job: {
              id: "cm123abc",
              title: "Senior Software Engineer",
              department: "Engineering",
              location: "San Francisco, CA"
            },
            applicant: {
              id: "user456",
              firstName: "Jane",
              lastName: "Smith",
              email: "jane.smith@email.com",
              phone: "+1987654321"
            }
          }
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/applications/{id}',
        name: 'Update Application',
        description: 'Update application status, stage, or notes',
        params: [
          { name: 'id', type: 'string', description: 'Application ID', required: true }
        ],
        sampleBody: {
          status: "Offer",
          stage: "Offer Extended",
          notes: "Excellent interview performance, extending offer"
        },
        sampleResponse: {
          success: true,
          message: "Application updated successfully",
          application: {
            id: "app123",
            job_id: "cm123abc",
            user_id: "user456",
            cover_letter: "I am excited to apply for this Senior Software Engineer position...",
            resume_url: "https://example.com/resume.pdf",
            status: "Offer",
            stage: "Offer Extended",
            applied_at: "2024-01-18T11:30:00Z",
            updated_at: "2024-01-22T16:45:00Z",
            notes: "Excellent interview performance, extending offer"
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/applications/{id}',
        name: 'Delete Application',
        description: 'Delete an application (typically only allowed for withdrawn applications)',
        params: [
          { name: 'id', type: 'string', description: 'Application ID', required: true }
        ],
        sampleResponse: {
          success: true,
          message: "Application deleted successfully"
        }
      }
    ]
  };

  const CodeBlock = ({ code, language = 'bash' }) => (
    <div className="relative">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">{language}</span>
          <button
            onClick={() => copyCode(code)}
            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copiedCode === code ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 text-sm text-gray-100 overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Code className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Asari RESTful API Reference</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                API v1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{section.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Overview</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The Asari API provides programmatic access to job postings, user management, and application tracking.
                    Built with REST principles, it offers a simple and predictable way to integrate with your systems.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Globe className="h-8 w-8 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">RESTful Design</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Standard HTTP methods (GET, POST, PUT, DELETE) with predictable URLs and JSON responses.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Shield className="h-8 w-8 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Secure Authentication</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      API key-based authentication with granular permissions and rate limiting for security.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Zap className="h-8 w-8 text-yellow-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">High Performance</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Optimized endpoints with pagination, filtering, and caching for fast response times.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Base URL</h3>
                  <code className="text-blue-800 dark:text-blue-200 font-mono">{baseUrl}/api/v1</code>
                </div>
              </div>
            )}

            {/* Authentication Section */}
            {activeSection === 'authentication' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    All API requests require authentication using API keys. Include your API key in the Authorization header.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Getting an API Key</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                    <li>Log in to your Asari account</li>
                    <li>Navigate to Admin → Settings → API Keys</li>
                    <li>Click "Generate New Key" and configure permissions</li>
                    <li>Copy the generated key (shown only once)</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Making Authenticated Requests</h3>
                  <CodeBlock
                    code={`curl -X GET "${baseUrl}/api/v1/jobs" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -H "Content-Type: application/json"`}
                    language="bash"
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="text-amber-800 dark:text-amber-200 font-medium">Security Note</h4>
                      <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                        Keep your API key secret. Never commit it to version control or expose it in client-side code.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Key Management Section */}
            {activeSection === 'api-management' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Key Management</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Asari provides a comprehensive API key management system with granular permissions,
                    usage tracking, and security features.
                  </p>
                </div>

                {/* Creating API Keys */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Creating API Keys</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Navigate to <strong>Admin → Settings → API Keys</strong> to manage your API keys.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Key Configuration Options</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Setting</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Options</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">Name</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Descriptive name for identification</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">e.g., "Mobile App", "Analytics Service"</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">Permissions</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Granular access control by resource and action</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">jobs:read, users:create, applications:*, etc.</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">Rate Limit</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Maximum requests per hour</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Default: 1,000/hour</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">Expiration</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Optional expiration date for temporary access</td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Never expires (default) or specific date</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Permission Categories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            <h5 className="font-medium text-blue-900 dark:text-blue-100">Jobs</h5>
                          </div>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• jobs:read - View job listings</li>
                            <li>• jobs:create - Create new jobs</li>
                            <li>• jobs:update - Modify jobs</li>
                            <li>• jobs:delete - Remove jobs</li>
                          </ul>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-5 w-5 text-green-600" />
                            <h5 className="font-medium text-green-900 dark:text-green-100">Users</h5>
                          </div>
                          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                            <li>• users:read - View user data</li>
                            <li>• users:create - Create users</li>
                            <li>• users:update - Modify users</li>
                            <li>• users:delete - Remove users</li>
                          </ul>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            <h5 className="font-medium text-purple-900 dark:text-purple-100">Applications</h5>
                          </div>
                          <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                            <li>• applications:read - View applications</li>
                            <li>• applications:create - Submit applications</li>
                            <li>• applications:update - Modify applications</li>
                            <li>• applications:delete - Remove applications</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Storage and Security */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Storage & Security</h3>
                  <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <h4 className="text-amber-800 dark:text-amber-200 font-medium">One-Time Display</h4>
                          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                            API keys are shown in full <strong>only once</strong> when created. Save them securely immediately.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">What We Store</h4>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Hashed key (bcrypt, 12 rounds)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Key prefix (sk_live_abc...)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Permissions & settings</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Usage statistics</span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">What We DON'T Store</h4>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <li className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Plain text API keys</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Recoverable key data</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Full keys after creation</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Tracking */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Tracking & Analytics</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Every API key includes comprehensive usage tracking:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">1,247</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Requests</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">89</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">This Month</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">1,000/hr</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Rate Limit</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Built-in Testing Interface Section */}
            {activeSection === 'testing-interface' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Built-in API Testing Interface</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Asari includes a powerful built-in API testing interface, eliminating the need for external tools like Postman or Insomnia.
                  </p>
                </div>

                {/* Feature Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Code className="h-8 w-8 text-blue-600" />
                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">No External Tools Required</h3>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200 mb-4">
                    Test all API endpoints directly within the Asari admin interface. Perfect for developers, system administrators, and anyone integrating with the API.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="font-medium text-blue-900 dark:text-blue-100 text-sm">✅ All Endpoints</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Jobs, Users, Applications</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="font-medium text-blue-900 dark:text-blue-100 text-sm">🔒 Secure Testing</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Real authentication</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="font-medium text-blue-900 dark:text-blue-100 text-sm">⚡ Live Data</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Test with real database</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="font-medium text-blue-900 dark:text-blue-100 text-sm">📱 Responsive</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Works on any device</div>
                    </div>
                  </div>
                </div>

                {/* How to Access */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How to Access</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                    <li>Log in to your Asari admin account</li>
                    <li>Navigate to <strong>Admin → Settings → API Keys</strong></li>
                    <li>Scroll down to find the <strong>"API Testing Interface"</strong> section</li>
                    <li>Enter your API key and start testing!</li>
                  </ol>
                </div>

                {/* Interface Features */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Interface Features</h3>
                  <div className="space-y-6">

                    {/* API Key Input */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">🔑 Secure API Key Input</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Enter your full API key with password field security and show/hide toggle.
                        </p>
                        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-2 font-mono text-xs">
                          <span className="text-gray-400">•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
                          <span className="ml-2 text-blue-600 cursor-pointer">👁️ Show key</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Available keys: Mobile App, Analytics Service, Integration Test
                        </p>
                      </div>
                    </div>

                    {/* Endpoint Selection */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">🎯 Smart Endpoint Selection</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-blue-900 dark:text-blue-100">Jobs</span>
                          </div>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• List Jobs</li>
                            <li>• Get Job Details</li>
                            <li>• Create Job</li>
                            <li>• Update Job</li>
                            <li>• Delete Job</li>
                          </ul>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-900 dark:text-green-100">Users</span>
                          </div>
                          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                            <li>• List Users</li>
                            <li>• Get User Details</li>
                            <li>• Create User</li>
                            <li>• Update User</li>
                            <li>• Delete User</li>
                          </ul>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            <span className="font-medium text-purple-900 dark:text-purple-100">Applications</span>
                          </div>
                          <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                            <li>• List Applications</li>
                            <li>• Get Application Details</li>
                            <li>• Create Application</li>
                            <li>• Update Application</li>
                            <li>• Delete Application</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Parameter Handling */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">⚙️ Dynamic Parameter Handling</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          The interface automatically detects and provides input fields for:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-3">Path Parameters</h5>
                            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Endpoint URL:</div>
                              <div className="bg-gray-50 dark:bg-gray-700 rounded border p-2 text-xs font-mono text-gray-900 dark:text-gray-100 mb-3">
                                /api/v1/jobs/<span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded text-gray-900">{`{id}`}</span>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  id <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="cm123abc"
                                  className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  readOnly
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Job ID</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-3">Query Parameters</h5>
                            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">limit</label>
                                <input
                                  type="number"
                                  placeholder="20"
                                  className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  readOnly
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Number of jobs to return (max 100)</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">status</label>
                                <select
                                  className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  disabled
                                >
                                  <option>Published</option>
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Filter by status</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Response Display */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">📊 Rich Response Display</h4>
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-green-400 text-sm font-medium">✅ 200 OK</span>
                            <span className="text-gray-400 text-xs">Response time: 142ms</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <pre className="text-green-400 text-sm overflow-x-auto">
{`{
  "success": true,
  "jobs": [
    {
      "id": "cm123abc",
      "title": "Senior Software Engineer",
      "department": "Engineering",
      "status": "Published",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Features */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">⚡ Real-time Features</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Live Data Testing</h5>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Test with your actual database. Create, read, update, and delete real records.
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">Permission Validation</h5>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Test your API key permissions in real-time. See exactly what your key can and cannot access.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Perfect For</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Code className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Developers</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Test API integrations before implementing in code
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Shield className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">System Admins</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Verify API key permissions and troubleshoot issues
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Business Users</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Understand API capabilities without technical tools
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Jobs API Section */}
            {activeSection === 'jobs' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Jobs API</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Manage job postings, search listings, and retrieve detailed job information.
                  </p>
                </div>

                {endpoints.jobs.map((endpoint, index) => {
                  const endpointId = `jobs-${endpoint.method}-${index}`;
                  const isExpanded = expandedEndpoints[endpointId];

                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Collapsible Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => toggleEndpoint(endpointId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {endpoint.method}
                            </span>
                            <code className="font-mono text-gray-900 dark:text-gray-100 text-sm">{endpoint.path}</code>
                            <span className="text-gray-600 dark:text-gray-400">-</span>
                            <span className="font-medium text-gray-900 dark:text-white">{endpoint.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{endpoint.description}</p>
                      </div>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                          {endpoint.params && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Parameters</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Default</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {endpoint.params.map((param, paramIndex) => (
                                      <tr key={paramIndex}>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">
                                          {param.name}
                                          {param.required && <span className="text-red-500 ml-1">*</span>}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{param.type}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{param.description}</td>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-500 dark:text-gray-400">{param.default || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {endpoint.sampleBody && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Request Body</h4>
                              <CodeBlock
                                code={JSON.stringify(endpoint.sampleBody, null, 2)}
                                language="json"
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Example Request</h4>
                            <CodeBlock
                              code={`curl -X ${endpoint.method} "${baseUrl}${endpoint.path}${endpoint.params && endpoint.method === 'GET' ? '?limit=10&status=Published' : ''}" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -H "Content-Type: application/json"${endpoint.sampleBody ? ` \\
  -d '${JSON.stringify(endpoint.sampleBody)}'` : ''}`}
                              language="bash"
                            />

                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Example Response</h4>
                            <CodeBlock
                              code={JSON.stringify(endpoint.sampleResponse, null, 2)}
                              language="json"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Users API Section */}
            {activeSection === 'users' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Users API</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Access user information, manage user accounts, and retrieve user statistics.
                  </p>
                </div>

                {endpoints.users.map((endpoint, index) => {
                  const endpointId = `users-${endpoint.method}-${index}`;
                  const isExpanded = expandedEndpoints[endpointId];

                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Collapsible Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => toggleEndpoint(endpointId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {endpoint.method}
                            </span>
                            <code className="font-mono text-gray-900 dark:text-gray-100 text-sm">{endpoint.path}</code>
                            <span className="text-gray-600 dark:text-gray-400">-</span>
                            <span className="font-medium text-gray-900 dark:text-white">{endpoint.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{endpoint.description}</p>
                      </div>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                          {endpoint.params && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Parameters</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Default</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {endpoint.params.map((param, paramIndex) => (
                                      <tr key={paramIndex}>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">
                                          {param.name}
                                          {param.required && <span className="text-red-500 ml-1">*</span>}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{param.type}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{param.description}</td>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-500 dark:text-gray-400">{param.default || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {endpoint.sampleBody && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Request Body</h4>
                              <CodeBlock
                                code={JSON.stringify(endpoint.sampleBody, null, 2)}
                                language="json"
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Example Request</h4>
                            <CodeBlock
                              code={`curl -X ${endpoint.method} "${baseUrl}${endpoint.path}${endpoint.params && endpoint.method === 'GET' ? '?limit=10&active=true' : ''}" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -H "Content-Type: application/json"${endpoint.sampleBody ? ` \\
  -d '${JSON.stringify(endpoint.sampleBody)}'` : ''}`}
                              language="bash"
                            />

                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Example Response</h4>
                            <CodeBlock
                              code={JSON.stringify(endpoint.sampleResponse, null, 2)}
                              language="json"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Applications API Section */}
            {activeSection === 'applications' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Applications API</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Track job applications, manage application status, and retrieve application analytics.
                  </p>
                </div>

                {endpoints.applications.map((endpoint, index) => {
                  const endpointId = `applications-${endpoint.method}-${index}`;
                  const isExpanded = expandedEndpoints[endpointId];

                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Collapsible Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => toggleEndpoint(endpointId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {endpoint.method}
                            </span>
                            <code className="font-mono text-gray-900 dark:text-gray-100 text-sm">{endpoint.path}</code>
                            <span className="text-gray-600 dark:text-gray-400">-</span>
                            <span className="font-medium text-gray-900 dark:text-white">{endpoint.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{endpoint.description}</p>
                      </div>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                          {endpoint.params && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Parameters</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Default</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {endpoint.params.map((param, paramIndex) => (
                                      <tr key={paramIndex}>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100">
                                          {param.name}
                                          {param.required && <span className="text-red-500 ml-1">*</span>}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{param.type}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{param.description}</td>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-500 dark:text-gray-400">{param.default || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {endpoint.sampleBody && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Request Body</h4>
                              <CodeBlock
                                code={JSON.stringify(endpoint.sampleBody, null, 2)}
                                language="json"
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Example Request</h4>
                            <CodeBlock
                              code={`curl -X ${endpoint.method} "${baseUrl}${endpoint.path}${endpoint.params && endpoint.method === 'GET' ? '?limit=10&status=Interview' : ''}" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -H "Content-Type: application/json"${endpoint.sampleBody ? ` \\
  -d '${JSON.stringify(endpoint.sampleBody)}'` : ''}`}
                              language="bash"
                            />

                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Example Response</h4>
                            <CodeBlock
                              code={JSON.stringify(endpoint.sampleResponse, null, 2)}
                              language="json"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rate Limits Section */}
            {activeSection === 'rate-limits' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rate Limits</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    API usage is limited to ensure fair access and system stability. Rate limits are applied per API key.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Default Limits</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">Requests per hour</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">1,000</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">Requests per day</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">10,000</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-900 dark:text-white">Concurrent requests</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">10</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rate Limit Headers</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Every API response includes headers to help you track your usage:
                  </p>
                  <CodeBlock
                    code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642678800
X-RateLimit-Used: 5`}
                    language="http"
                  />
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h4 className="text-red-800 dark:text-red-200 font-medium">Rate Limit Exceeded</h4>
                      <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                        When you exceed rate limits, you'll receive a 429 status code. Wait for the reset time or contact support for higher limits.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Handling Section */}
            {activeSection === 'errors' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Handling</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The API uses standard HTTP status codes and returns detailed error information in JSON format.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">HTTP Status Codes</h3>
                  <div className="space-y-3">
                    {[
                      { code: '200', name: 'OK', description: 'Request successful' },
                      { code: '201', name: 'Created', description: 'Resource created successfully' },
                      { code: '400', name: 'Bad Request', description: 'Invalid request parameters' },
                      { code: '401', name: 'Unauthorized', description: 'Invalid or missing API key' },
                      { code: '403', name: 'Forbidden', description: 'Insufficient permissions' },
                      { code: '404', name: 'Not Found', description: 'Resource not found' },
                      { code: '429', name: 'Too Many Requests', description: 'Rate limit exceeded' },
                      { code: '500', name: 'Internal Server Error', description: 'Server error occurred' }
                    ].map((status) => (
                      <div key={status.code} className="flex items-center space-x-4 py-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          status.code.startsWith('2') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          status.code.startsWith('4') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {status.code}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{status.name}</span>
                        <span className="text-gray-600 dark:text-gray-400">{status.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Error Response Format</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    All error responses follow a consistent format:
                  </p>
                  <CodeBlock
                    code={JSON.stringify({
                      "success": false,
                      "error": "Invalid API key format",
                      "code": "INVALID_API_KEY",
                      "details": {
                        "expected_format": "sk_live_...",
                        "provided": "invalid_key"
                      }
                    }, null, 2)}
                    language="json"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}