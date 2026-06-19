import React, { useState, useEffect } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-[90px] left-4 sm:bottom-6 sm:left-6 z-50 p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all focus:outline-none flex items-center justify-center group no-print"
          title="Scroll to top"
        >
          <FiArrowUp className="text-xl group-hover:-translate-y-1 transition-transform" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTopButton;
