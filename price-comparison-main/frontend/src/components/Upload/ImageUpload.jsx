import React, { useState, useCallback, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useUpload } from '../../hooks/useUpload';
import { Upload, X, Check, AlertCircle, Loader } from 'lucide-react';

const ImageUpload = ({ 
  onImageUpload, 
  currentImage, 
  className = '',
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  showPreview = true,
  showInfo = true,
  multiple = false,
  onError,
  onStart,
  onProgress
}) => {
  const { theme } = useTheme();
  const { uploadImage, uploading, progress, error } = useUpload();
  
  const [previews, setPreviews] = useState(currentImage ? [currentImage] : []);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const inputRef = useRef(null);

  // Theme-based classes
  const getThemeClasses = () => {
    const base = 'border-2 border-dashed rounded-lg p-6 transition-all duration-300 cursor-pointer';
    
    if (theme === 'dark') {
      return `${base} ${
        dragActive 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-gray-700 hover:border-gray-600 bg-gray-900'
      }`;
    } else {
      return `${base} ${
        dragActive 
          ? 'border-indigo-500 bg-indigo-50' 
          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
      }`;
    }
  };

  const textClasses = theme === 'dark'
    ? 'text-gray-400'
    : 'text-gray-500';

  const iconClasses = theme === 'dark'
    ? 'text-indigo-400'
    : 'text-indigo-600';

  const successClasses = theme === 'dark'
    ? 'bg-green-500/20 text-green-400'
    : 'bg-green-100 text-green-600';

  const errorClasses = theme === 'dark'
    ? 'bg-red-500/20 text-red-400'
    : 'bg-red-100 text-red-600';

  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  /**
   * Handle file selection
   */
  const handleChange = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.target.files);
    handleFiles(files);
  }, []);

  /**
   * Process selected files
   */
  const handleFiles = useCallback(async (files) => {
    // Filter images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      const error = 'Please select image files only';
      setUploadError(error);
      if (onError) onError(error);
      return;
    }

    // Check file sizes
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      const error = `Some files exceed ${maxSize / (1024 * 1024)}MB`;
      setUploadError(error);
      if (onError) onError(error);
      return;
    }

    setUploadError(null);
    
    if (onStart) onStart();

    // Create previews
    const newPreviews = await Promise.all(
      imageFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      })
    );
    
    if (!multiple) {
      // Single file mode - replace existing previews
      setPreviews([newPreviews[0]]);
    } else {
      // Multiple files mode - append new previews
      setPreviews(prev => [...prev, ...newPreviews]);
    }

    try {
      // Upload files
      const uploadedUrls = await Promise.all(
        imageFiles.map(file => 
          uploadImage(file, {
            onProgress: (progress) => {
              if (onProgress) onProgress(progress);
            }
          })
        )
      );

      setUploadSuccess(true);
      
      // Callback with uploaded URLs
      if (onImageUpload) {
        if (multiple) {
          onImageUpload(uploadedUrls);
        } else {
          onImageUpload(uploadedUrls[0]);
        }
      }

      // Reset success state after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
      
    } catch (err) {
      setUploadError(err.message);
      if (onError) onError(err.message);
    }
  }, [multiple, maxSize, onImageUpload, onError, onStart, onProgress, uploadImage]);

  /**
   * Remove preview
   */
  const removePreview = useCallback((index) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  /**
   * Clear all previews
   */
  const clearAll = useCallback(() => {
    setPreviews([]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  /**
   * Open file dialog
   */
  const openFileDialog = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        className={getThemeClasses()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          multiple={multiple}
          className="hidden"
        />

        <div className="text-center">
          {uploading ? (
            // Uploading state
            <div className="space-y-3">
              <Loader className={`w-8 h-8 mx-auto animate-spin ${iconClasses}`} />
              <p className={`text-sm ${textClasses}`}>Uploading... {progress}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : uploadSuccess ? (
            // Success state
            <div className="space-y-3">
              <div className={`p-3 rounded-full inline-block mx-auto ${successClasses}`}>
                <Check className="w-8 h-8" />
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Upload successful!
              </p>
            </div>
          ) : uploadError ? (
            // Error state
            <div className="space-y-3">
              <div className={`p-3 rounded-full inline-block mx-auto ${errorClasses}`}>
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">
                {uploadError}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadError(null);
                }}
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            // Default state
            <>
              <Upload className={`w-8 h-8 mx-auto mb-2 ${iconClasses}`} />
              <p className={`text-sm ${textClasses}`}>
                Drag and drop or click to upload
              </p>
              <p className={`text-xs mt-1 ${textClasses}`}>
                PNG, JPG, GIF, WEBP up to {maxSize / (1024 * 1024)}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview Area */}
      {showPreview && previews.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium ${textClasses}`}>
              {multiple ? `${previews.length} image(s) selected` : 'Preview'}
            </p>
            {multiple && previews.length > 1 && (
              <button
                onClick={clearAll}
                className={`text-xs ${textClasses} hover:text-red-500 transition-colors`}
              >
                Clear all
              </button>
            )}
          </div>

          <div className={`grid gap-2 ${
            multiple ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' : 'grid-cols-1'
          }`}>
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className={`w-full ${
                    multiple ? 'h-20' : 'h-32'
                  } object-cover rounded-lg border-2 border-transparent group-hover:border-indigo-500 transition-all`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreview(index);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      {showInfo && (
        <div className={`mt-3 text-xs ${textClasses}`}>
          <p>• Recommended: Square image, at least 400x400 pixels</p>
          <p>• Max file size: {maxSize / (1024 * 1024)}MB</p>
          <p>• Supported formats: JPEG, PNG, GIF, WEBP</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;