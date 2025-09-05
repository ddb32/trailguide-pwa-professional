import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import i18n from '../../i18n/i18n';

// Icons (using simple unicode icons for now - can be replaced with icon library)
const Icons = {
  menu: '☰',
  close: '✕',
  dashboard: '📊',
  create: '➕',
  guides: '📋',
  settings: '⚙️',
  logout: '🚪',
  logo: '🧭'
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const { isRTL, conditionalClass, languageClasses } = useLanguageDirection();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: t('navigation.dashboard'),
      href: '/app/dashboard',
      icon: Icons.dashboard,
      current: location.pathname === '/app/dashboard'
    },
    {
      name: t('navigation.createGuide'),
      href: '/app/create',
      icon: Icons.create,
      current: location.pathname === '/app/create'
    },
    {
      name: t('navigation.myGuides'),
      href: '/app/dashboard',
      icon: Icons.guides,
      current: false
    }
  ];

  const handleLogout = async () => {
    try {
      setIsUserMenuOpen(false);
      await logout();
      toast.success(t('auth.logoutSuccess') || 'Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error(t('auth.logoutError') || 'Logout failed');
    }
  };

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    setIsLanguageMenuOpen(false);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${languageClasses}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 z-50 flex w-72 flex-col bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0
        ${isRTL ? 'right-0' : 'left-0'}
        ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        md:static md:z-auto md:shadow-none
      `}>
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between bg-blue-600 px-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{Icons.logo}</span>
            <span className="text-xl font-bold text-white">
              {t('app.name')}
            </span>
          </div>
          
          {/* Close button for mobile */}
          <button
            className="md:hidden text-white hover:text-blue-200 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-xl">{Icons.close}</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = item.current;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${isRTL ? 'flex-row-reverse space-x-reverse' : 'flex-row'}
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span className={conditionalClass.ml('3')}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className={`
              group flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-all duration-200
              ${isRTL ? 'flex-row-reverse space-x-reverse' : 'flex-row'}
            `}
          >
            <span className="text-lg">{Icons.logout}</span>
            <span className={conditionalClass.ml('3')}>{t('navigation.logout')}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={`
        flex flex-1 flex-col
        ${isRTL ? 'md:mr-72' : 'md:ml-72'}
      `}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="text-xl">{Icons.menu}</span>
            </button>

            {/* Page title */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {/* Dynamic title based on current route */}
                {location.pathname === '/app/dashboard' && t('dashboard.title')}
                {location.pathname === '/app/create' && t('createGuide.title')}
                {location.pathname.includes('/app/edit') && t('createGuide.editTitle')}
              </h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Language switcher */}
              <div className="relative">
                <button
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center space-x-1"
                  aria-expanded={isLanguageMenuOpen}
                  aria-haspopup="true"
                >
                  <span>{i18n.language === 'he' ? t('languageSwitcher.hebrew') : t('languageSwitcher.english')}</span>
                  <span className={`text-xs transform transition-transform duration-200 ${isLanguageMenuOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* Language dropdown menu */}
                {isLanguageMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsLanguageMenuOpen(false)}
                    ></div>
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-20 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5`}>
                      <button
                        onClick={() => handleLanguageChange('he')}
                        className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                          i18n.language === 'he' 
                            ? 'bg-blue-50 text-blue-600 font-medium' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        עב
                      </button>
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                          i18n.language === 'en' 
                            ? 'bg-blue-50 text-blue-600 font-medium' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </button>

                {/* User dropdown menu */}
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsUserMenuOpen(false)}
                    ></div>
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5`}>
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <div className="font-medium">{user?.fullName || user?.username}</div>
                        <div className="text-gray-500 text-xs">{user?.email}</div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate('/app/profile');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        👤 {t('user.profile')}
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate('/app/settings');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        ⚙️ {t('navigation.settings')}
                      </button>
                      
                      <hr className="my-1" />
                      
                      <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        🚪 {isLoading ? t('common.loading') : t('navigation.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;