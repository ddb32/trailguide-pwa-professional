/**
 * SimpleBarChart Component
 * Simple bar chart for categorical data using Chart.js
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SimpleBarChart = ({
  data = [],
  bars = [],
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  xAxisKey = 'name',
  layout = 'horizontal',
  className = '',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
  yAxisLabel = '',
  xAxisLabel = ''
}) => {
  const { isRTL } = useLanguageDirection();

  // Transform data for Chart.js format
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    const labels = data.map(item => item[xAxisKey]);
    const datasets = bars.map((bar, index) => ({
      label: bar.name,
      data: data.map(item => item[bar.dataKey]),
      backgroundColor: bar.color || colors[index % colors.length],
      borderColor: bar.color || colors[index % colors.length],
      borderWidth: 1
    }));

    return { labels, datasets };
  }, [data, bars, colors, xAxisKey]);

  // Chart.js options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: layout === 'vertical' ? 'y' : 'x',
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        rtl: isRTL
      },
      tooltip: {
        enabled: showTooltip,
        rtl: isRTL,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = typeof context.parsed.y === 'number' ?
              context.parsed.y.toLocaleString() : context.parsed.y;
            return `${context.dataset.label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel
        },
        grid: {
          display: showGrid,
          color: '#E5E7EB'
        },
        reverse: isRTL && layout === 'horizontal'
      },
      y: {
        display: true,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel
        },
        grid: {
          display: showGrid,
          color: '#E5E7EB'
        },
        position: isRTL ? 'right' : 'left',
        ticks: {
          callback: function(value) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          }
        }
      }
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
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default SimpleBarChart;