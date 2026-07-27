import React from 'react';
import Input from './Input';
import Textarea from './Textarea';
import { useLanguage } from '../../i18n/LanguageContext';

const ItemAttributeFields = ({ values, setters }) => {
  const { t } = useLanguage();

  return (
    <section className="space-y-4 rounded-2xl border border-surface-200 bg-surface-50/60 p-4 dark:border-surface-800 dark:bg-surface-900/30" aria-labelledby="item-characteristics-title">
      <div>
        <h3 id="item-characteristics-title" className="text-base font-bold text-surface-900 dark:text-white">{t('report.attributesTitle')}</h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{t('report.attributesDesc')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('report.brand')} name="brand" value={values.brand} onChange={(event) => setters.setBrand(event.target.value)} placeholder={t('report.brandPlaceholder')} />
        <Input label={t('report.model')} name="model" value={values.model} onChange={(event) => setters.setModel(event.target.value)} placeholder={t('report.modelPlaceholder')} />
        <Input label={t('report.colours')} name="colors" value={values.colors} onChange={(event) => setters.setColors(event.target.value)} placeholder={t('report.coloursPlaceholder')} helperText={t('report.coloursHelp')} />
        <Input label={t('report.material')} name="material" value={values.material} onChange={(event) => setters.setMaterial(event.target.value)} placeholder={t('report.materialPlaceholder')} />
      </div>
      <Textarea label={t('report.uniqueFeatures')} value={values.uniqueFeatures} onChange={(event) => setters.setUniqueFeatures(event.target.value)} placeholder={t('report.uniquePlaceholder')} helperText={t('report.uniqueHelp')} />
    </section>
  );
};

export default ItemAttributeFields;
