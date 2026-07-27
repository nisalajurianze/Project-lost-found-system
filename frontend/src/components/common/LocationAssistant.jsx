import React, { useEffect, useState } from 'react';
import Input from './Input';
import useDebounce from '../../hooks/useDebounce';
import aiService from '../../services/aiService';
import { CheckCircle2, Loader2, MapPin, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const LocationAssistant = ({ label, name, value, onChange, error, required = false, placeholder = '' }) => {
  const { t } = useLanguage();
  const debounced = useDebounce(value, 550);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (String(debounced || '').trim().length < 3) {
        setResult(null);
        return;
      }
      setLoading(true);
      try {
        const data = await aiService.resolveLocation(debounced);
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [debounced]);

  return (
    <div className="space-y-2">
      <Input
        label={label}
        name={name}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        aria-describedby={`${name}-location-help`}
      />
      <div id={`${name}-location-help`} className="min-h-5 text-xs text-surface-500 dark:text-surface-400" aria-live="polite">
        {loading && <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('report.locationInterpreting')}</span>}
        {!loading && result?.best && (
          <div className={`rounded-lg border p-2 ${result.needsClarification ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'}`}>
            <div className="flex items-start gap-2">
              {result.needsClarification ? <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />}
              <div>
                <strong>{result.best.canonicalName}</strong> · {t('report.locationConfidence', { confidence: result.best.confidence })}
                <span className="block">{result.best.verificationStatus.replaceAll('-', ' ')} · {result.best.area}</span>
              </div>
            </div>
          </div>
        )}
        {!loading && result?.suggestions?.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2" aria-label={t('report.locationSuggestions')}>
            {result.suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onChange({ target: { value: suggestion.canonicalName } })}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-left text-xs hover:border-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-surface-700 dark:bg-surface-900"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {suggestion.canonicalName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationAssistant;
