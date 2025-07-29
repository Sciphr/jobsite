// app/admin/settings/components/FaviconUpload.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  Monitor, 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Download,
  Eye
} from "lucide-react";

export default function FaviconUpload({ getButtonClasses, compact = false }) {
  const [favicon, setFavicon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch current favicon on component mount
  useEffect(() => {
    fetchCurrentFavicon();
  }, []);

  const fetchCurrentFavicon = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/favicon');
      const data = await response.json();
      
      if (response.ok && data.faviconUrl) {
        setFavicon({
          url: data.faviconUrl,
          storagePath: data.storagePath
        });
      }
    } catch (error) {
      console.error('Error fetching favicon:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file type. Please upload ICO, PNG, or SVG files only.');
      return;
    }

    // Validate file size (1MB max)
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size too large. Maximum size is 1MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }

    uploadFavicon(file);
  };

  const uploadFavicon = async (file) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/favicon', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setFavicon({
          url: data.faviconUrl,
          storagePath: data.storagePath
        });
        setSuccess('Favicon uploaded successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to upload favicon');
      }
    } catch (error) {
      console.error('Error uploading favicon:', error);
      setError('Failed to upload favicon. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteFavicon = async () => {
    if (!confirm('Are you sure you want to delete the current favicon? This will revert to the default browser favicon.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/favicon', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setFavicon(null);
        setSuccess('Favicon deleted successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to delete favicon');
      }
    } catch (error) {
      console.error('Error deleting favicon:', error);
      setError('Failed to delete favicon. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {/* Header */}
      <div>
        <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold admin-text mb-2`}>Site Favicon</h3>
        {!compact && (
          <p className="text-sm admin-text-light">
            Upload a custom favicon to appear in browser tabs and bookmarks. Recommended size: 32x32px or 16x16px. Maximum file size: 1MB.
          </p>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800"
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </motion.div>
      )}

      {/* Current Favicon Display */}
      {favicon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`admin-card ${compact ? "p-3" : "p-4"} rounded-lg border`}
        >
          <div className={`flex items-start ${compact ? "space-x-3" : "space-x-4"}`}>
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={favicon.url}
                  alt="Current site favicon"
                  className={`${compact ? "h-6 w-6" : "h-8 w-8"} object-contain rounded border border-gray-200`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    setError('Failed to load favicon image');
                  }}
                />
                {/* Show preview in browser tab context */}
                {!compact && (
                  <div className="mt-2 flex items-center space-x-2 text-xs admin-text-light">
                    <Monitor className="h-3 w-3" />
                    <span>Browser tab preview</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`${compact ? "text-xs" : "text-sm"} font-medium admin-text`}>Current Favicon</h4>
              {!compact && (
                <p className="text-xs admin-text-light mt-1 truncate">
                  {favicon.storagePath}
                </p>
              )}
              <div className={`flex items-center space-x-2 ${compact ? "mt-2" : "mt-3"}`}>
                <button
                  onClick={() => window.open(favicon.url, '_blank')}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  <span>View</span>
                </button>
                <button
                  onClick={deleteFavicon}
                  disabled={deleting}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg ${compact ? "p-4" : "p-6"} transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="text-center">
          <div className={`flex justify-center ${compact ? "mb-3" : "mb-4"}`}>
            {uploading ? (
              <RefreshCw className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-blue-600 animate-spin`} />
            ) : (
              <Monitor className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-gray-400`} />
            )}
          </div>
          
          <div className="space-y-2">
            <p className={`${compact ? "text-xs" : "text-sm"} admin-text`}>
              {uploading ? 'Uploading favicon...' : (compact ? 'Drop favicon or click to browse' : 'Drop your favicon here or click to browse')}
            </p>
            {!compact && (
              <p className="text-xs admin-text-light">
                ICO, PNG, or SVG • Max 1MB • Recommended: 32x32px or 16x16px
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openFileDialog}
            disabled={uploading}
            className={`${compact ? "mt-3" : "mt-4"} flex items-center space-x-2 ${compact ? "px-3 py-2 text-sm" : "px-4 py-2"} rounded-lg transition-colors ${getButtonClasses("primary")} ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} />
            <span>{favicon ? 'Replace Favicon' : 'Upload Favicon'}</span>
          </motion.button>
        </div>
      </div>

      {/* Favicon Guidelines - Only show in non-compact mode */}
      {!compact && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Favicon Guidelines</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• ICO format supports multiple sizes (16x16, 32x32, 48x48)</li>
            <li>• PNG format should be 32x32px for best results</li>
            <li>• SVG format provides crisp scaling across all sizes</li>
            <li>• Use simple, recognizable shapes for small sizes</li>
            <li>• High contrast colors work better in browser tabs</li>
          </ul>
        </div>
      )}
    </div>
  );
}