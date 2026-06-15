// ============================================
// Home Page Component
// Hero gradient panels, statistics counts, and listings summaries
// ============================================

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlusCircle, FiSearch, FiFileText, FiShield, FiCpu, FiMessageSquare } from 'react-icons/fi';
import Button from '../../components/common/Button';
import lostItemService from '../../services/lostItemService';
import foundItemService from '../../services/foundItemService';

export const Home = () => {
  const navigate = useNavigate();
  
  const [latestLost, setLatestLost] = useState([]);
  const [latestFound, setLatestFound] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const [lostRes, foundRes] = await Promise.all([
          lostItemService.getLostItems({ limit: 3 }),
          foundItemService.getFoundItems({ limit: 3 })
        ]);
        setLatestLost(lostRes.items || []);
        setLatestFound(foundRes.items || []);
      } catch (err) {
        console.error('Failed to fetch latest reports for home page:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatest();
  }, []);

  const stats = [
    { label: 'Belongings Recovered', value: '180+', color: 'text-emerald-500' },
    { label: 'Active Daily Users', value: '450+', color: 'text-primary-500' },
    { label: 'AI Match Accuracy', value: '96%', color: 'text-cyan-500' }
  ];

  const features = [
    {
      title: 'AI Similarity Matching',
      desc: 'Our system auto-analyzes item titles, descriptions, and uploaded images using heuristics and Vision AI to match lost property with found logs instantly.',
      icon: <FiCpu className="text-3xl text-cyan-500" />
    },
    {
      title: 'Real-Time WebSockets',
      desc: 'Get instantly notified in-app the millisecond a potential match is reported or an administrator approves your ownership claim.',
      icon: <FiPlusCircle className="text-3xl text-primary-500" />
    },
    {
      title: 'Admin Verification',
      desc: 'Submit detailed text and image proof. Campus administrative officers verify ownership claims manually before releasing property.',
      icon: <FiShield className="text-3xl text-emerald-500" />
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      
      {/* Hero Section */}
      <section className="relative hero-bg py-20 lg:py-32 flex items-center justify-center text-center text-white">
        <div className="hero-pattern" />
        <div className="page-container relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/20 inline-block"
          >
            University Campus Lost & Found System
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-tight tracking-tight text-shadow"
          >
            Recover Your Lost Belongings{' '}
            <span className="text-primary-300">Intelligently</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-primary-100 mt-6 max-w-2xl leading-relaxed text-shadow"
          >
            Automating campus property recovery using automated matching algorithms, instant push alerts, and admin claim verifications.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4 justify-center mt-10"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/dashboard/report-lost')}
              icon={<FiPlusCircle />}
            >
              Report Lost Item
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/lost-items')}
              icon={<FiSearch />}
              className="border-white text-white hover:bg-white/10 dark:border-white dark:text-white dark:hover:bg-white/10"
            >
              Browse Lost Directory
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-12 bg-white dark:bg-surface-950 border-y border-surface-200/50 dark:border-surface-800/50">
        <div className="page-container max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className={`text-4xl font-extrabold font-display ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-sm font-semibold text-surface-500 dark:text-surface-400 mt-2">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 lg:py-24 page-container max-w-6xl mx-auto">
        <h2 className="text-2xl lg:text-3xl font-extrabold font-display text-center text-surface-900 dark:text-white mb-12">
          Designed for High-Performance Recovery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, idx) => (
            <div key={idx} className="glass-card flex flex-col p-6 items-start text-left bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <div className="p-3 bg-surface-50 dark:bg-surface-900 rounded-2xl mb-4">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Listings Summary Section */}
      <section className="py-16 bg-surface-100 dark:bg-surface-950/20 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="page-container max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold font-display text-surface-900 dark:text-white">
                Latest Lost Reports
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                Recent items reported missing by students
              </p>
            </div>
            <Link to="/lost-items" className="text-sm font-semibold text-primary-500 hover:text-primary-600">
              View All &rarr;
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="h-64 bg-surface-250 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestLost.slice(0, 3).map((item) => (
                <div key={item._id} className="card bg-white dark:bg-surface-800 p-5 shadow-md flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-500 dark:text-primary-400 uppercase">
                      {item.category}
                    </span>
                    <h4 className="text-base font-bold text-surface-900 dark:text-white mt-1 leading-snug truncate">
                      {item.itemName}
                    </h4>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-700/50 flex flex-col gap-1 text-xs text-surface-400">
                    <p>📍 Location: <strong>{item.lostLocation}</strong></p>
                    <p>📅 Reported: <strong>{new Date(item.createdAt).toLocaleDateString()}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Home;

