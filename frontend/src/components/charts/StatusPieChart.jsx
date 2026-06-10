// ============================================
// Status Pie Chart Component
// Doughnut chart showing item status distributions
// ============================================

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const StatusPieChart = ({ data = {} }) => {
  const labels = Object.keys(data).map(key => key.toUpperCase());
  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)', // amber
          'rgba(99, 102, 241, 0.8)', // indigo
          'rgba(16, 185, 129, 0.8)', // emerald
          'rgba(107, 114, 128, 0.8)'  // grey
        ],
        borderColor: [
          '#f59e0b',
          '#6366f1',
          '#10b981',
          '#6b7280'
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { family: 'Inter', size: 11 }
        }
      },
      tooltip: {
        cornerRadius: 8,
        padding: 10
      }
    },
    cutout: '65%'
  };

  return (
    <div className="h-64 w-full flex items-center justify-center">
      {values.length > 0 && values.reduce((a, b) => a + b, 0) > 0 ? (
        <Doughnut data={chartData} options={options} />
      ) : (
        <p className="text-sm text-surface-400">No status distributions available.</p>
      )}
    </div>
  );
};

export default StatusPieChart;
// 

