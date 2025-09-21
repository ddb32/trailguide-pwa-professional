import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';

const AdminUsageChart = ({ 
  usageStats = null, 
  isLoading = false,
  period = 30 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin.usage.title')}
          </h2>
        </div>
        
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="mt-6 h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usageStats || !usageStats.daily_usage) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin.usage.title')}
          </h2>
        </div>
        
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">
            {t('admin.usage.noData')}
          </p>
        </div>
      </div>
    );
  }

  const { daily_usage = [], device_stats = [], geographic_stats = [] } = usageStats;

  // Calculate totals
  const totalViews = daily_usage.reduce((sum, day) => sum + day.total_views, 0);
  const totalUniqueVisitors = daily_usage.reduce((sum, day) => sum + day.unique_visitors, 0);
  const avgCompletionRate = daily_usage.length > 0 
    ? daily_usage.reduce((sum, day) => sum + day.completion_rate, 0) / daily_usage.length 
    : 0;

  // Get top devices and countries
  const topDevices = device_stats.slice(0, 5);
  const topCountries = geographic_stats.slice(0, 10);

  // Simple bar chart component for daily usage
  const DailyUsageChart = () => {
    const maxViews = Math.max(...daily_usage.map(day => day.total_views));
    
    return (
      <div className="space-y-2">
        {daily_usage.slice(-14).map((day, index) => (
          <div key={day.date} className="flex items-center space-x-3">
            <div className="w-16 text-xs text-gray-500 text-right">
              {new Date(day.date).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            <div className="flex-1 relative">
              <div className="bg-gray-200 h-6 rounded overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded transition-all duration-300"
                  style={{ 
                    width: `${maxViews > 0 ? (day.total_views / maxViews) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                {day.total_views.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Device distribution pie chart (simplified as bars)
  const DeviceChart = () => {
    const totalDeviceUsage = topDevices.reduce((sum, device) => sum + device.usage_count, 0);
    
    return (
      <div className="space-y-3">
        {topDevices.map((device, index) => {
          const percentage = totalDeviceUsage > 0 ? (device.usage_count / totalDeviceUsage) * 100 : 0;
          
          return (
            <div key={device.device_type} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {device.device_type === 'mobile' ? '📱' : 
                     device.device_type === 'tablet' ? '📱' : 
                     device.device_type === 'desktop' ? '💻' : '❓'}
                  </span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {device.device_type}
                  </span>
                </div>
                <div className="flex-1 bg-gray-200 h-2 rounded overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600 ml-3">
                {device.usage_count.toLocaleString()} ({percentage.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Geographic distribution
  const GeographicChart = () => {
    const totalGeoUsage = topCountries.reduce((sum, country) => sum + country.usage_count, 0);
    
    return (
      <div className="space-y-2">
        {topCountries.map((country, index) => {
          const percentage = totalGeoUsage > 0 ? (country.usage_count / totalGeoUsage) * 100 : 0;
          
          return (
            <div key={country.country_code} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-sm font-medium text-gray-900 w-8">
                  {country.country_code || '??'}
                </span>
                <div className="flex-1 bg-gray-200 h-2 rounded overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600 ml-3">
                {country.usage_count.toLocaleString()} ({percentage.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin.usage.title')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('admin.usage.subtitle', { period })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalViews.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              {t('admin.usage.totalViews')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalUniqueVisitors.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              {t('admin.usage.uniqueVisitors')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(avgCompletionRate * 100)}%
            </div>
            <div className="text-sm text-gray-500">
              {t('admin.usage.avgCompletionRate')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Usage Trend */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('admin.usage.dailyTrend')}
            </h3>
            <DailyUsageChart />
          </div>

          {/* Device Distribution */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('admin.usage.deviceDistribution')}
            </h3>
            <DeviceChart />
          </div>
        </div>

        {/* Geographic Distribution */}
        {topCountries.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('admin.usage.geographicDistribution')}
            </h3>
            <GeographicChart />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsageChart;