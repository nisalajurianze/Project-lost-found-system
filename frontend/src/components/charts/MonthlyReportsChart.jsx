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
        backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Found Listings',
        data: sortedMonths.map(m => getFoundCount(m)),
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // Green
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4
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
          font: { family: 'Inter', size: 11 }
        }
      },
      tooltip: {
        cornerRadius: 8,
        padding: 10
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { font: { family: 'Inter' }, stepSize: 1 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter' } }
      }
    }
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
