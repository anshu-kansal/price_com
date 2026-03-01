import { useState, useCallback } from 'react';
import { useUploadContext } from '../context/UploadContext';
import { validateImage, compressImage, getImageDimensions } from '../utils/imageUtils';

export const useUpload = () => {
  // Call hooks at the top level, unconditionally
  const uploadContext = useUploadContext();
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState(null);

  // Destructure after ensuring context exists
  const {
    setUploading,
    setError,
    trackUpload,
    addToHistory
  } = uploadContext;

  /**
   * Simulate upload progress
   * @param {Function} onProgress - Callback for progress updates
   */
  const simulateProgress = useCallback((onProgress) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 90) {
        setProgress(progress);
        if (onProgress) onProgress(progress);
      } else {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  /**
   * Main upload function
   * @param {File} file - The file to upload
   * @param {Object} options - Upload options (compress, maxWidth, etc.)
   * @returns {Promise<string>} - URL of uploaded image
   */
  const uploadImage = useCallback(async (file, options = {}) => {
    const {
      compress = true,
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.8,
      onProgress
    } = options;

    const uploadId = `upload_${Date.now()}`;
    
    try {
      // Reset states
      setUploading(true);
      setError(null);
      setLocalError(null);
      setProgress(0);

      // Track upload start
      trackUpload(uploadId, {
        file: file.name,
        size: file.size,
        type: file.type,
        status: 'starting'
      });

      // Validate image
      const validation = validateImage(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get image dimensions
      const dimensions = await getImageDimensions(file);
      trackUpload(uploadId, { dimensions, status: 'validated' });

      // Start progress simulation
      const cleanupProgress = simulateProgress(onProgress);

      // Compress image if needed
      let fileToUpload = file;
      if (compress) {
        fileToUpload = await compressImage(file, maxWidth, maxHeight, quality);
        trackUpload(uploadId, { 
          compressed: true,
          originalSize: file.size,
          compressedSize: fileToUpload.size,
          compressionRatio: ((file.size - fileToUpload.size) / file.size * 100).toFixed(1)
        });
      }

      // Simulate API call - Replace with actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response - in real app, this would be the URL from your server
      const uploadedUrl = URL.createObjectURL(fileToUpload);
      
      // Complete progress
      setProgress(100);
      if (onProgress) onProgress(100);
      
      // Track successful upload
      trackUpload(uploadId, { 
        url: uploadedUrl, 
        status: 'completed',
        progress: 100
      });

      // Add to history
      addToHistory({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: uploadedUrl,
        dimensions,
        compressed: compress,
        compressionRatio: file.size !== fileToUpload.size 
          ? ((file.size - fileToUpload.size) / file.size * 100).toFixed(1)
          : 0
      });

      cleanupProgress();
      setUploading(false);
      
      return uploadedUrl;

    } catch (err) {
      // Handle errors
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      setLocalError(errorMessage);
      
      trackUpload(uploadId, { 
        status: 'failed', 
        error: errorMessage 
      });
      
      setUploading(false);
      throw err;
    }
  }, [setUploading, setError, trackUpload, addToHistory, simulateProgress]);

  /**
   * Upload multiple images
   * @param {File[]} files - Array of files to upload
   * @param {Object} options - Upload options
   * @returns {Promise<string[]>} - Array of uploaded URLs
   */
  const uploadMultiple = useCallback(async (files, options = {}) => {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const url = await uploadImage(file, options);
        results.push(url);
      } catch (err) {
        errors.push({ file: file.name, error: err.message });
      }
    }

    if (errors.length > 0) {
      console.warn('Some uploads failed:', errors);
    }

    return results;
  }, [uploadImage]);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError('Upload cancelled');
  }, [setUploading, setError]);

  return {
    uploadImage,
    uploadMultiple,
    cancelUpload,
    progress,
    uploading: uploadContext.uploading,
    error: localError || uploadContext.error
  };
};