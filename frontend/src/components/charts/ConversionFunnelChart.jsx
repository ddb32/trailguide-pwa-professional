/**
 * ConversionFunnelChart Component
 * Specialized chart for conversion funnel visualization for entrepreneurs
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const ConversionFunnelChart = ({
  data = [],
  height = 400,
  className = '',
  showPercentages = true,
  showValues = true,
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();

  // Process data and calculate conversion rates
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxValue = Math.max(...data.map(item => item.value || 0));

    return data.map((item, index) => {
      const previousValue = index > 0 ? data[index - 1].value : item.value;
      const conversionRate = previousValue > 0 ? ((item.value / previousValue) * 100) : 100;
      const widthPercentage = maxValue > 0 ? ((item.value / maxValue) * 100) : 0;

      return {
        ...item,
        conversionRate: conversionRate.toFixed(1),
        widthPercentage,
        color: colors[index % colors.length]
      };
    });
  }, [data, colors]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-2xl mb-2">🔀</div>
          <p className="text-sm text-gray-500">{t('analytics:charts.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ minHeight: `${height}px` }}>
      <div className="space-y-4 p-4">
        {processedData.map((step, index) => (
          <div key={step.id || index} className="relative">
            {/* Step Bar */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '60px' }}>
              <div
                className="h-full rounded-lg transition-all duration-500 ease-out flex items-center"
                style={{
                  width: `${step.widthPercentage}%`,
                  backgroundColor: step.color,
                  minWidth: '120px'
                }}
              >
                {/* Step Content */}
                <div className={`flex items-center justify-between w-full px-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm font-medium">{step.name}</div>
                    {showValues && (
                      <div className="text-lg font-bold">{step.value.toLocaleString()}</div>
                    )}
                  </div>

                  {showPercentages && index > 0 && (
                    <div className="text-white text-right">
                      <div className="text-xs opacity-90">Conversion</div>
                      <div className="text-sm font-bold">{step.conversionRate}%</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Label Outside */}
              <div className={`absolute top-1/2 transform -translate-y-1/2 text-gray-700 text-sm font-medium ${
                isRTL ? 'right-2' : 'left-2'
              }`} style={{
                left: `${step.widthPercentage + 2}%`,
                display: step.widthPercentage < 85 ? 'block' : 'none'
              }}>
                {step.name}
              </div>
            </div>

            {/* Conversion Arrow */}
            {index < processedData.length - 1 && (
              <div className={`flex items-center justify-center py-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                    {processedData[index + 1].conversionRate}% convert
                  </div>
                  <div className="text-lg">
                    {isRTL ? '↖' : '↓'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Summary Statistics */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            📊 {t('analytics:funnel.summary')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {processedData[0]?.value?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">
                {t('analytics:funnel.totalEntries')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {processedData[processedData.length - 1]?.value?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">
                {t('analytics:funnel.conversions')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {processedData.length > 0 && processedData[0].value > 0
                  ? ((processedData[processedData.length - 1].value / processedData[0].value) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500">
                {t('analytics:funnel.overallConversion')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {processedData.length > 0 && processedData[0].value > 0
                  ? (processedData[0].value - processedData[processedData.length - 1].value).toLocaleString()
                  : 0}
              </div>
              <div className="text-xs text-gray-500">
                {t('analytics:funnel.dropOffs')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnelChart;