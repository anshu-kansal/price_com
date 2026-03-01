import React, { useState } from 'react';
import { Search, X, LogOut, LogIn, Sun, Moon, ChevronDown, User, Heart, Settings, ShoppingCart, Bell, Camera, Upload } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../Upload/ProfileImage';
import ImageUploadModal from '../Upload/UploadModal';

const Header = () => {
  const { searchQuery, setSearchQuery, clearSearch } = useAppContext();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() !== '' && window.location.pathname !== '/search') {
      navigate('/search');
    } else if (query.trim() === '' && window.location.pathname === '/search') {
      navigate('/dashboard');
    }
  };

  const handleClearSearch = () => {
    clearSearch();
    if (window.location.pathname === '/search') {
      navigate('/dashboard');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      navigate('/search');
    }
  };

  const handleImageUpload = () => {
    setShowImageUpload(true);
  };

  const handleImageUploadComplete = (imageData) => {
    console.log('Image uploaded:', imageData);
    setSelectedImage(imageData);
    setShowImageUpload(false);
    // Here you can navigate to scanner results or process the image
    navigate('/scanner-results');
  };

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // Theme-based classes
  const headerClasses = theme === 'dark' 
    ? 'bg-black border-gray-900' 
    : 'bg-white border-gray-200';
  
  const titleClasses = theme === 'dark' 
    ? 'text-white' 
    : 'text-gray-900';
  
  const searchInputClasses = theme === 'dark'
    ? 'bg-gray-900 text-white border-gray-800 focus:ring-indigo-500'
    : 'bg-gray-100 text-gray-900 border-gray-200 focus:ring-black';
  
  const searchTextClasses = theme === 'dark'
    ? 'text-gray-500'
    : 'text-gray-400';
  
  const uploadButtonClasses = theme === 'dark'
    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0'
    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0';
  
  const borderClasses = theme === 'dark'
    ? 'border-gray-800'
    : 'border-gray-200';

  const iconClasses = theme === 'dark'
    ? 'text-gray-400 hover:text-white'
    : 'text-gray-500 hover:text-gray-900';

  const badgeClasses = theme === 'dark'
    ? 'bg-indigo-600 text-white'
    : 'bg-indigo-600 text-white';

  const dropdownClasses = theme === 'dark'
    ? 'bg-gray-900 border-gray-800'
    : 'bg-white border-gray-200';

  const menuItemClasses = theme === 'dark'
    ? 'hover:bg-gray-800 text-gray-300'
    : 'hover:bg-gray-100 text-gray-700';

  return (
    <>
      <header className={`h-20 border-b px-8 flex items-center justify-between shrink-0 sticky top-0 z-50 transition-colors ${headerClasses}`}>
        <div className="flex flex-col">
          <h1 className={`text-xl font-bold transition-colors ${titleClasses}`}>Price Intelligence System</h1>
          {searchQuery && window.location.pathname !== '/search' && (
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Searching: "{searchQuery}" 
              <button 
                onClick={() => navigate('/search')}
                className={`ml-2 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
              >
                View all results →
              </button>
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Image Upload Button */}
          <button
            onClick={handleImageUpload}
            className={`flex items-center gap-2 font-medium py-2.5 px-4 rounded-full text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${uploadButtonClasses}`}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden md:inline">Scan Product</span>
            <Upload className="w-3 h-3 ml-1" />
          </button>

          {/* Search Bar */}
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${searchTextClasses}`} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              onKeyPress={handleKeyPress}
              className={`w-full text-sm rounded-full pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 transition-shadow border ${searchInputClasses}`}
              placeholder="Search products by name, category or store..."
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className={`h-4 w-4 ${searchTextClasses} hover:${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg transition-colors ${iconClasses} relative`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className={`absolute right-0 mt-2 w-80 rounded-lg border shadow-xl ${dropdownClasses}`}>
                <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Notifications
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className={`p-3 ${menuItemClasses}`}>
                    <p className="text-sm">Price drop on Sony WH-1000XM5</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      2 minutes ago
                    </p>
                  </div>
                  <div className={`p-3 ${menuItemClasses}`}>
                    <p className="text-sm">New deal available at Amazon</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      1 hour ago
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Button */}
          <button
            onClick={() => navigate('/cart')}
            className={`p-2 rounded-lg transition-colors ${iconClasses} relative`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center ${badgeClasses}`}>
              3
            </span>
          </button>

          {/* User Menu with Profile Image */}
          <div className={`flex items-center pl-2 border-l ${borderClasses}`}>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ProfileImage 
                    user={user} 
                    size="sm" 
                    editable={false}
                  />
                  <ChevronDown className={`w-4 h-4 ${iconClasses}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-xl ${dropdownClasses}`}>
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {user?.name || user?.username || 'User'}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {user?.email}
                      </p>
                    </div>
                    
                    <div className="p-1">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setShowProfileMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${menuItemClasses}`}
                      >
                        <User className="w-4 h-4" />
                        Your Profile
                      </button>
                      
                      <button
                        onClick={() => {
                          navigate('/watchlist');
                          setShowProfileMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${menuItemClasses}`}
                      >
                        <Heart className="w-4 h-4" />
                        Watchlist
                      </button>
                      
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setShowProfileMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${menuItemClasses}`}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      
                      <hr className={`my-1 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`} />
                      
                      <button
                        onClick={handleLogout}
                        className={`w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-600/20`}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <ImageUploadModal
          onClose={() => setShowImageUpload(false)}
          onUpload={handleImageUploadComplete}
          currentImage={selectedImage}
        />
      )}
    </>
  );
};

export default Header;