/**
 * MarketValidationChart Component
 * Specialized multi-metric chart for market validation data for entrepreneurs
 */

import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const MarketValidationChart = ({
  data = [],
  height = 350,
  className = '',
  showGrid = true,
  showLegend = true,
  metrics = {
    interest: { key: 'interestLevel', type: 'bar', color: '#3B82F6' },
    engagement: { key: 'engagementRate', type: 'line', color: '#10B981' },
    conversion: { key: 'conversionRate', type: 'line', color: '#F59E0B' },
    retention: { key: 'retentionRate', type: 'line', color: '#EF4444' }
  }
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();

  // Custom tooltip component for market validation metrics
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-sm font-medium text-gray-900 mb-3">{label}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => {
              const isPercentage = ['engagementRate', 'conversionRate', 'retentionRate'].includes(entry.dataKey);
              const value = isPercentage ? `${entry.value}%` : entry.value.toLocaleString();

              return (
                <div key={index} className="flex items-center justify-between space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: entry.color }}>
                    {value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Market Insight */}
          {payload.length > 1 && (
            <div className="border-t border-gray-200 mt-3 pt-3">
              <div className="text-xs text-gray-600">
                {getMarketInsight(payload)}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Generate market insights based on data
  const getMarketInsight = (payload) => {
    const values = payload.reduce((acc, entry) => {
      acc[entry.dataKey] = entry.value;
      return acc;
    }, {});

    if (values.conversionRate > 15 && values.engagementRate > 70) {
      return t('analytics:insights.strongMarketFit');
    } else if (values.interestLevel > 100 && values.conversionRate < 5) {
      return t('analytics:insights.highInterestLowConversion');
    } else if (values.retentionRate > 80) {
      return t('analytics:insights.excellentRetention');
    } else if (values.engagementRate < 30) {
      return t('analytics:insights.needsContentOptimization');
    }

    return t('analytics:insights.collectingData');
  };

  // Format percentage values
  const formatPercentage = (value) => `${value}%`;

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm text-gray-500">{t('analytics:charts.noMarketData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: isRTL ? 10 : 30,
              left: isRTL ? 30 : 10,
              bottom: 20,
            }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            )}

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />

            {/* Left Y-axis for interest levels */}
            <YAxis
              yAxisId="interest"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              orientation={isRTL ? 'right' : 'left'}
            />

            {/* Right Y-axis for percentages */}
            <YAxis
              yAxisId="percentage"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              orientation={isRTL ? 'left' : 'right'}
              tickFormatter={formatPercentage}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Interest Level Bar */}
            <Bar
              yAxisId="interest"
              dataKey={metrics.interest.key}
              fill={metrics.interest.color}
              name={t('analytics:metrics.interestLevel')}
              radius={[2, 2, 0, 0]}
              fillOpacity={0.8}
            />

            {/* Engagement Rate Line */}
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey={metrics.engagement.key}
              stroke={metrics.engagement.color}
              strokeWidth={3}
              dot={{ fill: metrics.engagement.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: metrics.engagement.color }}
              name={t('analytics:metrics.engagementRate')}
            />

            {/* Conversion Rate Line */}
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey={metrics.conversion.key}
              stroke={metrics.conversion.color}
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ fill: metrics.conversion.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: metrics.conversion.color }}
              name={t('analytics:metrics.conversionRate')}
            />

            {/* Retention Rate Line */}
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey={metrics.retention.key}
              stroke={metrics.retention.color}
              strokeWidth={3}
              strokeDasharray="10 5"
              dot={{ fill: metrics.retention.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: metrics.retention.color }}
              name={t('analytics:metrics.retentionRate')}
            />

            {showLegend && (
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  direction: isRTL ? 'rtl' : 'ltr'
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          🎯 {t('analytics:marketValidation.keyMetrics')}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics).map(([key, metric]) => {
            const latestData = data[data.length - 1];
            const value = latestData?.[metric.key] || 0;
            const isPercentage = ['engagementRate', 'conversionRate', 'retentionRate'].includes(metric.key);

            return (
              <div key={key} className="text-center">
                <div className="text-lg font-bold" style={{ color: metric.color }}>
                  {isPercentage ? `${value}%` : value.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {t(`analytics:metrics.${key}`)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketValidationChart;