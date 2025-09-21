import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Icon } from '../common/Icon';
import i18n from '../../i18n/i18n';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { user, logout, isLoading, isAdmin } = useAuth();
  const { isRTL, conditionalClass, languageClasses } = useLanguageDirection();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: t('navigation.myGuides'),
      href: '/app/dashboard',
      icon: 'guides',
      current: location.pathname === '/app/dashboard'
    },
    {
      name: t('navigation.createGuide'),
      href: '/app/create',
      icon: 'create',
      current: location.pathname === '/app/create'
    },
    // Admin dashboard - only shown for admin users
    ...(isAdmin ? [{
      name: t('admin.dashboard.title'),
      href: '/admin',
      icon: 'adminDashboard',
      current: location.pathname === '/admin'
    }] : [])
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

  const handleLanguageChange = async (language) => {
    try {
      await i18n.changeLanguage(language);
      // Add a subtle success feedback
      const event = new CustomEvent('languageChanged', {
        detail: { language, label: language === 'he' ? 'עברית' : 'English' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      // Close menu with a slight delay for better UX
      setTimeout(() => {
        setIsLanguageMenuOpen(false);
      }, 150);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${languageClasses}`}>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-all duration-300"></div>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Navigation */}
            <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-8`}>
              {/* Logo */}
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
                  <Icon name="logo" size="md" className="text-white" ariaHidden />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-bold text-gray-900">{t('app.name')}</span>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-4">
                {navigation.map((item) => {
                  const isActive = item.current;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon
                        name={item.icon}
                        size="sm"
                        className={`${isRTL ? 'ml-2' : 'mr-2'} ${isActive ? 'text-primary-600' : 'text-gray-500'}`}
                        ariaHidden
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right side - User menu and language switcher */}
            <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                onClick={() => setSidebarOpen(true)}
                aria-label={t('common.menu')}
              >
                <Icon name="menu" size="md" ariaHidden />
              </button>

              {/*
                LANGUAGE SWITCHER - TEMPORARILY HIDDEN FOR HEBREW-ONLY SYSTEM

                Uncomment this section to restore multilingual functionality.
                All language switching infrastructure is preserved and ready for reactivation.
              */}
              {/*
              <div className="relative">
                <button
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className={`flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 hover:border-blue-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group ${isLanguageMenuOpen ? 'from-blue-100 to-blue-200 border-blue-300 shadow-md' : ''}`}
                >
                  <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-800 min-w-[2rem]">
                    {i18n.language === 'he' ? 'עב' : 'EN'}
                  </span>
                </button>

                {/* Enhanced Language dropdown */}
                {/*
                {isLanguageMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsLanguageMenuOpen(false)}></div>
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-3 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200`}>
                      <button
                        onClick={() => handleLanguageChange('he')}
                        className={`flex items-center w-full px-4 py-3 text-base font-medium transition-all duration-200 ${
                          i18n.language === 'he'
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <span className="text-lg mr-3">🇮🇱</span>
                        <div className="flex-1 text-left">
                          <div className="font-semibold">עברית</div>
                          <div className="text-xs text-gray-500">Hebrew</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`flex items-center w-full px-4 py-3 text-base font-medium transition-all duration-200 ${
                          i18n.language === 'en'
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <span className="text-lg mr-3">🇺🇸</span>
                        <div className="flex-1 text-left">
                          <div className="font-semibold">English</div>
                          <div className="text-xs text-gray-500">English</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              */}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
                >
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </button>

                {/* User dropdown */}
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)}></div>
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20 border`}>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">{user?.fullName || user?.username}</div>
                        <div className="text-xs text-gray-600">{user?.email}</div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Icon name="logout" size="sm" className="text-gray-500 mr-2" ariaHidden />
                        {t('navigation.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setSidebarOpen(false)}></div>
          <div className={`fixed ${isRTL ? 'right-0' : 'left-0'} top-0 h-full w-72 bg-white shadow-xl transform transition-transform`}>
            <div className="p-4 border-b">
              <div className={`flex items-center justify-between`}>
                <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                  <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
                    <Icon name="logo" size="md" className="text-white" ariaHidden />
                  </div>
                  <span className="text-lg font-bold text-gray-900">{t('app.name')}</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
                  <Icon name="close" size="md" ariaHidden />
                </button>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                    item.current ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon name={item.icon} size="sm" className={`${isRTL ? 'ml-2' : 'mr-2'}`} ariaHidden />
                  {item.name}
                </Link>
              ))}

              {/* Mobile Language Selector */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    {t('common.language', 'Language')}
                  </p>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleLanguageChange('he')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        i18n.language === 'he'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span className="text-base mr-3">🇮🇱</span>
                      <span className="flex-1 text-left">עברית</span>
                    </button>

                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        i18n.language === 'en'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span className="text-base mr-3">🇺🇸</span>
                      <span className="flex-1 text-left">English</span>
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content - Full Screen Layout */}
      <main className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;