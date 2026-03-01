import React, { useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUpload } from '../../hooks/useUpload';
import { Camera, User, Edit2, Check, X, Loader } from 'lucide-react';
import UploadModal from './UploadModal';

const ProfileImage = ({ 
  user, 
  size = 'md', 
  editable = false,
  showUploadButton = true,
  onImageChange,
  className = ''
}) => {
  const { theme } = useTheme();
  const { updateUser } = useAuth();
  const { uploadImage, uploading } = useUpload();
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.picture || null);
  const [hover, setHover] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Size classes mapping
  const sizeClasses = {
    xs: {
      container: 'w-6 h-6',
      text: 'text-xs',
      icon: 'w-3 h-3',
      button: 'w-4 h-4 -bottom-1 -right-1'
    },
    sm: {
      container: 'w-8 h-8',
      text: 'text-sm',
      icon: 'w-4 h-4',
      button: 'w-5 h-5 -bottom-1 -right-1'
    },
    md: {
      container: 'w-16 h-16',
      text: 'text-2xl',
      icon: 'w-6 h-6',
      button: 'w-6 h-6 -bottom-1 -right-1'
    },
    lg: {
      container: 'w-24 h-24',
      text: 'text-3xl',
      icon: 'w-8 h-8',
      button: 'w-7 h-7 -bottom-1 -right-1'
    },
    xl: {
      container: 'w-32 h-32',
      text: 'text-4xl',
      icon: 'w-10 h-10',
      button: 'w-8 h-8 -bottom-1 -right-1'
    }
  };

  /**
   * Get user initials for avatar
   */
  const getUserInitials = useCallback(() => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'GU';
  }, [user]);

  /**
   * Get avatar background color
   */
  const getAvatarColor = useCallback(() => {
    if (user?.plan === 'Pro Plan') {
      return 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600';
    }
    if (profileImage) return 'bg-transparent';
    if (user?.name) {
      // Generate consistent color based on name
      const colors = [
        'bg-blue-600',
        'bg-green-600',
        'bg-purple-600',
        'bg-red-600',
        'bg-yellow-600',
        'bg-indigo-600',
        'bg-pink-600',
        'bg-teal-600'
      ];
      const index = (user.name.length || 0) % colors.length;
      return colors[index];
    }
    return 'bg-gray-700';
  }, [user, profileImage]);

  /**
   * Handle image upload
   */
  const handleImageUpload = useCallback(async (imageData) => {
    if (imageData) {
      try {
        let imageUrl;
        
        if (typeof imageData === 'string') {
          // If it's already a URL
          imageUrl = imageData;
        } else if (imageData.file) {
          // Upload the file
          imageUrl = await uploadImage(imageData.file);
        } else if (imageData.preview) {
          // Use preview URL (for demo)
          imageUrl = imageData.preview;
        }

        setProfileImage(imageUrl);
        
        // Update user profile
        if (updateUser) {
          await updateUser({ picture: imageUrl });
        }
        
        // Callback
        if (onImageChange) {
          onImageChange(imageUrl);
        }
        
        setShowUploadModal(false);
        setEditMode(false);
        
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  }, [uploadImage, updateUser, onImageChange]);

  /**
   * Remove profile image
   */
  const removeImage = useCallback(async () => {
    setProfileImage(null);
    
    if (updateUser) {
      await updateUser({ picture: null });
    }
    
    if (onImageChange) {
      onImageChange(null);
    }
    
    setEditMode(false);
  }, [updateUser, onImageChange]);

  return (
    <>
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Profile Image */}
        <div 
          className={`
            ${sizeClasses[size].container} 
            rounded-full overflow-hidden 
            ${getAvatarColor()}
            flex items-center justify-center 
            text-white font-bold ${sizeClasses[size].text}
            shadow-lg transition-transform duration-300
            ${hover && editable ? 'scale-105' : ''}
            ring-2 ring-offset-2 ring-offset-gray-900 
            ${user?.plan === 'Pro Plan' 
              ? 'ring-yellow-400' 
              : 'ring-transparent'
            }
          `}
        >
          {profileImage ? (
            <img 
              src={profileImage} 
              alt={user?.name || 'Profile'} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                setProfileImage(null);
              }}
            />
          ) : (
            getUserInitials().charAt(0)
          )}

          {/* Uploading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Edit Button */}
        {editable && showUploadButton && !editMode && (
          <button
            onClick={() => setShowUploadModal(true)}
            className={`
              absolute ${sizeClasses[size].button}
              bg-indigo-600 text-white 
              rounded-full 
              flex items-center justify-center
              transition-all duration-300
              hover:bg-indigo-700 
              hover:scale-110
              shadow-lg
              ${hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
            `}
            title="Change profile picture"
          >
            <Camera className={sizeClasses[size].icon} />
          </button>
        )}

        {/* Edit Mode Buttons (for inline editing) */}
        {editable && editMode && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 bg-gray-900 rounded-full p-1 shadow-xl">
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              title="Upload new"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            {profileImage && (
              <button
                onClick={removeImage}
                className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setEditMode(false)}
              className="p-1 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
              title="Cancel"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Pro Plan Badge */}
        {user?.plan === 'Pro Plan' && !editable && (
          <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1 border-2 border-gray-900">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleImageUpload}
          currentImage={profileImage}
        />
      )}
    </>
  );
};

export default ProfileImage;