/**
 * PlaceholderChart Component
 * Temporary placeholder for charts while resolving dependencies
 */

import React from 'react';

const PlaceholderChart = ({
  type = 'chart',
  height = 300,
  className = '',
  title = 'Chart'
}) => {
  const getChartIcon = () => {
    switch (type) {
      case 'line': return '📈';
      case 'bar': return '📊';
      case 'pie': return '🥧';
      case 'area': return '📊';
      default: return '📈';
    }
  };

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-dashed border-blue-300 ${className}`}
      style={{ height: `${height}px` }}
    >
      <div className="text-center">
        <div className="text-4xl mb-4">{getChartIcon()}</div>
        <p className="text-lg font-medium text-blue-700 mb-2">{title}</p>
        <p className="text-sm text-blue-600">Analytics visualization ready</p>
        <p className="text-xs text-blue-500 mt-2">Chart implementation in progress</p>
      </div>
    </div>
  );
};

export default PlaceholderChart;