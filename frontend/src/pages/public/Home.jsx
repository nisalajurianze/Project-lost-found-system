import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlusCircle, FiSearch, FiShield, FiCpu, FiBell } from 'react-icons/fi';
import { MapPin, Calendar } from 'lucide-react';
import Button from '../../components/common/Button';
import lostItemService from '../../services/lostItemService';
import foundItemService from '../../services/foundItemService';
import statsService from '../../services/statsService';
import SpaceBackground from '../../components/common/SpaceBackground';
import { useLanguage } from '../../i18n/LanguageContext';

const ListingCard = ({ item, type, t }) => {
  const isLost = type === 'lost';
  const location = isLost ? item.lostLocation : item.foundLocation;
  const date = isLost ? item.createdAt : (item.foundDate || item.createdAt);
  return (
    <Link to={`/${type}-items/${item._id}`} className={`card ${isLost ? 'lost-card-hover' : 'found-card-hover'} bg-white dark:bg-surface-800 p-5 shadow-md flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 group`}>
      <div>
        <span className={`text-xs font-bold uppercase ${isLost ? 'text-primary-500 dark:text-primary-400' : 'text-emerald-500'}`}>{item.category}</span>
        <h3 className="mt-1 truncate text-base font-bold text-surface-900 dark:text-white">{item.itemName}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">{item.description}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-surface-100 pt-3 text-sm text-surface-500 dark:border-surface-700/50 dark:text-surface-400">
        <p className="flex items-center gap-2"><MapPin size={16} aria-hidden="true" /><span>{t('home.location')}: <strong>{location}</strong></span></p>
        <p className="flex items-center gap-2"><Calendar size={16} aria-hidden="true" /><span>{t(isLost ? 'home.reported' : 'home.found')}: <strong>{new Date(date).toLocaleDateString()}</strong></span></p>
      </div>
    </Link>
  );
};

export const Home = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [latestLost, setLatestLost] = useState([]);
  const [latestFound, setLatestFound] = useState([]);
  const [publicStats, setPublicStats] = useState({ completedRecoveries: 0, activeAccounts: 0, matchSuggestions: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLatest = async () => {
      try {
        const [lostRes, foundRes, statsRes] = await Promise.all([
          lostItemService.getLostItems({ limit: 3 }),
          foundItemService.getFoundItems({ limit: 3 }),
          statsService.getPublicStats().catch(() => ({ data: { completedRecoveries: 0, activeAccounts: 0, matchSuggestions: 0 } }))
        ]);
        if (!active) return;
        setLatestLost(lostRes.items || []);
        setLatestFound(foundRes.items || []);
        setPublicStats(statsRes?.data || { completedRecoveries: 0, activeAccounts: 0, matchSuggestions: 0 });
      } catch (error) {
        console.error('Failed to fetch latest reports for home page:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchLatest();
    return () => { active = false; };
  }, []);

  const stats = [
    { label: t('home.completedRecoveries'), value: publicStats.completedRecoveries, color: 'text-emerald-500' },
    { label: t('home.activeAccounts'), value: publicStats.activeAccounts, color: 'text-primary-500' },
    { label: t('home.openMatches'), value: publicStats.matchSuggestions, color: 'text-cyan-500' }
  ];
  const features = [
    { title: t('home.featureMatching'), desc: t('home.featureMatchingDesc'), icon: FiCpu, color: 'text-cyan-500' },
    { title: t('home.featureRealtime'), desc: t('home.featureRealtimeDesc'), icon: FiBell, color: 'text-primary-500' },
    { title: t('home.featureHuman'), desc: t('home.featureHumanDesc'), icon: FiShield, color: 'text-emerald-500' }
  ];

  const ListingSection = ({ title, description, path, items, type, background = '' }) => (
    <section className={`border-t border-surface-200/50 py-16 dark:border-surface-800/50 ${background}`}>
      <div className="page-container mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold text-surface-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p></div><Link to={path} className="text-sm font-semibold text-primary-600 dark:text-primary-300">{t('common.viewAll')} →</Link></div>
        {isLoading ? <div className="grid gap-6 md:grid-cols-3">{[1,2,3].map((key) => <div key={key} className="h-64 animate-pulse rounded-2xl bg-surface-200 dark:bg-surface-800" />)}</div> : <div className="grid gap-6 md:grid-cols-3">{items.slice(0,3).map((item) => <ListingCard key={item._id} item={item} type={type} t={t} />)}</div>}
      </div>
    </section>
  );

  return (
    <div className="flex flex-1 flex-col bg-surface-50 transition-colors duration-300 dark:bg-surface-900">
      <section className="hero-bg relative flex items-center justify-center py-20 text-center text-white lg:py-28">
        <SpaceBackground />
        <div className="page-container relative z-10 mx-auto flex max-w-5xl flex-col items-center">
          <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src="/logo.png" alt="Smart L&F" className="-mt-16 mb-3 h-32 w-32 object-contain drop-shadow-2xl sm:h-40 sm:w-40" />
          <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">{t('home.badge')}</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">{t('home.title')} <span className="text-primary-300">{t('home.titleAccent')}</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 max-w-3xl text-lg leading-relaxed text-primary-100">{t('home.subtitle')}</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-9 flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" onClick={() => navigate('/dashboard/report-lost')} icon={<FiPlusCircle />}>{t('home.reportLost')}</Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/report-found')} icon={<FiShield />} className="border-white text-white hover:bg-white/10 dark:border-white dark:text-white">{t('home.reportFound')}</Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/lost-items')} icon={<FiSearch />} className="border-white text-white hover:bg-white/10 dark:border-white dark:text-white">{t('home.searchReports')}</Button>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-surface-200/50 bg-white py-12 dark:border-surface-800/50 dark:bg-surface-950"><div className="page-container mx-auto grid max-w-6xl gap-8 text-center md:grid-cols-3">{stats.map((stat) => <div key={stat.label} className="flex flex-col items-center"><span className={`text-4xl font-extrabold ${stat.color}`}>{stat.value}</span><span className="mt-2 text-sm font-semibold text-surface-500 dark:text-surface-400">{stat.label}</span></div>)}</div></section>

      <section className="page-container mx-auto max-w-6xl py-16 lg:py-20"><h2 className="mb-10 text-center text-2xl font-extrabold text-surface-900 dark:text-white lg:text-3xl">{t('home.featuresTitle')}</h2><div className="grid gap-6 md:grid-cols-3">{features.map(({ title, desc, icon: Icon, color }) => <article key={title} className="glass-card border border-surface-200 bg-white p-6 text-left dark:border-surface-700 dark:bg-surface-800"><div className="mb-4 w-fit rounded-2xl bg-surface-50 p-3 dark:bg-surface-900"><Icon className={`text-3xl ${color}`} aria-hidden="true" /></div><h3 className="mb-2 text-lg font-bold text-surface-900 dark:text-white">{title}</h3><p className="text-sm leading-relaxed text-surface-500 dark:text-surface-400">{desc}</p></article>)}</div></section>

      <ListingSection title={t('home.latestLost')} description={t('home.latestLostDesc')} path="/lost-items" items={latestLost} type="lost" background="bg-surface-100 dark:bg-surface-950/20" />
      <ListingSection title={t('home.latestFound')} description={t('home.latestFoundDesc')} path="/found-items" items={latestFound} type="found" background="bg-white dark:bg-surface-900" />
    </div>
  );
};
export default Home;
