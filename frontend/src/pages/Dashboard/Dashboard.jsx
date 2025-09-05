import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass, languageClasses } = useLanguageDirection();
  const { user } = useAuth();
  const { events, stats, isLoading, error, hasError, clearError, recentEvents } = useEvents();

  // Dynamic stats from API data
  const dashboardStats = [
    {
      title: t('dashboard.stats.totalGuides'),
      value: stats.totalGuides.toString(),
      icon: '📋',
      color: 'blue'
    },
    {
      title: t('dashboard.stats.activeGuides'),
      value: stats.activeGuides.toString(), 
      icon: '✅',
      color: 'green'
    },
    {
      title: t('dashboard.stats.totalViews'),
      value: stats.totalViews.toString(),
      icon: '👥',
      color: 'purple'
    },
    {
      title: t('dashboard.stats.thisMonth'),
      value: `+${stats.thisMonth}`,
      icon: '📈',
      color: 'orange'
    }
  ];


  const quickActions = [
    {
      title: t('dashboard.quickActions.createNew'),
      description: t('dashboard.quickActions.createNewDescription'),
      icon: '➕',
      href: '/app/create',
      color: 'blue'
    },
    {
      title: t('dashboard.quickActions.viewAnalytics'),
      description: t('dashboard.quickActions.viewAnalyticsDescription'),
      icon: '📊',
      href: '#analytics',
      color: 'green'
    },
    {
      title: t('dashboard.quickActions.manageSettings'),
      description: t('dashboard.quickActions.manageSettingsDescription'),
      icon: '⚙️',
      href: '#settings',
      color: 'gray'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return t('status.active');
      case 'expired': return t('status.expired');
      case 'draft': return t('status.draft');
      case 'published': return t('status.published');
      default: return status;
    }
  };

  return (
    <div className={`space-y-8 ${languageClasses}`}>
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('dashboard.welcomeMessage', { name: t('user.defaultName') })}
        </h1>
        <p className="text-gray-600">
          {t('dashboard.welcomeDescription')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="text-3xl">{stat.icon}</div>
              <div className={conditionalClass.ml('4')}>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-16 block"></span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {t('dashboard.quickActions.title')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="group p-4 rounded-lg border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
            >
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="text-2xl">{action.icon}</div>
                <div className={conditionalClass.ml('3')}>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Guides */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('dashboard.recentGuides.title')}
          </h2>
          <Link 
            to="/app/create"
            className="btn btn-primary"
          >
            {t('dashboard.createNewGuide')}
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex space-x-4 py-4">
                  <div className="bg-gray-200 rounded h-4 w-1/4"></div>
                  <div className="bg-gray-200 rounded h-4 w-20"></div>
                  <div className="bg-gray-200 rounded h-4 w-16"></div>
                  <div className="bg-gray-200 rounded h-4 w-24"></div>
                  <div className="bg-gray-200 rounded h-4 w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              {t('dashboard.error.loadFailed')}
            </h3>
            <p className="text-red-600 mb-6">
              {error}
            </p>
            <button 
              onClick={clearError}
              className="btn btn-secondary"
            >
              {t('dashboard.error.tryAgain')}
            </button>
          </div>
        ) : recentEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={`py-3 px-4 text-sm font-medium text-gray-600 ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.guideName')}
                  </th>
                  <th className={`py-3 px-4 text-sm font-medium text-gray-600 ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.status')}
                  </th>
                  <th className={`py-3 px-4 text-sm font-medium text-gray-600 ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.views')}
                  </th>
                  <th className={`py-3 px-4 text-sm font-medium text-gray-600 ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.expiry')}
                  </th>
                  <th className={`py-3 px-4 text-sm font-medium text-gray-600 ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{event.name}</div>
                      <div className="text-sm text-gray-600">{t('dashboard.table.created')}: {event.created}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-900">
                      {event.views}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {event.expires || t('dashboard.table.noExpiration')}
                    </td>
                    <td className="py-4 px-4">
                      <div className={`flex space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                        <Link
                          to={`/app/edit/${event.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {t('dashboard.actions.edit')}
                        </Link>
                        <Link
                          to={`/guide/${event.id}`}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          {t('dashboard.actions.view')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('dashboard.recentGuides.noGuides')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('dashboard.recentGuides.createFirst')}
            </p>
            <Link 
              to="/app/create"
              className="btn btn-primary"
            >
              {t('dashboard.createFirstGuide')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;