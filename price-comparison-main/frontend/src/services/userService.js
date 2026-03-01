import API from './api';

export const userService = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await API.get('user/profile/');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await API.put('user/profile/', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Update user preferences
  updatePreferences: async (preferencesData) => {
    try {
      const response = await API.put('user/preferences/', preferencesData);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  // Upload profile photo
  uploadProfilePhoto: async (photoFile) => {
    try {
      const formData = new FormData();
      formData.append('profile_photo', photoFile);
      
      const response = await API.post('user/profile/photo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await API.post('user/change-password/', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};

export default userService;