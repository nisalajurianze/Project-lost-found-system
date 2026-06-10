// ============================================
// Dashboard Line Chart Component
// Visualises monthly lost item trends
// ============================================

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
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardChart = ({ data = [] }) => {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        fill: true,
        label: 'Lost Reports',
        data: data.map(d => d.count),
        borderColor: 'rgba(99, 102, 241, 1)', // Indigo primary
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          stepSize: 1,
          font: { family: 'Inter' }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: 'Inter' }
        }
      }
    }
  };

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default DashboardChart;
