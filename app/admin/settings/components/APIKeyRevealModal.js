"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, AlertTriangle, CheckCircle, Key, Download } from "lucide-react";

export default function APIKeyRevealModal({ apiKeyData, onClose, getButtonClasses }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadAsText = (text, filename) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold admin-text">API Key Created Successfully!</h2>
              <p className="text-sm admin-text-light">Your new API key has been generated</p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  ⚠️ Important: Save Your API Key Now
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• This is the only time you'll see the complete API key</li>
                  <li>• Store it securely in your application or password manager</li>
                  <li>• If you lose it, you'll need to generate a new one</li>
                  <li>• Never share this key publicly or commit it to version control</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Key Details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Key Name
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <span className="admin-text">{apiKeyData.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                API Key
              </label>
              <div className="relative">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border font-mono text-sm break-all">
                    {showKey ? apiKeyData.apiKey : apiKeyData.apiKey.replace(/./g, '•')}
                  </div>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(apiKeyData.apiKey)}
                    className={`p-3 border rounded-lg transition-colors ${
                      copied 
                        ? 'border-green-300 text-green-600 bg-green-50 dark:border-green-600 dark:text-green-400 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {copied && (
                  <div className="absolute -bottom-8 left-0 text-sm text-green-600 dark:text-green-400">
                    ✓ Copied to clipboard!
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Permissions
              </label>
              <div className="flex flex-wrap gap-2">
                {apiKeyData.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Rate Limit
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <span className="admin-text">{apiKeyData.rateLimit.toLocaleString()} requests per hour</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Quick Actions</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyToClipboard(apiKeyData.apiKey)}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Copy className="h-4 w-4" />
                <span>Copy Key</span>
              </button>
              <button
                onClick={() => downloadAsText(
                  `API Key Name: ${apiKeyData.name}\nAPI Key: ${apiKeyData.apiKey}\nRate Limit: ${apiKeyData.rateLimit} requests/hour\nPermissions: ${apiKeyData.permissions.join(', ')}\nCreated: ${new Date().toISOString()}`,
                  `${apiKeyData.name.replace(/\s+/g, '_').toLowerCase()}_api_key.txt`
                )}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Example Usage */}
          <div className="mb-6">
            <label className="block text-sm font-medium admin-text mb-2">
              Example Usage
            </label>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm">
{`curl -H "Authorization: Bearer ${apiKeyData.keyPrefix}" \\
     -H "Content-Type: application/json" \\
     https://yourdomain.com/api/v1/jobs`}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => copyToClipboard(apiKeyData.apiKey)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                copied ? 'bg-green-100 text-green-800 border border-green-300' : getButtonClasses("secondary")
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy API Key</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-lg ${getButtonClasses("primary")}`}
            >
              I've Saved My Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}