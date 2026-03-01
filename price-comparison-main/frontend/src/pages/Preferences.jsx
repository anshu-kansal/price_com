import React, { useState, useEffect } from 'react';
import {
  Camera,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  User,
  Link as LinkIcon,
  Save,
  X,
  Edit2,
  Check,
  ChevronDown,
  Plus,
  Loader,
  Languages
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';

const Preferences = () => {
  const { user, updateUserPreferences } = useAuth();
  
  const [userData, setUserData] = useState({
    // Personal Information
    fullName: '',
    username: '',
    profilePhoto: 'https://via.placeholder.com/150',
    bio: '',
    dateOfBirth: '',
    gender: 'prefer-not-to-say',
    customGender: '',
    
    // Contact Details
    email: {
      primary: '',
      secondary: []
    },
    phone: {
      primary: {
        number: '',
        countryCode: '+1'
      },
      secondary: []
    },
    website: '',
    location: {
      city: '',
      country: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    
    // Preferences
    language: 'en'
  });

  const [editMode, setEditMode] = useState({
    personal: false,
    contact: false,
    preferences: false
  });
  
  const [formData, setFormData] = useState({ ...userData });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showGenderCustom, setShowGenderCustom] = useState(false);
  const [newSecondaryEmail, setNewSecondaryEmail] = useState('');
  const [newSecondaryPhone, setNewSecondaryPhone] = useState({ number: '', countryCode: '+1' });
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState({ show: false, section: '' });

  // Country codes for phone
  const countryCodes = [
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+91', country: 'India' },
    { code: '+61', country: 'Australia' },
    { code: '+86', country: 'China' },
    { code: '+81', country: 'Japan' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+55', country: 'Brazil' },
    { code: '+7', country: 'Russia' },
  ];

  // Language options
  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  ];

  // Gender options
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
    { value: 'custom', label: 'Custom' }
  ];

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setFetchLoading(true);
      try {
        // First try to get from context
        if (user) {
          const userPrefs = {
            fullName: user.name || user.fullName || '',
            username: user.username || '',
            profilePhoto: user.profilePhoto || user.avatar || 'https://via.placeholder.com/150',
            bio: user.bio || '',
            dateOfBirth: user.dateOfBirth || '',
            gender: user.gender || 'prefer-not-to-say',
            customGender: user.customGender || '',
            email: {
              primary: user.email || '',
              secondary: user.preferences?.email?.secondary || []
            },
            phone: user.phone || {
              primary: { number: '', countryCode: '+1' },
              secondary: []
            },
            website: user.website || '',
            location: user.location || {
              city: '',
              country: '',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            language: user.language || 'en'
          };
          
          setUserData(userPrefs);
          setFormData(userPrefs);
          setShowGenderCustom(userPrefs.gender === 'custom');
        }
        
        // Then try to fetch from API for latest data
        const apiData = await userService.getProfile();
        if (apiData) {
          const apiPrefs = {
            fullName: apiData.full_name || apiData.name || userData.fullName,
            username: apiData.username || userData.username,
            profilePhoto: apiData.avatar || userData.profilePhoto,
            bio: apiData.bio || userData.bio,
            dateOfBirth: apiData.date_of_birth || userData.dateOfBirth,
            gender: apiData.gender || userData.gender,
            customGender: apiData.custom_gender || userData.customGender,
            email: {
              primary: apiData.email || userData.email.primary,
              secondary: apiData.secondary_emails || userData.email.secondary
            },
            phone: {
              primary: {
                number: apiData.phone_number || userData.phone.primary.number,
                countryCode: apiData.phone_country_code || userData.phone.primary.countryCode
              },
              secondary: apiData.secondary_phones || userData.phone.secondary
            },
            website: apiData.website || userData.website,
            location: {
              city: apiData.city || userData.location.city,
              country: apiData.country || userData.location.country,
              timezone: apiData.timezone || userData.location.timezone
            },
            language: apiData.language || userData.language
          };
          
          setUserData(apiPrefs);
          setFormData(apiPrefs);
          setShowGenderCustom(apiPrefs.gender === 'custom');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Handle input changes
  const handleInputChange = (section, field, value) => {
    setFormData(prev => {
      if (section === 'personal') {
        return { ...prev, [field]: value };
      } else if (section === 'email') {
        return {
          ...prev,
          email: { ...prev.email, [field]: value }
        };
      } else if (section === 'phone') {
        return {
          ...prev,
          phone: {
            ...prev.phone,
            primary: { ...prev.phone.primary, [field]: value }
          }
        };
      } else if (section === 'location') {
        return {
          ...prev,
          location: { ...prev.location, [field]: value }
        };
      } else if (section === 'preferences') {
        return { ...prev, [field]: value };
      }
      return prev;
    });
  };

  // Handle secondary email
  const addSecondaryEmail = () => {
    if (newSecondaryEmail && !formData.email.secondary.includes(newSecondaryEmail)) {
      setFormData(prev => ({
        ...prev,
        email: {
          ...prev.email,
          secondary: [...prev.email.secondary, newSecondaryEmail]
        }
      }));
      setNewSecondaryEmail('');
      setShowEmailInput(false);
    }
  };

  const removeSecondaryEmail = (emailToRemove) => {
    setFormData(prev => ({
      ...prev,
      email: {
        ...prev.email,
        secondary: prev.email.secondary.filter(email => email !== emailToRemove)
      }
    }));
  };

  // Handle secondary phone
  const addSecondaryPhone = () => {
    if (newSecondaryPhone.number) {
      setFormData(prev => ({
        ...prev,
        phone: {
          ...prev.phone,
          secondary: [...prev.phone.secondary, { ...newSecondaryPhone }]
        }
      }));
      setNewSecondaryPhone({ number: '', countryCode: '+1' });
      setShowPhoneInput(false);
    }
  };

  const removeSecondaryPhone = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      phone: {
        ...prev.phone,
        secondary: prev.phone.secondary.filter((_, index) => index !== indexToRemove)
      }
    }));
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const response = await userService.uploadProfilePhoto(file);
        
        if (response.avatar_url) {
          setFormData(prev => ({ ...prev, profilePhoto: response.avatar_url }));
          
          // Update user in context
          updateUserPreferences({ avatar: response.avatar_url });
          
          // Show success message
          setSaveSuccess({ show: true, section: 'photo' });
          setTimeout(() => setSaveSuccess({ show: false, section: '' }), 3000);
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Auto-detect location
  const detectLocation = () => {
    setDetectingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // In real app, reverse geocode to get city/country
            // For demo, set mock data
            setTimeout(() => {
              setFormData(prev => ({
                ...prev,
                location: {
                  city: 'New York',
                  country: 'USA',
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
              }));
              setDetectingLocation(false);
            }, 1500);
          } catch (error) {
            console.error('Error detecting location:', error);
            setDetectingLocation(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setDetectingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setDetectingLocation(false);
    }
  };

  // Save changes
  const handleSave = async (section) => {
    setLoading(true);
    setSaveSuccess({ show: false, section: '' });
    
    try {
      let updatedData = {};
      
      if (section === 'personal') {
        updatedData = {
          full_name: formData.fullName,
          username: formData.username,
          bio: formData.bio,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender === 'custom' ? formData.customGender : formData.gender,
          custom_gender: formData.customGender
        };
      } else if (section === 'contact') {
        updatedData = {
          email: formData.email.primary,
          secondary_emails: formData.email.secondary,
          phone_number: formData.phone.primary.number,
          phone_country_code: formData.phone.primary.countryCode,
          secondary_phones: formData.phone.secondary,
          website: formData.website,
          city: formData.location.city,
          country: formData.location.country,
          timezone: formData.location.timezone
        };
      } else if (section === 'preferences') {
        updatedData = {
          language: formData.language
        };
      }
      
      // Call API to update
      const response = await userService.updateProfile(updatedData);
      
      // Update context with new data
      updateUserPreferences({
        ...formData,
        ...updatedData
      });
      
      // Update local state
      setUserData(prev => ({ ...prev, ...formData }));
      setEditMode(prev => ({ ...prev, [section]: false }));
      
      // Show success message
      setSaveSuccess({ show: true, section });
      setTimeout(() => setSaveSuccess({ show: false, section: '' }), 3000);
      
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edits
  const handleCancel = (section) => {
    setFormData({ ...userData });
    setEditMode(prev => ({ ...prev, [section]: false }));
    setShowEmailInput(false);
    setShowPhoneInput(false);
    setNewSecondaryEmail('');
    setNewSecondaryPhone({ number: '', countryCode: '+1' });
    setShowGenderCustom(userData.gender === 'custom');
  };

  // Handle gender change
  const handleGenderChange = (value) => {
    handleInputChange('personal', 'gender', value);
    setShowGenderCustom(value === 'custom');
    if (value !== 'custom') {
      handleInputChange('personal', 'customGender', '');
    }
  };

  // Get current language display
  const getCurrentLanguage = () => {
    const lang = languageOptions.find(l => l.code === formData.language);
    return lang ? `${lang.flag} ${lang.name}` : 'Select Language';
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Success Message */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your personal information, contact details, and app preferences
          </p>
          {saveSuccess.show && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
              <Check className="h-5 w-5 inline mr-2" />
              {saveSuccess.section === 'photo' ? 'Profile photo updated successfully!' : 
               `${saveSuccess.section.charAt(0).toUpperCase() + saveSuccess.section.slice(1)} settings saved successfully!`}
            </div>
          )}
        </div>

        {/* Personal Information Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
            {!editMode.personal ? (
              <button
                onClick={() => setEditMode(prev => ({ ...prev, personal: true }))}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={() => handleSave('personal')}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </button>
                <button
                  onClick={() => handleCancel('personal')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-6">
            {/* Profile Photo */}
            <div className="flex items-center mb-6">
              <div className="relative">
                <img
                  src={formData.profilePhoto}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover border-4 border-white shadow"
                />
                {(editMode.personal || true) && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                    {loading ? (
                      <Loader className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={loading}
                    />
                  </label>
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
                <p className="text-sm text-gray-500">Click the camera icon to upload a new photo</p>
              </div>
            </div>

            {/* Form Fields - keep existing JSX */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Full Name */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('personal', 'fullName', e.target.value)}
                    disabled={!editMode.personal}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('personal', 'username', e.target.value)}
                    disabled={!editMode.personal}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <div className="mt-1">
                  <textarea
                    rows="3"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('personal', 'bio', e.target.value)}
                    disabled={!editMode.personal}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('personal', 'dateOfBirth', e.target.value)}
                    disabled={!editMode.personal}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <div className="mt-1">
                  <select
                    value={formData.gender}
                    onChange={(e) => handleGenderChange(e.target.value)}
                    disabled={!editMode.personal}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {genderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {showGenderCustom && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.customGender}
                      onChange={(e) => handleInputChange('personal', 'customGender', e.target.value)}
                      placeholder="Specify gender"
                      disabled={!editMode.personal}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details Section - keep existing JSX but with formData values */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Contact Details</h2>
            {!editMode.contact ? (
              <button
                onClick={() => setEditMode(prev => ({ ...prev, contact: true }))}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={() => handleSave('contact')}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </button>
                <button
                  onClick={() => handleCancel('contact')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Primary Email */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Primary Email <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email.primary}
                    onChange={(e) => handleInputChange('email', 'primary', e.target.value)}
                    disabled={!editMode.contact}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Primary Phone */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="relative">
                    <select
                      value={formData.phone.primary.countryCode}
                      onChange={(e) => handleInputChange('phone', 'countryCode', e.target.value)}
                      disabled={!editMode.contact}
                      className="h-full rounded-l-md border border-r-0 border-gray-300 bg-gray-50 py-2 pl-3 pr-7 text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                    >
                      {countryCodes.map(cc => (
                        <option key={cc.code} value={cc.code}>{cc.code}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="tel"
                    value={formData.phone.primary.number}
                    onChange={(e) => handleInputChange('phone', 'number', e.target.value)}
                    disabled={!editMode.contact}
                    className="block w-full rounded-r-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Secondary Emails */}
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Emails
                </label>
                <div className="space-y-2">
                  {formData.email.secondary.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                        />
                      </div>
                      {editMode.contact && (
                        <button
                          onClick={() => removeSecondaryEmail(email)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {editMode.contact && showEmailInput && (
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          value={newSecondaryEmail}
                          onChange={(e) => setNewSecondaryEmail(e.target.value)}
                          placeholder="Enter secondary email"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={addSecondaryEmail}
                        className="p-2 text-green-600 hover:text-green-800"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowEmailInput(false)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  
                  {editMode.contact && !showEmailInput && (
                    <button
                      onClick={() => setShowEmailInput(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Secondary Email
                    </button>
                  )}
                </div>
              </div>

              {/* Secondary Phones */}
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Phones
                </label>
                <div className="space-y-2">
                  {formData.phone.secondary.map((phone, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1 flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          {phone.countryCode}
                        </span>
                        <input
                          type="tel"
                          value={phone.number}
                          disabled
                          className="block w-full rounded-r-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-500"
                        />
                      </div>
                      {editMode.contact && (
                        <button
                          onClick={() => removeSecondaryPhone(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {editMode.contact && showPhoneInput && (
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex rounded-md shadow-sm">
                        <select
                          value={newSecondaryPhone.countryCode}
                          onChange={(e) => setNewSecondaryPhone({ ...newSecondaryPhone, countryCode: e.target.value })}
                          className="rounded-l-md border border-r-0 border-gray-300 bg-gray-50 py-2 pl-3 pr-7 text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        >
                          {countryCodes.map(cc => (
                            <option key={cc.code} value={cc.code}>{cc.code}</option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={newSecondaryPhone.number}
                          onChange={(e) => setNewSecondaryPhone({ ...newSecondaryPhone, number: e.target.value })}
                          placeholder="Phone number"
                          className="block w-full rounded-r-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={addSecondaryPhone}
                        className="p-2 text-green-600 hover:text-green-800"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowPhoneInput(false)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  
                  {editMode.contact && !showPhoneInput && (
                    <button
                      onClick={() => setShowPhoneInput(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Secondary Phone
                    </button>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Website / Portfolio</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('personal', 'website', e.target.value)}
                    disabled={!editMode.contact}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={`${formData.location.city}, ${formData.location.country}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(', ');
                      handleInputChange('location', 'city', parts[0] || '');
                      handleInputChange('location', 'country', parts[1] || '');
                    }}
                    disabled={!editMode.contact}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    value={formData.location.timezone}
                    onChange={(e) => handleInputChange('location', 'timezone', e.target.value)}
                    disabled={!editMode.contact}
                    className="block w-full rounded-l-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {editMode.contact && (
                    <button
                      onClick={detectLocation}
                      disabled={detectingLocation}
                      className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {detectingLocation ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Globe className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* App Preferences Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">App Preferences</h2>
            {!editMode.preferences ? (
              <button
                onClick={() => setEditMode(prev => ({ ...prev, preferences: true }))}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={() => handleSave('preferences')}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </button>
                <button
                  onClick={() => handleCancel('preferences')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Language Selector */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Language <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Languages className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={formData.language}
                    onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
                    disabled={!editMode.preferences}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 appearance-none"
                  >
                    {languageOptions.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Choose your preferred language for the app interface
                </p>
              </div>

              {/* Language Preview */}
              {!editMode.preferences && (
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Current Language</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Languages className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-900 font-medium">
                        {getCurrentLanguage()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional preferences placeholder */}
              <div className="sm:col-span-6">
                <p className="text-sm text-gray-500 italic">
                  More preference options will be available soon...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Changes are saved per section. Make sure to click Save for each section you modify.</p>
        </div>
      </div>
    </div>
  );
};

export default Preferences;