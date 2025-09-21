/**
 * LineChart Component
 * Reusable line chart for time series data using Chart.js
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({
  data = [],
  lines = [],
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  xAxisKey = 'date',
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
    const datasets = lines.map((line, index) => ({
      label: line.name,
      data: data.map(item => item[line.dataKey]),
      borderColor: line.color || colors[index % colors.length],
      backgroundColor: (line.color || colors[index % colors.length]) + '20',
      borderWidth: line.strokeWidth || 2,
      pointRadius: line.showDots !== false ? 4 : 0,
      pointHoverRadius: line.showActiveDot !== false ? 6 : 0,
      tension: 0.1
    }));

    return { labels, datasets };
  }, [data, lines, colors, xAxisKey]);

  // Chart.js options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        rtl: isRTL,
        labels: {
          usePointStyle: true,
          padding: 20
        }
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
        displayColors: true,
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
        reverse: isRTL
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
          <div className="text-2xl mb-2">📈</div>
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart;