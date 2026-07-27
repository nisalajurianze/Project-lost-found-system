import React from 'react';
import { FiCpu, FiAward, FiEye, FiShield } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

export const About = () => {
  const { t } = useLanguage();
  const pillars = [
    { icon: <FiCpu className="text-3xl text-primary-500 mb-3" aria-hidden="true" />, title: t('about.matchingTitle'), description: t('about.matchingDesc') },
    { icon: <FiEye className="text-3xl text-cyan-500 mb-3" aria-hidden="true" />, title: t('about.visionTitle'), description: t('about.visionDesc') },
    { icon: <FiAward className="text-3xl text-emerald-500 mb-3" aria-hidden="true" />, title: t('about.reclaimTitle'), description: t('about.reclaimDesc') },
  ];

  return (
    <div className="flex-1 py-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold font-display text-surface-900 dark:text-white">{t('about.title')}</h1>
          <p className="text-base text-surface-500 dark:text-surface-400 mt-2">{t('about.subtitle')}</p>
        </div>

        <section className="glass-card bg-white dark:bg-surface-800 p-8 border border-surface-200 dark:border-surface-700/60 shadow-lg mb-8" aria-labelledby="about-mission">
          <h2 id="about-mission" className="text-xl font-bold font-display text-surface-900 dark:text-white mb-4">{t('about.missionTitle')}</h2>
          <p className="text-base text-surface-600 dark:text-surface-300 leading-relaxed mb-4">{t('about.missionP1')}</p>
          <p className="text-base text-surface-600 dark:text-surface-300 leading-relaxed">{t('about.missionP2')}</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12" aria-label={t('about.subtitle')}>
          {pillars.map((pillar) => (
            <article key={pillar.title} className="p-5 rounded-xl border border-surface-200/60 dark:border-surface-700 bg-white dark:bg-surface-800">
              {pillar.icon}
              <h2 className="text-lg font-bold font-display text-surface-900 dark:text-white mb-2">{pillar.title}</h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{pillar.description}</p>
            </article>
          ))}
        </section>

        <section className="glass-card bg-white dark:bg-surface-800 p-8 border border-surface-200 dark:border-surface-700/60 shadow-lg mb-8" aria-labelledby="about-policies">
          <div className="flex items-center gap-3 mb-4">
            <FiShield className="text-2xl text-primary-500" aria-hidden="true" />
            <h2 id="about-policies" className="text-xl font-bold font-display text-surface-900 dark:text-white">{t('about.policyTitle')}</h2>
          </div>
          <p className="text-base text-surface-600 dark:text-surface-300 leading-relaxed mb-4">{t('about.policyIntro')}</p>
          <ul className="list-disc list-inside text-sm text-surface-600 dark:text-surface-300 space-y-3 mb-4">
            <li><strong>{t('about.publicPrivacyLabel')}:</strong> {t('about.publicPrivacyDesc')}</li>
            <li><strong>{t('about.privateEvidenceLabel')}:</strong> {t('about.privateEvidenceDesc')}</li>
            <li><strong>{t('about.retentionLabel')}:</strong> {t('about.retentionDesc')}</li>
          </ul>
          <p className="text-sm text-surface-500 dark:text-surface-400 italic">{t('about.archiveNote')}</p>
        </section>
      </div>
    </div>
  );
};

export default About;
