/**
 * PieChart Component
 * Reusable pie chart for distribution data using Recharts
 */

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const PieChart = ({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  showLegend = true,
  showTooltip = true,
  showLabels = false,
  innerRadius = 0,
  outerRadius = undefined,
  className = '',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
  labelFormatter = undefined
}) => {
  const { isRTL } = useLanguageDirection();

  // Custom tooltip component for RTL support
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-sm font-medium text-gray-900" style={{ color: data.color }}>
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: data.color }}></span>
            {data.name}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
            {data.payload.percentage && ` (${data.payload.percentage}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    if (!showLabels || percent < 0.05) return null; // Don't show labels for slices smaller than 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Calculate percentages for data
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

    return data.map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item[dataKey] || 0) / total * 100).toFixed(1) : 0,
      color: colors[index % colors.length]
    }));
  }, [data, dataKey, colors]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-2xl mb-2">🥧</div>
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderCustomLabel : false}
            outerRadius={outerRadius || Math.min(height * 0.35, 120)}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>

          {showTooltip && <Tooltip content={<CustomTooltip />} />}

          {showLegend && (
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                direction: isRTL ? 'rtl' : 'ltr',
                fontSize: '12px'
              }}
              formatter={(value, entry) => (
                <span style={{ color: entry.color }}>
                  {labelFormatter ? labelFormatter(value, entry) : value}
                </span>
              )}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;