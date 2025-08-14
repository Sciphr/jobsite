// app/admin/settings/components/LogoUpload.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Download,
  Eye
} from "lucide-react";

export default function LogoUpload({ getButtonClasses, compact = false }) {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch current logo on component mount
  useEffect(() => {
    fetchCurrentLogo();
  }, []);

  const fetchCurrentLogo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/logo');
      const data = await response.json();
      
      if (response.ok && data.logoUrl) {
        setLogo({
          url: data.logoUrl,
          storagePath: data.storagePath
        });
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file type. Please upload JPG, PNG, WebP, or SVG images only.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }

    uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setLogo({
          url: data.logoUrl,
          storagePath: data.storagePath
        });
        setSuccess('Logo uploaded successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteLogo = async () => {
    if (!confirm('Are you sure you want to delete the current logo? This will revert to the default briefcase icon.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/logo', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setLogo(null);
        setSuccess('Logo deleted successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to delete logo');
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      setError('Failed to delete logo. Please try again.');
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
        <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold admin-text mb-2`}>Site Logo</h3>
        {!compact && (
          <p className="text-sm admin-text-light">
            Upload a custom logo to replace the default briefcase icon. Recommended size: 240x60px (4:1 ratio) for horizontal logos. Maximum file size: 5MB.
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

      {/* Current Logo Display */}
      {logo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`admin-card ${compact ? "p-3" : "p-4"} rounded-lg border`}
        >
          <div className={`flex items-start ${compact ? "space-x-3" : "space-x-4"}`}>
            <div className="flex-shrink-0">
              <img
                src={logo.url}
                alt="Current site logo"
                className={`${compact ? "h-12 w-12" : "h-16 w-16"} object-contain rounded-lg border border-gray-200`}
                onError={(e) => {
                  console.log('Logo image load error, retrying...', e);
                  // Try reloading the image after a brief delay
                  setTimeout(() => {
                    e.target.src = e.target.src + '?retry=' + Date.now();
                  }, 1000);
                  // Only show error after retry fails
                  setTimeout(() => {
                    if (e.target.complete && e.target.naturalHeight === 0) {
                      e.target.style.display = 'none';
                      setError('Failed to load logo image');
                    }
                  }, 3000);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`${compact ? "text-xs" : "text-sm"} font-medium admin-text`}>Current Logo</h4>
              {!compact && (
                <p className="text-xs admin-text-light mt-1 truncate">
                  {logo.storagePath}
                </p>
              )}
              <div className={`flex items-center space-x-2 ${compact ? "mt-2" : "mt-3"}`}>
                <button
                  onClick={() => window.open(logo.url, '_blank')}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  <span>View</span>
                </button>
                <button
                  onClick={deleteLogo}
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
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="text-center">
          <div className={`flex justify-center ${compact ? "mb-3" : "mb-4"}`}>
            {uploading ? (
              <RefreshCw className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-blue-600 animate-spin`} />
            ) : (
              <ImageIcon className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-gray-400`} />
            )}
          </div>
          
          <div className="space-y-2">
            <p className={`${compact ? "text-xs" : "text-sm"} admin-text`}>
              {uploading ? 'Uploading logo...' : (compact ? 'Drop logo or click to browse' : 'Drop your logo here or click to browse')}
            </p>
            {!compact && (
              <p className="text-xs admin-text-light">
                JPG, PNG, WebP, or SVG • Max 5MB • Recommended: 240x60px (4:1 ratio)
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
            <span>{logo ? 'Replace Logo' : 'Upload Logo'}</span>
          </motion.button>
        </div>
      </div>

      {/* Logo Guidelines - Only show in non-compact mode */}
      {!compact && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Logo Guidelines</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Recommended size: 240x60px (4:1 aspect ratio) for horizontal logos</li>
            <li>• Use high contrast colors for better visibility</li>
            <li>• SVG format is recommended for crisp scaling</li>
            <li>• The logo will be automatically resized to fit the header (60px height)</li>
            <li>• Square logos are also supported but may appear smaller</li>
          </ul>
        </div>
      )}
    </div>
  );
}