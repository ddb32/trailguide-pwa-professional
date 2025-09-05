import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import i18n from '../../i18n/i18n';

const Login = () => {
  const { t } = useTranslation();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const { isRTL, conditionalClass, languageClasses } = useLanguageDirection();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/app/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const onSubmit = async (data) => {
    try {
      clearErrors();
      clearError();

      const result = await login({
        email: data.email,
        password: data.password,
        rememberMe
      });

      if (result.success) {
        toast.success(t('auth.loginSuccess'));
        
        const from = location.state?.from?.pathname || '/app/dashboard';
        navigate(from, { replace: true });
      } else {
        if (result.error.includes('email')) {
          setError('email', {
            type: 'server',
            message: result.error
          });
        } else if (result.error.includes('password')) {
          setError('password', {
            type: 'server',
            message: result.error
          });
        } else {
          toast.error(result.error);
        }
      }
    } catch (err) {
      toast.error(t('auth.loginError'));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    setIsLanguageMenuOpen(false);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${languageClasses}`}>
      <div className="min-h-screen flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700">
          <div className="flex items-center justify-center w-full p-12">
            <div className="text-center text-white">
              <div className="text-6xl mb-6">🧭</div>
              <h1 className="text-4xl font-bold mb-4">
                {t('app.name')}
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                {t('app.description')}
              </p>
              <div className="space-y-3 text-blue-100">
                <p className={`flex items-center justify-center ${conditionalClass.flexRow}`}>
                  <span className="text-2xl ml-2">📱</span>
                  {t('home.features.mobile.title')}
                </p>
                <p className={`flex items-center justify-center ${conditionalClass.flexRow}`}>
                  <span className="text-2xl ml-2">🇮🇱</span>
                  {t('home.features.hebrew.title')}
                </p>
                <p className={`flex items-center justify-center ${conditionalClass.flexRow}`}>
                  <span className="text-2xl ml-2">🔄</span>
                  {t('home.features.offline.title')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="lg:hidden text-4xl mb-4">🧭</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t('auth.loginTitle')}
              </h2>
              <p className="text-gray-600">
                {t('auth.loginSubtitle')}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <div>
                <label 
                  htmlFor="email" 
                  className={`block text-sm font-medium text-gray-700 mb-2 ${conditionalClass.textLeft}`}
                >
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={`
                      w-full px-4 py-3 border border-gray-300 rounded-lg 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      placeholder-gray-400 transition-all duration-200
                      ${conditionalClass.textLeft}
                      ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}
                    `}
                    placeholder={t('auth.emailPlaceholder')}
                    {...register('email', {
                      required: t('auth.emailRequired'),
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('auth.emailInvalid')
                      }
                    })}
                  />
                  <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
                    <span className="text-gray-400 text-sm">@</span>
                  </div>
                </div>
                {errors.email && (
                  <p className={`mt-2 text-sm text-red-600 ${conditionalClass.textLeft}`}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className={`block text-sm font-medium text-gray-700 mb-2 ${conditionalClass.textLeft}`}
                >
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`
                      w-full px-4 py-3 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      placeholder-gray-400 transition-all duration-200
                      ${conditionalClass.textLeft}
                      ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}
                    `}
                    placeholder={t('auth.passwordPlaceholder')}
                    {...register('password', {
                      required: t('auth.passwordRequired'),
                      minLength: {
                        value: 6,
                        message: t('auth.passwordTooShort')
                      }
                    })}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-gray-400 hover:text-gray-600`}
                  >
                    <span className="text-sm">
                      {showPassword ? '🙈' : '👁️'}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p className={`mt-2 text-sm text-red-600 ${conditionalClass.textLeft}`}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className={`flex items-center justify-between ${conditionalClass.flexRow}`}>
                <div className={`flex items-center ${conditionalClass.flexRow}`}>
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className={`${conditionalClass.ml('2')} block text-sm text-gray-700`}>
                    {t('auth.rememberMe')}
                  </label>
                </div>

                <div className="text-sm">
                  <a 
                    href="#" 
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info('Password reset functionality coming soon');
                    }}
                  >
                    {t('auth.forgotPassword')}
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className={`
                    w-full flex justify-center py-3 px-4 border border-transparent 
                    rounded-lg shadow-sm text-sm font-medium text-white 
                    bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                    focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200
                    disabled:bg-gray-400 disabled:cursor-not-allowed
                    ${isSubmitting || isLoading ? 'opacity-50' : ''}
                  `}
                >
                  {isSubmitting || isLoading ? (
                    <div className={`flex items-center ${conditionalClass.flexRow}`}>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className={conditionalClass.ml('2')}>
                        {t('common.loading')}
                      </span>
                    </div>
                  ) : (
                    t('auth.signIn')
                  )}
                </button>
              </div>

              {/* Demo Users Info */}
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className={`text-sm font-medium text-yellow-800 mb-3 ${conditionalClass.textLeft}`}>
                  {t('auth.demoAccounts')}:
                </h4>
                <div className="space-y-2 text-xs text-yellow-700">
                  <div className={`${conditionalClass.textLeft}`}>
                    <strong>admin@trailguide.app</strong> / AdminPass123!
                  </div>
                  <div className={`${conditionalClass.textLeft}`}>
                    <strong>organizer1@example.com</strong> / OrganizerPass1!
                  </div>
                  <div className={`${conditionalClass.textLeft}`}>
                    <strong>organizer2@example.com</strong> / OrganizerPass2!
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className={`flex items-center justify-between ${conditionalClass.flexRow}`}>
                <Link
                  to="/"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← {t('common.back')} {t('navigation.home')}
                </Link>

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
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                {t('app.name')} © 2024
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;