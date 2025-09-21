import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { adminService } from '../../../services/adminService';

const AdminExportSection = ({ 
  period = 30, 
  platformStats = null 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      
      const result = await adminService.exportAnalytics({ 
        days: period, 
        format 
      });

      if (format === 'csv') {
        toast.success(t('admin.export.csvDownloaded'), {
          duration: 3000,
          style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
        });
      } else {
        // For JSON, trigger download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trailguide-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(t('admin.export.jsonDownloaded'), {
          duration: 3000,
          style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('admin.export.error'), {
        duration: 5000,
        style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      format: 'csv',
      title: t('admin.export.csv.title'),
      description: t('admin.export.csv.description'),
      icon: '📊',
      color: 'green'
    },
    {
      format: 'json',
      title: t('admin.export.json.title'), 
      description: t('admin.export.json.description'),
      icon: '🔧',
      color: 'blue'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin.export.title')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('admin.export.subtitle', { period })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Export Summary */}
        {platformStats && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {t('admin.export.summary')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('admin.stats.totalGuides')}:</span>
                <span className="font-medium ml-2">{platformStats.total_guides || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('admin.stats.totalViews')}:</span>
                <span className="font-medium ml-2">{(platformStats.total_views || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('admin.stats.totalFeedback')}:</span>
                <span className="font-medium ml-2">{platformStats.total_feedback || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportOptions.map((option) => (
            <div 
              key={option.format}
              className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    option.color === 'green' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <span className="text-xl">{option.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => handleExport(option.format)}
                  disabled={isExporting}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    option.color === 'green'
                      ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
                  } disabled:cursor-not-allowed`}
                >
                  {isExporting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('admin.export.exporting')}
                    </div>
                  ) : (
                    <>
                      {t('admin.export.download')} {option.format.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Export Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600">ℹ️</div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                {t('admin.export.info.title')}
              </h4>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• {t('admin.export.info.csvContent')}</li>
                <li>• {t('admin.export.info.jsonContent')}</li>
                <li>• {t('admin.export.info.privacy')}</li>
                <li>• {t('admin.export.info.period', { days: period })}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExportSection;