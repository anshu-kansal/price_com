import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileImage from '../components/Upload/ProfileImage';
import { 
  Bell, 
  Shield, 
  CreditCard, 
  Globe, 
  Moon, 
  Sun,
  User,
  Mail,
  Lock,
  Smartphone,
  Clock,
  Download,
  HelpCircle,
  LogOut,
  ChevronRight,
  Save
} from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
    bio: user?.bio || '',
    notifications: {
      email: true,
      push: true,
      priceAlerts: true,
      newsletters: false
    },
    privacy: {
      showEmail: false,
      showWatchlist: true,
      showActivity: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Theme classes
  const containerClasses = theme === 'dark'
    ? 'bg-[#0A0A0A] text-white'
    : 'bg-gray-50 text-gray-900';

  const cardClasses = theme === 'dark'
    ? 'bg-black border-gray-900'
    : 'bg-white border-gray-200';

  const textPrimaryClasses = theme === 'dark' // Add this missing variable
    ? 'text-white'
    : 'text-gray-900';

  const textSecondaryClasses = theme === 'dark'
    ? 'text-gray-400'
    : 'text-gray-500';

  const tabClasses = (tab) => {
    const base = 'px-4 py-3 rounded-lg text-left transition-all duration-200 flex items-center gap-3';
    if (activeTab === tab) {
      return theme === 'dark'
        ? `${base} bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-600`
        : `${base} bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600`;
    }
    return theme === 'dark'
      ? `${base} text-gray-400 hover:bg-gray-900 hover:text-white`
      : `${base} text-gray-600 hover:bg-gray-100 hover:text-gray-900`;
  };

  const inputClasses = theme === 'dark'
    ? 'bg-gray-900 border-gray-800 text-white focus:border-indigo-500'
    : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500';

  const buttonClasses = theme === 'dark'
    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  const secondaryButtonClasses = theme === 'dark'
    ? 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300';

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSaving(false);
    setSuccessMessage('Settings saved successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className={`p-8 min-h-screen transition-colors ${containerClasses}`}>
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className={`text-sm ${textSecondaryClasses}`}>
              Manage your account settings and preferences
            </p>
          </div>
          {successMessage && (
            <div className={`px-4 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
            }`}>
              {successMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className={`rounded-xl border p-4 ${cardClasses}`}>
              {/* Profile Summary */}
              <div className="text-center mb-6">
                <ProfileImage 
                  user={user} 
                  size="lg" 
                  editable 
                  className="justify-center mb-3"
                />
                <h3 className={`font-medium ${textPrimaryClasses}`}>
                  {formData.name || user?.name || 'User'}
                </h3>
                <p className={`text-sm ${textSecondaryClasses}`}>
                  {user?.email}
                </p>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={tabClasses('profile')}
                >
                  <User className="w-5 h-5" />
                  Profile
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
                
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={tabClasses('notifications')}
                >
                  <Bell className="w-5 h-5" />
                  Notifications
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
                
                <button
                  onClick={() => setActiveTab('security')}
                  className={tabClasses('security')}
                >
                  <Shield className="w-5 h-5" />
                  Security
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
                
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={tabClasses('privacy')}
                >
                  <Lock className="w-5 h-5" />
                  Privacy
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
                
                <button
                  onClick={() => setActiveTab('billing')}
                  className={tabClasses('billing')}
                >
                  <CreditCard className="w-5 h-5" />
                  Billing
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
                
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={tabClasses('appearance')}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                  Appearance
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </nav>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={`w-full mt-6 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  theme === 'dark'
                    ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            <form onSubmit={handleSubmit}>
              <div className={`rounded-xl border p-6 ${cardClasses}`}>
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Profile Information</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${textSecondaryClasses}`}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${inputClasses}`}
                          placeholder="Enter your name"
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${textSecondaryClasses}`}>
                          Username
                        </label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${inputClasses}`}
                          placeholder="Enter username"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textSecondaryClasses}`}>
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${inputClasses}`}
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textSecondaryClasses}`}>
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows="4"
                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors resize-none ${inputClasses}`}
                        placeholder="Tell us a little about yourself..."
                      />
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Notification Preferences</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className={`text-sm ${textSecondaryClasses}`}>
                            Receive updates via email
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="notifications.email"
                            checked={formData.notifications.email}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                          } peer-checked:bg-indigo-600 transition-colors`} />
                          <div className={`absolute w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5`} />
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Push Notifications</p>
                          <p className={`text-sm ${textSecondaryClasses}`}>
                            Receive push notifications in browser
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="notifications.push"
                            checked={formData.notifications.push}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                          } peer-checked:bg-indigo-600 transition-colors`} />
                          <div className={`absolute w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5`} />
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Price Alerts</p>
                          <p className={`text-sm ${textSecondaryClasses}`}>
                            Get notified when prices drop
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="notifications.priceAlerts"
                            checked={formData.notifications.priceAlerts}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                          } peer-checked:bg-indigo-600 transition-colors`} />
                          <div className={`absolute w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5`} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Appearance</h2>
                    
                    <div>
                      <p className="font-medium mb-3">Theme</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => theme === 'light' || toggleTheme()}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            theme === 'light'
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <Sun className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Light</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => theme === 'dark' || toggleTheme()}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            theme === 'dark'
                              ? 'border-indigo-600 bg-indigo-900/20'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <Moon className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Dark</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium mb-3">Language</p>
                      <select className={`w-full px-4 py-2 rounded-lg border ${inputClasses}`}>
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    className={`px-6 py-2 rounded-lg transition-colors ${secondaryButtonClasses}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${buttonClasses} ${
                      saving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;