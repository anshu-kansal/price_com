import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context for upload management
const UploadContext = createContext();

// Custom hook to use upload context
export const useUploadContext = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadContext must be used within UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  // State for tracking uploads
  const [uploads, setUploads] = useState({}); // Store multiple uploads by ID
  const [uploadHistory, setUploadHistory] = useState([]); // History of all uploads
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Track upload progress
   * @param {string} id - Unique identifier for the upload
   * @param {Object} data - Upload data (file, progress, url, etc.)
   */
  const trackUpload = useCallback((id, data) => {
    setUploads(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...data,
        timestamp: new Date().toISOString()
      }
    }));
  }, []);

  /**
   * Add to upload history
   * @param {Object} uploadData - Data about the completed upload
   */
  const addToHistory = useCallback((uploadData) => {
    setUploadHistory(prev => [
      {
        id: Date.now(),
        ...uploadData,
        timestamp: new Date().toISOString()
      },
      ...prev
    ].slice(0, 50)); // Keep last 50 uploads
  }, []);

  /**
   * Clear upload for specific ID
   * @param {string} id - Upload ID to clear
   */
  const clearUpload = useCallback((id) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[id];
      return newUploads;
    });
  }, []);

  /**
   * Clear all uploads
   */
  const clearAllUploads = useCallback(() => {
    setUploads({});
  }, []);

  /**
   * Clear upload history
   */
  const clearHistory = useCallback(() => {
    setUploadHistory([]);
  }, []);

  // Context value with all states and functions
  const value = {
    uploads,
    uploadHistory,
    uploading,
    error,
    setUploading,
    setError,
    trackUpload,
    addToHistory,
    clearUpload,
    clearAllUploads,
    clearHistory
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};