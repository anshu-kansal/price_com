import React, { useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Crop, RotateCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
import ImageUpload from './ImageUpload'; // Changed from './ImageUpload' (same folder)

const UploadModal = ({ onClose, onUpload, currentImage = null }) => {
  const { theme } = useTheme();
  const [step, setStep] = useState('upload'); // upload, crop, preview
  const [uploadedImage, setUploadedImage] = useState(null);
  const [cropSettings, setCropSettings] = useState({
    zoom: 1,
    rotation: 0,
    crop: null
  });

  // Theme classes
  const modalClasses = theme === 'dark'
    ? 'bg-gray-900 border-gray-800'
    : 'bg-white border-gray-200';

  const headerClasses = theme === 'dark'
    ? 'border-gray-800'
    : 'border-gray-200';

  const textPrimaryClasses = theme === 'dark'
    ? 'text-white'
    : 'text-gray-900';

  const textSecondaryClasses = theme === 'dark'
    ? 'text-gray-400'
    : 'text-gray-500';

  const buttonClasses = theme === 'dark'
    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-700';

  const primaryButtonClasses = theme === 'dark'
    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  /**
   * Handle image upload
   */
  const handleImageUpload = useCallback((imageData) => {
    setUploadedImage(imageData);
    setStep('preview');
  }, []);

  /**
   * Handle crop/save
   */
  const handleSave = useCallback(() => {
    if (uploadedImage) {
      // Apply crop settings if needed
      onUpload(uploadedImage);
    }
  }, [uploadedImage, onUpload]);

  /**
   * Handle zoom in
   */
  const handleZoomIn = useCallback(() => {
    setCropSettings(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.1, 3)
    }));
  }, []);

  /**
   * Handle zoom out
   */
  const handleZoomOut = useCallback(() => {
    setCropSettings(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - 0.1, 0.5)
    }));
  }, []);

  /**
   * Handle rotate
   */
  const handleRotate = useCallback(() => {
    setCropSettings(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative max-w-2xl w-full rounded-xl border shadow-2xl ${modalClasses}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${headerClasses}`}>
          <div>
            <h3 className={`text-lg font-semibold ${textPrimaryClasses}`}>
              {step === 'upload' && 'Upload Profile Picture'}
              {step === 'preview' && 'Preview & Adjust'}
              {step === 'crop' && 'Crop Image'}
            </h3>
            <p className={`text-sm ${textSecondaryClasses}`}>
              {step === 'upload' && 'Choose an image to upload as your profile picture'}
              {step === 'preview' && 'Review your image before saving'}
              {step === 'crop' && 'Adjust the crop area'}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${buttonClasses}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'upload' && (
            <ImageUpload
              onImageUpload={handleImageUpload}
              currentImage={currentImage}
              showPreview={false}
              showInfo={true}
              maxSize={5 * 1024 * 1024}
            />
          )}

          {step === 'preview' && uploadedImage && (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={typeof uploadedImage === 'string' 
                    ? uploadedImage 
                    : uploadedImage.preview
                  }
                  alt="Preview"
                  className="w-full max-h-96 object-contain rounded-lg"
                  style={{
                    transform: `scale(${cropSettings.zoom}) rotate(${cropSettings.rotation}deg)`,
                    transition: 'transform 0.3s ease'
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleZoomOut}
                  className={`p-2 rounded-lg ${buttonClasses}`}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className={`text-sm ${textSecondaryClasses}`}>
                  {Math.round(cropSettings.zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className={`p-2 rounded-lg ${buttonClasses}`}
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRotate}
                  className={`p-2 rounded-lg ${buttonClasses}`}
                  title="Rotate"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setStep('crop')}
                  className={`p-2 rounded-lg ${buttonClasses}`}
                  title="Crop"
                >
                  <Crop className="w-5 h-5" />
                </button>
              </div>

              {/* Crop Preview (if cropping) */}
              {step === 'crop' && (
                <div className="mt-4">
                  <p className={`text-sm font-medium mb-2 ${textPrimaryClasses}`}>
                    Drag to adjust crop area
                  </p>
                  <div className="relative">
                    <img
                      src={typeof uploadedImage === 'string' 
                        ? uploadedImage 
                        : uploadedImage.preview
                      }
                      alt="Crop preview"
                      className="w-full h-64 object-cover rounded-lg cursor-move"
                      draggable="false"
                    />
                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-lg pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-500 bg-white/90 px-3 py-1 rounded-full text-sm">
                      Crop Area
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-4 border-t ${headerClasses}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${buttonClasses}`}
          >
            Cancel
          </button>
          
          {step !== 'upload' && (
            <button
              onClick={() => setStep('upload')}
              className={`px-4 py-2 rounded-lg transition-colors ${buttonClasses}`}
            >
              Back
            </button>
          )}
          
          {step === 'upload' ? (
            <button
              disabled={!uploadedImage}
              className={`px-4 py-2 rounded-lg transition-colors ${primaryButtonClasses} ${
                !uploadedImage ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSave}
              className={`px-6 py-2 rounded-lg transition-colors ${primaryButtonClasses} flex items-center gap-2`}
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;