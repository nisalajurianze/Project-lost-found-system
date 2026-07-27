import React, { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';

const ScrollToTopButton = () => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 300);
    const handleAssistantState = (event) => setAssistantOpen(Boolean(event.detail?.isOpen));
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    window.addEventListener('lf:assistant-state', handleAssistantState);
    toggleVisibility();
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      window.removeEventListener('lf:assistant-state', handleAssistantState);
    };
  }, []);

  const scrollToTop = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && !assistantOpen && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-[calc(var(--mobile-bottom-nav-height)+0.75rem)] left-4 z-50 flex min-h-12 min-w-12 items-center justify-center rounded-full bg-primary-600 p-3 text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 sm:bottom-6 sm:left-6 no-print"
          aria-label={t('common.scrollTop')}
        >
          <FiArrowUp className="text-xl" aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTopButton;
