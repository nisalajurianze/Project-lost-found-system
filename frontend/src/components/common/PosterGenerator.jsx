import React, { useState } from 'react';
import { FiCheck, FiDownload, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

const PosterGenerator = ({ reportType, reportId }) => {
  const { language, t } = useLanguage();
  const [posterLanguage, setPosterLanguage] = useState(['en', 'si', 'ta'].includes(language) ? language : 'en');
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const response = await api.post(`/posters/${reportType}/${reportId}/preview`, { language: posterLanguage });
      setPreview(response.data?.data || null);
      setIsApproved(false);
    } catch {
      toast.error(t('poster.failed'));
    } finally { setIsLoading(false); }
  };

  const approve = async () => {
    if (!preview?.assetId) return;
    setIsLoading(true);
    try {
      await api.post(`/posters/${preview.assetId}/approve`);
      setIsApproved(true);
      toast.success(t('poster.approved'));
    } catch {
      toast.error(t('poster.failed'));
    } finally { setIsLoading(false); }
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20" aria-labelledby="poster-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 id="poster-title" className="font-bold text-surface-900 dark:text-white">{t('poster.title')}</h3><p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{t('poster.description')}</p></div>
        <div className="flex gap-2">
          <select value={posterLanguage} onChange={(event) => setPosterLanguage(event.target.value)} className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900" aria-label={t('poster.language')}>
            <option value="en">English</option><option value="si">සිංහල</option><option value="ta">தமிழ்</option><option value="singlish">Singlish</option>
          </select>
          <button type="button" onClick={generate} disabled={isLoading} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60"><FiImage />{t('poster.preview')}</button>
        </div>
      </div>
      {preview && (
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <img src={preview.downloadDataUrl} alt={t('poster.previewAlt')} className="w-full rounded-xl border border-surface-200 bg-surface-950" />
          <div className="flex flex-col justify-center gap-3 text-sm text-surface-700 dark:text-surface-200">
            <p>{preview.privacyNotice}</p><p className="break-all text-xs">{preview.deepLink}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={approve} disabled={isLoading || isApproved} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500 px-4 font-bold text-emerald-700 disabled:opacity-60 dark:text-emerald-300"><FiCheck />{isApproved ? t('poster.approved') : t('poster.approve')}</button>
              {isApproved && <a href={preview.downloadDataUrl} download={`smart-lf-${reportType}-poster.svg`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-surface-900 px-4 font-bold text-white dark:bg-white dark:text-surface-950"><FiDownload />{t('poster.download')}</a>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PosterGenerator;
