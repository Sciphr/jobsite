"use client";

import { useState, useEffect } from "react";
import {
  Code,
  Play,
  Copy,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader,
  ExternalLink,
  Book,
  Zap,
  Database,
  Users,
  Briefcase,
  FileText
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';

const API_ENDPOINTS = {
  jobs: {
    icon: Briefcase,
    color: 'bg-blue-500',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/jobs',
        name: 'List Jobs',
        description: 'Retrieve a list of all jobs with optional filtering',
        params: [
          { name: 'limit', type: 'number', description: 'Number of jobs to return (max 100)', default: '20' },
          { name: 'offset', type: 'number', description: 'Number of jobs to skip', default: '0' },
          { name: 'status', type: 'string', description: 'Filter by status (Published, Draft, Expired)' },
          { name: 'department', type: 'string', description: 'Filter by department' },
          { name: 'search', type: 'string', description: 'Search in title and description' },
          { name: 'featured', type: 'boolean', description: 'Filter featured jobs (true/false)' }
        ],
        sampleResponse: {
          success: true,
          data: {
            jobs: [
              {
                id: "uuid",
                title: "Software Engineer",
                department: "Engineering",
                status: "Published",
                salary: { min: 80000, max: 120000, currency: "USD" }
              }
            ],
            pagination: { total: 50, limit: 20, offset: 0, hasMore: true }
          }
        }
      },
      {
        method: 'POST',
        path: '/api/v1/jobs',
        name: 'Create Job',
        description: 'Create a new job posting',
        requiredFields: ['title', 'description', 'department', 'employmentType', 'location', 'requirements', 'categoryId'],
        sampleBody: {
          title: "Senior Software Engineer",
          description: "We are looking for a senior software engineer...",
          department: "Engineering",
          employmentType: "Full-time",
          location: "Remote",
          requirements: "5+ years experience with React, Node.js",
          categoryId: "uuid-of-category",
          salary: { min: 90000, max: 130000, currency: "USD", type: "Annual" },
          status: "Draft"
        }
      },
      {
        method: 'GET',
        path: '/api/v1/jobs/{id}',
        name: 'Get Job',
        description: 'Retrieve a specific job by ID',
        params: [
          { name: 'id', type: 'string', description: 'Job ID', required: true }
        ]
      },
      {
        method: 'PUT',
        path: '/api/v1/jobs/{id}',
        name: 'Update Job',
        description: 'Update a specific job by ID',
        params: [
          { name: 'id', type: 'string', description: 'Job ID', required: true }
        ],
        sampleBody: {
          title: "Senior Software Engineer (Updated)",
          status: "Published",
          featured: true,
          salary: { min: 95000, max: 140000, currency: "USD", type: "Annual" }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/jobs/{id}',
        name: 'Delete Job',
        description: 'Delete a specific job by ID (jobs with applications cannot be deleted)',
        params: [
          { name: 'id', type: 'string', description: 'Job ID', required: true }
        ]
      }
    ]
  },
  users: {
    icon: Users,
    color: 'bg-green-500',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/users',
        name: 'List Users',
        description: 'Retrieve a list of all users',
        params: [
          { name: 'limit', type: 'number', description: 'Number of users to return', default: '20' },
          { name: 'offset', type: 'number', description: 'Number of users to skip', default: '0' },
          { name: 'role', type: 'string', description: 'Filter by user role' },
          { name: 'active', type: 'boolean', description: 'Filter by active status' }
        ]
      },
      {
        method: 'POST',
        path: '/api/v1/users',
        name: 'Create User',
        description: 'Create a new user account',
        requiredFields: ['email', 'firstName', 'lastName'],
        sampleBody: {
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          phone: "+1234567890",
          isActive: true,
          privilegeLevel: 0,
          bio: "Software engineer with 5 years experience",
          location: "San Francisco, CA"
        }
      },
      {
        method: 'GET',
        path: '/api/v1/users/{id}',
        name: 'Get User',
        description: 'Retrieve a specific user by ID with additional details',
        params: [
          { name: 'id', type: 'string', description: 'User ID', required: true }
        ]
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
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/users/{id}',
        name: 'Delete User',
        description: 'Delete a specific user by ID (users with created jobs or applications cannot be deleted)',
        params: [
          { name: 'id', type: 'string', description: 'User ID', required: true }
        ]
      }
    ]
  },
  applications: {
    icon: FileText,
    color: 'bg-purple-500',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/applications',
        name: 'List Applications',
        description: 'Retrieve a list of job applications',
        params: [
          { name: 'limit', type: 'number', description: 'Number of applications to return', default: '20' },
          { name: 'offset', type: 'number', description: 'Number of applications to skip', default: '0' },
          { name: 'status', type: 'string', description: 'Filter by status (Applied, Screening, Interview, Offer, Hired, Rejected, Withdrawn)' },
          { name: 'stage', type: 'string', description: 'Filter by stage (Applied, Reviewing, Phone Screen, Technical Interview, Final Interview, etc.)' },
          { name: 'job_id', type: 'string', description: 'Filter by job ID' },
          { name: 'user_id', type: 'string', description: 'Filter by user ID' },
          { name: 'search', type: 'string', description: 'Search in candidate name and email' },
          { name: 'include_archived', type: 'boolean', description: 'Include archived applications' }
        ]
      },
      {
        method: 'GET',
        path: '/api/v1/applications/{id}',
        name: 'Get Application',
        description: 'Retrieve a specific application by ID',
        params: [
          { name: 'id', type: 'string', description: 'Application ID', required: true }
        ]
      },
      {
        method: 'POST',
        path: '/api/v1/applications',
        name: 'Create Application',
        description: 'Submit a new job application',
        requiredFields: ['jobId', 'candidate.name', 'candidate.email'],
        sampleBody: {
          jobId: "uuid-of-job",
          candidate: {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+1234567890"
          },
          coverLetter: "I am interested in this position...",
          resumeUrl: "https://example.com/resume.pdf",
          notes: "Additional notes..."
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/applications/{id}',
        name: 'Update Application',
        description: 'Update a specific application by ID',
        params: [
          { name: 'id', type: 'string', description: 'Application ID', required: true }
        ],
        sampleBody: {
          status: "Interview",
          stage: "Technical Interview",
          candidate: {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+1234567890"
          },
          notes: "Updated notes...",
          archived: {
            isArchived: false,
            reason: ""
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/applications/{id}',
        name: 'Delete Application',
        description: 'Delete a specific application by ID',
        params: [
          { name: 'id', type: 'string', description: 'Application ID', required: true }
        ]
      }
    ]
  }
};

export default function APIClientInterface() {
  const [selectedSection, setSelectedSection] = useState('jobs');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keySelectionMode, setKeySelectionMode] = useState('dropdown'); // 'dropdown' or 'manual'
  const [requestParams, setRequestParams] = useState({});
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ jobs: true });

  // Fetch available API keys for the dropdown
  const { data: apiKeysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      return response.json();
    }
  });

  // Reset form when endpoint changes
  useEffect(() => {
    if (selectedEndpoint) {
      setRequestParams({});
      setRequestBody(selectedEndpoint.sampleBody ? JSON.stringify(selectedEndpoint.sampleBody, null, 2) : '');
      setResponse(null);
      setError(null);
    }
  }, [selectedEndpoint]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleParamChange = (paramName, value) => {
    setRequestParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const buildRequestUrl = () => {
    if (!selectedEndpoint) return '';

    // Replace path parameters (like {id}) with actual values
    let path = selectedEndpoint.path;
    const pathParams = path.match(/\{([^}]+)\}/g);

    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.slice(1, -1); // Remove { and }
        const paramValue = requestParams[paramName] || `{${paramName}}`;
        path = path.replace(param, paramValue);
      });
    }

    const baseUrl = `${window.location.origin}${path}`;
    const queryParams = new URLSearchParams();

    // Only add non-path parameters to query string
    Object.entries(requestParams).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && !pathParams?.some(p => p.includes(key))) {
        queryParams.append(key, value);
      }
    });

    return baseUrl + (queryParams.toString() ? `?${queryParams.toString()}` : '');
  };

  const executeRequest = async () => {
    if (!apiKey || !selectedEndpoint) {
      setError('Please select an API key and endpoint');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = buildRequestUrl();
      const options = {
        method: selectedEndpoint.method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (selectedEndpoint.method !== 'GET' && requestBody) {
        try {
          JSON.parse(requestBody); // Validate JSON
          options.body = requestBody;
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const generateCurlCommand = () => {
    if (!selectedEndpoint || !apiKey) return '';

    const url = buildRequestUrl();
    let curl = `curl -X ${selectedEndpoint.method} "${url}" \\\n`;
    curl += `  -H "Authorization: Bearer ${apiKey}" \\\n`;
    curl += `  -H "Content-Type: application/json"`;

    if (selectedEndpoint.method !== 'GET' && requestBody) {
      curl += ` \\\n  -d '${requestBody}'`;
    }

    return curl;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Code className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold admin-text">API Client Interface</h3>
          <p className="text-sm admin-text-light">Test and interact with your API endpoints directly from the admin panel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Endpoints */}
        <div className="lg:col-span-1 space-y-4">
          {/* API Key Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium admin-text mb-3">API Configuration</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium admin-text mb-1">API Key</label>
                <div className="space-y-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your full API key (sk_live_...)"
                    className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={showApiKey}
                        onChange={(e) => setShowApiKey(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="admin-text-light">Show key</span>
                    </label>
                    <div className="text-xs admin-text-light">
                      Keys: {apiKeysData?.apiKeys?.map(key => key.name).join(', ') || 'None'}
                    </div>
                  </div>
                </div>
                <p className="text-xs admin-text-light mt-1">
                  Enter the full API key from when you created it. We only store prefixes for security.
                </p>
              </div>

              <div className="text-xs admin-text-light">
                💡 Tip: Create API keys in the API Key Management section above
              </div>
            </div>
          </div>

          {/* Endpoints List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium admin-text">Available Endpoints</h4>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(API_ENDPOINTS).map(([key, section]) => {
                const IconComponent = section.icon;
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded ${section.color} text-white`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium admin-text capitalize">{key}</span>
                      </div>
                      {expandedSections[key] ?
                        <ChevronDown className="h-4 w-4 admin-text-light" /> :
                        <ChevronRight className="h-4 w-4 admin-text-light" />
                      }
                    </button>

                    {expandedSections[key] && (
                      <div className="bg-gray-50 dark:bg-gray-700/30">
                        {section.endpoints.map((endpoint, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedSection(key);
                              setSelectedEndpoint(endpoint);
                            }}
                            className={`w-full px-6 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors ${
                              selectedEndpoint === endpoint ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                                endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {endpoint.method}
                              </span>
                              <span className="text-xs admin-text">{endpoint.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Request/Response */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEndpoint ? (
            <>
              {/* Endpoint Details */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm px-3 py-1 rounded font-mono ${
                      selectedEndpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      selectedEndpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      selectedEndpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <h4 className="text-lg font-semibold admin-text">{selectedEndpoint.name}</h4>
                  </div>

                  <button
                    onClick={executeRequest}
                    disabled={loading || !apiKey}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    {loading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>Execute</span>
                  </button>
                </div>

                <p className="text-sm admin-text-light mb-4">{selectedEndpoint.description}</p>

                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-3 mb-4">
                  <code className="text-sm font-mono admin-text">{selectedEndpoint.path}</code>
                </div>

                {/* Parameters */}
                {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-sm font-medium admin-text mb-3">Parameters</h5>
                    <div className="space-y-3">
                      {selectedEndpoint.params.map((param) => {
                        const isPathParam = selectedEndpoint.path.includes(`{${param.name}}`);
                        return (
                          <div key={param.name} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-medium admin-text mb-1">
                                {param.name}
                                {param.required && <span className="text-red-500 ml-1">*</span>}
                                {isPathParam && (
                                  <span className="ml-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                    path
                                  </span>
                                )}
                              </label>
                              <input
                                type={param.type === 'number' ? 'number' : 'text'}
                                value={requestParams[param.name] || ''}
                                onChange={(e) => handleParamChange(param.name, e.target.value)}
                                placeholder={param.default || (isPathParam ? 'Enter ID...' : '')}
                                className={`w-full text-xs px-3 py-2 border rounded-md admin-bg admin-text focus:ring-2 focus:border-transparent ${
                                  isPathParam
                                    ? 'border-orange-300 dark:border-orange-600 focus:ring-orange-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                                }`}
                              />
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs admin-text-light">{param.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Request Body (for POST/PUT) */}
                {selectedEndpoint.method !== 'GET' && (
                  <div className="mb-6">
                    <h5 className="text-sm font-medium admin-text mb-3">Request Body (JSON)</h5>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={8}
                      className="w-full text-xs font-mono px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter JSON request body..."
                    />
                    {selectedEndpoint.requiredFields && (
                      <p className="text-xs admin-text-light mt-2">
                        Required fields: {selectedEndpoint.requiredFields.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Generated URL */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium admin-text mb-2">Generated URL</h5>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-3 flex items-center justify-between">
                    <code className="text-xs font-mono admin-text break-all">{buildRequestUrl()}</code>
                    <button
                      onClick={() => copyToClipboard(buildRequestUrl())}
                      className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <Copy className="h-4 w-4 admin-text-light" />
                    </button>
                  </div>
                </div>

                {/* cURL Command */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium admin-text mb-2">cURL Command</h5>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-3 flex items-start justify-between">
                    <pre className="text-xs font-mono admin-text whitespace-pre-wrap flex-1">{generateCurlCommand()}</pre>
                    <button
                      onClick={() => copyToClipboard(generateCurlCommand())}
                      className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <Copy className="h-4 w-4 admin-text-light" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Response */}
              {(response || error) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold admin-text mb-4">Response</h4>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">Error</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-2">{error}</p>
                    </div>
                  )}

                  {response && (
                    <div className="space-y-4">
                      {/* Status */}
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                          response.status >= 200 && response.status < 300 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          response.status >= 400 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          <span className="text-sm font-medium">{response.status} {response.statusText}</span>
                        </div>
                      </div>

                      {/* Response Body */}
                      <div>
                        <h5 className="text-sm font-medium admin-text mb-2">Response Body</h5>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-4">
                          <pre className="text-xs font-mono admin-text whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(response.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* No Endpoint Selected */
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Database className="h-12 w-12 admin-text-light mx-auto mb-4" />
              <h4 className="text-lg font-medium admin-text mb-2">Select an API Endpoint</h4>
              <p className="text-sm admin-text-light">Choose an endpoint from the left panel to start testing your API</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}