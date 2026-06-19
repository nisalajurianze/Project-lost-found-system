// ============================================
// Monthly Reports Bar Chart Component
// Compares lost vs found reports side-by-side
// ============================================

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const MonthlyReportsChart = ({ monthlyLost = [], monthlyFound = [] }) => {
  // Merge month labels from both arrays uniquely
  const monthsSet = new Set([
    ...monthlyLost.map(d => d.month),
    ...monthlyFound.map(d => d.month)
  ]);
  const sortedMonths = Array.from(monthsSet).sort();

  const getLostCount = (month) => {
    const found = monthlyLost.find(d => d.month === month);
    return found ? found.count : 0;
  };

  const getFoundCount = (month) => {
    const found = monthlyFound.find(d => d.month === month);
    return found ? found.count : 0;
  };

  const chartData = {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Lost Reports',
        data: sortedMonths.map(m => getLostCount(m)),
        backgroundColor: 'rgba(99, 102, 241, 0.85)', // Indigo-500
        hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        label: 'Found Listings',
        data: sortedMonths.map(m => getFoundCount(m)),
        backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald-500
        hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 12, weight: '500' },
          usePointStyle: true,
          boxWidth: 8,
          padding: 20
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
    scales: {
      y: {
        grid: { color: 'rgba(156, 163, 175, 0.1)', drawBorder: false },
        ticks: { font: { family: 'Inter', size: 11 }, stepSize: 1, color: '#9ca3af' },
        border: { display: false }
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af' },
        border: { display: false }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="h-64 w-full">
      {sortedMonths.length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <p className="text-sm text-surface-400">No monthly analytics logs available.</p>
      )}
    </div>
  );
};

export default MonthlyReportsChart;

