import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data on component mount
    const storedUser = localStorage.getItem('user');
    const storedPreferences = localStorage.getItem('userPreferences');
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // Merge with stored preferences if they exist
      if (storedPreferences) {
        userData.preferences = JSON.parse(storedPreferences);
      }
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    // Ensure userData has all necessary fields
    const completeUserData = {
      username: userData.username || '',
      name: userData.name || userData.full_name || userData.username || '',
      email: userData.email || '',
      is_admin: userData.is_admin || false,
      role: userData.role || 'user',
      user_id: userData.user_id || null,
      plan: userData.plan || 'Free Plan',
      avatar: userData.avatar || userData.picture || null,
      profilePhoto: userData.avatar || userData.picture || 'https://via.placeholder.com/150',
      bio: userData.bio || '',
      dateOfBirth: userData.dateOfBirth || '',
      gender: userData.gender || 'prefer-not-to-say',
      customGender: userData.customGender || '',
      phone: userData.phone || {
        primary: { number: '', countryCode: '+1' },
        secondary: []
      },
      website: userData.website || '',
      location: userData.location || {
        city: '',
        country: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      language: userData.language || 'en',
      // Add preferences object
      preferences: userData.preferences || {
        email: {
          primary: userData.email || '',
          secondary: []
        },
        language: userData.language || 'en'
      }
    };
    
    setUser(completeUserData);
    localStorage.setItem('user', JSON.stringify(completeUserData));
    
    // Also store preferences separately for easy access
    if (completeUserData.preferences) {
      localStorage.setItem('userPreferences', JSON.stringify(completeUserData.preferences));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_picture');
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update preferences if they exist in the update
    if (userData.preferences) {
      localStorage.setItem('userPreferences', JSON.stringify(userData.preferences));
    }
  };

  const updateUserPreferences = (preferencesData) => {
    if (!user) return;
    
    const updatedUser = { 
      ...user, 
      ...preferencesData,
      preferences: { ...user.preferences, ...preferencesData }
    };
    
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('userPreferences', JSON.stringify(updatedUser.preferences));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    updateUserPreferences
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};