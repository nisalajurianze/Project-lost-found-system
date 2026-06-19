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
          'rgba(245, 158, 11, 0.9)', // amber
          'rgba(99, 102, 241, 0.9)', // indigo
          'rgba(16, 185, 129, 0.9)', // emerald
          'rgba(107, 114, 128, 0.9)'  // grey
        ],
        hoverBackgroundColor: [
          'rgba(245, 158, 11, 1)',
          'rgba(99, 102, 241, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(107, 114, 128, 1)'
        ],
        borderWidth: 0,
        hoverOffset: 8
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
            padding: 20,
            font: { family: 'Inter', size: 12, weight: '500' },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Inter', size: 13 },
          bodyFont: { family: 'Inter', size: 13 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: 4
        }
      },
      cutout: '75%',
      layout: {
        padding: {
          bottom: 10
        }
      }
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

