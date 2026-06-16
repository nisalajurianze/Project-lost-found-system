import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const AILoadingToast = ({ t, message = "✨ AI is analyzing your image...", isComplete = false }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      return;
    }

    // Animate progress bar to 95% slowly (Vision AI takes about 4-8 seconds)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        // 0-40%: 2 per 100ms = 2s
        // 40-75%: 1 per 100ms = 3.5s
        // 75-95%: 0.5 per 100ms = 4s
        // Total time to 95% = ~9.5 seconds
        const increment = prev < 40 ? 2 : prev < 75 ? 1 : 0.5;
        return prev + increment;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isComplete]);

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-sm w-full bg-white dark:bg-surface-800 shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-surface-200 dark:border-surface-700 overflow-hidden`}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              {message}
            </p>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              Extracting details and keywords...
            </p>
            
            {/* Progress Bar Container */}
            <div className="mt-3 w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 relative overflow-hidden">
              <div 
                className="bg-primary-600 dark:bg-primary-500 h-1.5 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {/* Percentage */}
            <div className="mt-1 flex justify-end">
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                {Math.floor(progress)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex border-l border-surface-200 dark:border-surface-700">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AILoadingToast;
