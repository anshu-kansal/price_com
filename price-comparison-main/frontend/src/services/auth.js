class AuthService {
  // Store user data after login
  setUserData(userData) {
    localStorage.setItem('username', userData.username);
    localStorage.setItem('email', userData.email || '');
    localStorage.setItem('role', userData.role);
    localStorage.setItem('is_admin', userData.is_admin);
    localStorage.setItem('user_id', userData.user_id);
    localStorage.setItem('isAuthenticated', 'true');
  }

  // Clear user data on logout
  clearUserData() {
    localStorage.clear();
    sessionStorage.clear();
  }

  // Get current user
  getCurrentUser() {
    return {
      username: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      role: localStorage.getItem('role'),
      is_admin: localStorage.getItem('is_admin') === 'true',
      user_id: localStorage.getItem('user_id'),
      isAuthenticated: localStorage.getItem('isAuthenticated') === 'true'
    };
  }

  // Check if user is authenticated
  isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true' && 
           localStorage.getItem('username') !== null;
  }

  // Check if user is admin
  isAdmin() {
    return localStorage.getItem('is_admin') === 'true';
  }

  // Get user role
  getUserRole() {
    return localStorage.getItem('role');
  }
}

export default new AuthService();