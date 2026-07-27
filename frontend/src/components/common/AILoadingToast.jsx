import React from 'react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../i18n/LanguageContext';

const AILoadingToast = ({ t: toastInstance, message = '', isComplete = false }) => {
  const { t } = useLanguage();
  return (
    <div className={`${toastInstance.visible ? 'animate-enter' : 'animate-leave'} flex w-full max-w-sm overflow-hidden rounded-lg border border-surface-200 bg-white shadow-xl ring-1 ring-black/5 pointer-events-auto dark:border-surface-700 dark:bg-surface-800`} role="status" aria-live="polite">
      <div className="flex-1 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30"><svg aria-hidden="true" className={`${isComplete ? '' : 'animate-spin'} h-5 w-5 text-primary-600 dark:text-primary-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div></div>
          <div className="ml-3 flex-1"><p className="text-sm font-medium text-surface-900 dark:text-white">{message || t('aiLoading.defaultMessage')}</p><p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{t('aiLoading.extracting')}</p><div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700" aria-hidden="true"><div className={`${isComplete ? 'w-full' : 'w-2/5 animate-pulse'} h-full rounded-full bg-primary-600 dark:bg-primary-500`} /></div></div>
        </div>
      </div>
      <div className="flex border-l border-surface-200 dark:border-surface-700"><button type="button" onClick={() => toast.dismiss(toastInstance.id)} className="flex w-full items-center justify-center rounded-r-lg border border-transparent p-4 text-sm font-medium text-surface-500 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-surface-400 dark:hover:text-surface-200">{t('common.close')}</button></div>
    </div>
  );
};

export default AILoadingToast;
