/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @returns {Object} Validation result
 */
export const validateImage = (file) => {
  // Allowed image types
  const validTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/svg+xml'
  ];
  
  // Max file size (5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  
  // Min file size (1KB)
  const minSize = 1 * 1024; // 1KB

  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file selected'
    };
  }

  // Check file type
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, GIF, WEBP, SVG)'
    };
  }

  // Check file size (max)
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size should be less than 5MB (Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`
    };
  }

  // Check file size (min)
  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File is too small'
    };
  }

  return { valid: true };
};

/**
 * Get image dimensions
 * @param {File} file - Image file
 * @returns {Promise<Object>} Image dimensions
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      // Clean up the object URL
      URL.revokeObjectURL(url);
      
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: (img.width / img.height).toFixed(2),
        orientation: img.width > img.height ? 'landscape' : 'portrait'
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image dimensions'));
    };
    
    img.src = url;
  });
};

/**
 * Compress image file
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<File>} Compressed image file
 */
export const compressImage = async (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        );

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          // Create new file from blob
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // Add metadata to file
          Object.defineProperty(compressedFile, 'compressionInfo', {
            value: {
              originalSize: file.size,
              compressedSize: blob.size,
              originalDimensions: { width: img.width, height: img.height },
              compressedDimensions: { width, height },
              compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1)
            },
            enumerable: false
          });

          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Calculate dimensions while maintaining aspect ratio
 * @param {number} originalWidth - Original width
 * @param {number} originalHeight - Original height
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Object} New dimensions
 */
export const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate aspect ratio
  const aspectRatio = originalWidth / originalHeight;

  // Scale down if width exceeds maxWidth
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Scale down if height exceeds maxHeight
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

/**
 * Convert file to base64
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if file is an image
 * @param {File} file - File to check
 * @returns {boolean} True if image
 */
export const isImage = (file) => {
  return file && file.type && file.type.startsWith('image/');
};

/**
 * Create image preview URL
 * @param {File} file - Image file
 * @returns {Promise<string>} Preview URL
 */
export const createPreview = async (file) => {
  if (!isImage(file)) {
    throw new Error('File is not an image');
  }
  return URL.createObjectURL(file);
};

/**
 * Revoke preview URL
 * @param {string} url - Preview URL to revoke
 */
export const revokePreview = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Get image orientation from EXIF data (if available)
 * @param {File} file - Image file
 * @returns {Promise<number>} Orientation
 */
export const getImageOrientation = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1); // Not a JPEG, assume normal orientation
        return;
      }
      
      const length = view.byteLength;
      let offset = 2;
      
      while (offset < length) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        
        if (marker === 0xFFE1) {
          if (view.getUint32(offset + 2, false) !== 0x45786966) {
            resolve(1);
            return;
          }
          
          const little = view.getUint16(offset + 8, false) === 0x4949;
          offset += 10;
          
          const tags = view.getUint16(offset, little);
          offset += 2;
          
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
              resolve(view.getUint16(offset + (i * 12) + 8, little));
              return;
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      
      resolve(1); // Default orientation
    };
    
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024)); // Read first 64KB for EXIF
  });
};