import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Zap, 
  Star, 
  Heart, 
  Bell, 
  Settings,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Sidebar = () => {
  const location = useLocation();
  const { theme } = useTheme();
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Compare Products', href: '/compare', icon: ArrowLeftRight },
    { name: 'AI Shopper', href: '/ai-shopper', icon: Zap, special: true },
    { name: 'Recommendations', href: '/recommendations', icon: Star },
    { name: 'Watchlist', href: '/watchlist', icon: Heart },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Cart', href: '/cart', icon: ShoppingCart, badge: 3 },
    { name: 'Orders', href: '/orders', icon: Package },
  ];

  const isActive = (href) => location.pathname === href;

  // Theme-based classes
  const sidebarClasses = theme === 'dark'
    ? 'bg-black'
    : 'bg-white border-r border-gray-200';

  const logoBgClasses = theme === 'dark'
    ? 'bg-white'
    : 'bg-black';

  const logoSvgClasses = theme === 'dark'
    ? 'text-black'
    : 'text-white';

  const logoTextClasses = theme === 'dark'
    ? 'text-white'
    : 'text-gray-900';

  const sectionTitleClasses = theme === 'dark'
    ? 'text-gray-500'
    : 'text-gray-400';

  const linkDefaultClasses = theme === 'dark'
    ? 'text-gray-400 hover:text-white hover:bg-gray-900'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

  const linkActiveClasses = theme === 'dark'
    ? 'bg-gray-900 text-white'
    : 'bg-gray-100 text-gray-900';

  const specialTextClasses = theme === 'dark'
    ? 'bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent'
    : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent';

  const specialIconClasses = theme === 'dark'
    ? 'text-indigo-400 group-hover:text-indigo-300'
    : 'text-indigo-600 group-hover:text-indigo-500';

  const pingClasses = theme === 'dark'
    ? 'bg-indigo-400'
    : 'bg-indigo-600';

  return (
    <aside className={`w-64 flex flex-col justify-between flex-shrink-0 h-full transition-colors ${sidebarClasses}`}>
      <div>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 ${logoBgClasses} rounded-lg flex items-center justify-center`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={logoSvgClasses}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <span className={`font-bold text-lg tracking-tight transition-colors ${logoTextClasses}`}>PriceMonitor</span>
        </div>

        {/* Navigation */}
        <nav className="px-4">
          <div>
            <h3 className={`px-4 text-xs font-semibold uppercase tracking-wider mb-3 transition-colors ${sectionTitleClasses}`}>
              Platform
            </h3>
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg group transition-colors ${
                        isActive(item.href) ? linkActiveClasses : linkDefaultClasses
                      }`}
                    >
                      <div className="relative">
                        <Icon
                          className={`w-5 h-5 transition-colors ${
                            item.special ? specialIconClasses : 'group-hover:text-current'
                          }`}
                        />
                        {item.special && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingClasses} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${pingClasses}`}></span>
                          </span>
                        )}
                      </div>
                      <span className={`font-medium flex-1 ${
                        item.special ? specialTextClasses : ''
                      }`}>
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="ml-auto bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>

      {/* Settings Link */}
      <div className="px-4 mb-6">
        <Link
          to="/preferences"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
            isActive('/preferences') ? linkActiveClasses : linkDefaultClasses
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;