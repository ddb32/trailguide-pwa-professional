/**
 * BarChart Component
 * Reusable bar chart for categorical data using Recharts
 */

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const BarChart = ({
  data = [],
  bars = [],
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  xAxisKey = 'name',
  layout = 'horizontal', // 'horizontal' or 'vertical'
  className = '',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
  yAxisLabel = '',
  xAxisLabel = '',
  barSize = undefined
}) => {
  const { isRTL } = useLanguageDirection();

  // Custom tooltip component for RTL support
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format tick values for RTL
  const formatTick = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  // Custom label formatter for bars
  const renderBarLabel = (props) => {
    const { x, y, width, height, value } = props;

    if (layout === 'vertical') {
      return (
        <text
          x={x + width + 5}
          y={y + height / 2}
          fill="#374151"
          textAnchor="start"
          dy={4}
          fontSize={12}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </text>
      );
    } else {
      return (
        <text
          x={x + width / 2}
          y={y - 5}
          fill="#374151"
          textAnchor="middle"
          fontSize={12}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </text>
      );
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          layout={layout}
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

          {layout === 'vertical' ? (
            <>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={formatTick}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={formatTick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={formatTick}
                orientation={isRTL ? 'right' : 'left'}
              />
            </>
          )}

          {showTooltip && <Tooltip content={<CustomTooltip />} />}

          {bars.map((bar, index) => (
            <Bar
              key={bar.key || index}
              dataKey={bar.dataKey}
              fill={bar.color || colors[index % colors.length]}
              name={bar.name}
              radius={bar.radius || [2, 2, 0, 0]}
              maxBarSize={barSize || (layout === 'vertical' ? 40 : undefined)}
              label={bar.showLabels ? renderBarLabel : false}
            />
          ))}

          {showLegend && (
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                direction: isRTL ? 'rtl' : 'ltr'
              }}
            />
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;