import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

const AccessibilityCaptionReview = ({ reportType, reportId, image }) => {
  const { language, t } = useLanguage();
  const [text, setText] = useState(image?.accessibilityAlt?.text || '');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => setText(image?.accessibilityAlt?.text || ''), [image?.accessibilityAlt?.text]);
  if (!image || !text) return null;
  const approve = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/ai/image-caption/${reportType}/${reportId}`, { text, language });
      toast.success(t('caption.approved'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('caption.failed'));
    } finally { setIsSaving(false); }
  };
  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20" aria-labelledby="caption-title">
      <h3 id="caption-title" className="font-bold text-surface-900 dark:text-white">{t('caption.title')}</h3>
      <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{t('caption.description')}</p>
      <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 500))} rows={3} className="mt-3 w-full rounded-xl border border-surface-300 bg-white p-3 text-sm dark:border-surface-700 dark:bg-surface-900" aria-label={t('caption.input')} />
      <button type="button" onClick={approve} disabled={isSaving || text.trim().length < 5} className="mt-2 min-h-10 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-60">{isSaving ? t('caption.saving') : t('caption.approve')}</button>
    </section>
  );
};

export default AccessibilityCaptionReview;
