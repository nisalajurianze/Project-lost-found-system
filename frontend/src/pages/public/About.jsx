// ============================================
// About Page Component
// System architecture descriptions and project scope
// ============================================

import React from 'react';
import { FiCpu, FiAward, FiEye, FiShield } from 'react-icons/fi';

export const About = () => {
  return (
    <div className="flex-1 py-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold font-display text-surface-900 dark:text-white">
            About the Project
          </h1>
          <p className="text-base text-surface-500 dark:text-surface-400 mt-2">
            Smart Lost & Found Management System - University Project Submission
          </p>
        </div>

        {/* Card block */}
        <div className="glass-card bg-white dark:bg-surface-800 p-8 border border-surface-200 dark:border-surface-700/60 shadow-lg mb-8">
          <h3 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-4">
            System Mission & Scope
          </h3>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed mb-4">
            In any university, thousands of items (student ID cards, keys, wallets, expensive calculators, smartphones, and notebooks) are lost daily. Traditional lost & found counters rely on manual registers, blackboards, or unorganized social media pages.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            The <strong>Smart Lost & Found Management System</strong> is designed to solve this by providing a unified, real-time, AI-assisted platform. Students can instantly report lost property, list found objects, and get automated recommendations showing exact items registered by other campus members.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-5 rounded-xl border border-surface-200/60 dark:border-surface-700 bg-white dark:bg-surface-800">
            <FiCpu className="text-3xl text-primary-500 mb-3" />
            <h4 className="text-base font-bold font-display text-surface-900 dark:text-white mb-2">
              Automated Matching
            </h4>
            <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
              We compile similarity scores across locations, categories, names, and date fields to match records instantly.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-surface-200/60 dark:border-surface-700 bg-white dark:bg-surface-800">
            <FiEye className="text-3xl text-cyan-500 mb-3" />
            <h4 className="text-base font-bold font-display text-surface-900 dark:text-white mb-2">
              Vision AI Labels
            </h4>
            <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
              Uploaded photos are analyzed in the background to automatically identify objects, label classes, and colors.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-surface-200/60 dark:border-surface-700 bg-white dark:bg-surface-800">
            <FiAward className="text-3xl text-emerald-500 mb-3" />
            <h4 className="text-base font-bold font-display text-surface-900 dark:text-white mb-2">
              Secure Reclaims
            </h4>
            <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
              Campus administration verifies student credentials and image proof before approving reclaims.
            </p>
          </div>
        </div>

        {/* Data & Privacy Policies */}
        <div className="glass-card bg-white dark:bg-surface-800 p-8 border border-surface-200 dark:border-surface-700/60 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FiShield className="text-2xl text-primary-500" />
            <h3 className="text-xl font-bold font-display text-surface-900 dark:text-white">
              Data & System Policies
            </h3>
          </div>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed mb-4">
            To maintain a clean and relevant platform, the system automatically manages item records using the following retention rules:
          </p>
          <ul className="list-disc list-inside text-sm text-surface-600 dark:text-surface-300 space-y-2 mb-4">
            <li><strong>Auto-Delete of Inactive Items:</strong> Any lost or found report that has had no activity (no claims, updates, or matches) for 30 days is automatically archived and hidden.</li>
            <li><strong>Auto-Delete of Claimed Items:</strong> Items that have been successfully claimed and marked as 'Done' will remain visible for 3 days before being automatically archived.</li>
            <li><strong>Auto-Delete of Abandoned Claims:</strong> If a claim is confirmed by the owner, but neither party marks the item as 'Done' for 14 days, the record is automatically archived.</li>
          </ul>
          <p className="text-sm text-surface-500 dark:text-surface-400 italic">
            Note: "Auto-Deleted" or archived items are hidden from the public timeline but remain in the database securely for administrative review.
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default About;

