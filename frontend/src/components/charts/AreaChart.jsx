/**
 * AreaChart Component
 * Reusable area chart for stacked data using Recharts
 */

import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const AreaChart = ({
  data = [],
  areas = [],
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  xAxisKey = 'date',
  stackId = 'default',
  className = '',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
  yAxisLabel = '',
  xAxisLabel = '',
  fillOpacity = 0.7
}) => {
  const { isRTL } = useLanguageDirection();

  // Custom tooltip component for RTL support
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Calculate total for stacked areas
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {total > 0 && ` (${((entry.value / total) * 100).toFixed(1)}%)`}
            </p>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <p className="text-sm font-medium text-gray-900">
              Total: {total.toLocaleString()}
            </p>
          </div>
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

  // Custom dot component for area charts
  const CustomDot = (props) => {
    const { cx, cy, fill } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
        opacity={0.8}
      />
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-2xl mb-2">📈</div>
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{
            top: 20,
            right: isRTL ? 10 : 30,
            left: isRTL ? 30 : 10,
            bottom: 20,
          }}
        >
          <defs>
            {areas.map((area, index) => (
              <linearGradient key={`gradient-${index}`} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={area.color || colors[index % colors.length]} stopOpacity={fillOpacity} />
                <stop offset="95%" stopColor={area.color || colors[index % colors.length]} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>

          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          )}

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
            label={yAxisLabel ? {
              value: yAxisLabel,
              angle: isRTL ? 90 : -90,
              position: 'insideLeft'
            } : undefined}
          />

          {showTooltip && <Tooltip content={<CustomTooltip />} />}

          {areas.map((area, index) => (
            <Area
              key={area.key || index}
              type="monotone"
              dataKey={area.dataKey}
              stackId={area.stackId || stackId}
              stroke={area.strokeColor || area.color || colors[index % colors.length]}
              fill={`url(#gradient-${area.dataKey})`}
              strokeWidth={area.strokeWidth || 2}
              dot={area.showDots ? <CustomDot /> : false}
              activeDot={area.showActiveDot !== false ? {
                r: 6,
                fill: area.color || colors[index % colors.length],
                stroke: '#fff',
                strokeWidth: 2
              } : false}
              name={area.name}
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
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AreaChart;