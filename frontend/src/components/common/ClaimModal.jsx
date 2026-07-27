import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { AlertCircle, Check, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, ListChecks, ShieldCheck, Target } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Textarea from './Textarea';
import ImageUpload from './ImageUpload';
import { submitNewClaim } from '../../redux/slices/claimSlice';
import claimService from '../../services/claimService';
import { useLanguage } from '../../i18n/LanguageContext';

const stepDefinitions = [
  { id: 1, labelKey: 'claim.stepConfirm', icon: Target },
  { id: 2, labelKey: 'claim.stepOwnership', icon: FileText },
  { id: 3, labelKey: 'claim.stepEvidence', icon: ImageIcon },
  { id: 4, labelKey: 'claim.stepVerification', icon: ListChecks },
  { id: 5, labelKey: 'claim.stepReview', icon: ShieldCheck },
];

const fallbackQuestions = (itemType, itemName, t) => {
  const item = itemName || t('claim.thisItem');
  return itemType === 'FoundItem'
    ? [
        { id: 'last-possession', question: t('claim.qLast', { item }) },
        { id: 'unique-detail', question: t('claim.qUnique') },
        { id: 'supporting-proof', question: t('claim.qProof') },
      ]
    : [
        { id: 'found-context', question: t('claim.qFound', { item }) },
        { id: 'custody-detail', question: t('claim.qCustody') },
        { id: 'safe-handover', question: t('claim.qHandover') },
      ];
};

const estimateEvidence = (description, answers, imageCount, t) => {
  let score = description.trim().length >= 120 ? 35 : description.trim().length >= 50 ? 25 : description.trim().length >= 10 ? 12 : 0;
  score += Math.min(35, answers.filter((entry) => entry.answer.trim().length >= 10).length * 12);
  score += Math.min(25, imageCount * 10);
  score = Math.min(100, score);
  return { score, level: score >= 70 ? t('claim.strong') : score >= 40 ? t('claim.fair') : t('claim.needsDetail') };
};

const ClaimModal = ({ isOpen, onClose, targetItemId, itemType, itemName, itemCategory = '', matchId = null }) => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [confirmedTarget, setConfirmedTarget] = useState(false);
  const [proofDescription, setProofDescription] = useState('');
  const [images, setImages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const steps = useMemo(() => stepDefinitions.map((entry) => ({ ...entry, label: t(entry.labelKey) })), [t]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setStep(1);
    setConfirmedTarget(false);
    setProofDescription('');
    setImages([]);
    setAnswers({});
    setErrors({});
    setIsQuestionLoading(true);
    claimService.getVerificationQuestions(itemType, targetItemId)
      .then((result) => {
        if (!active) return;
        const next = Array.isArray(result?.questions) && result.questions.length > 0
          ? result.questions
          : fallbackQuestions(itemType, itemName, t);
        setQuestions(next);
      })
      .catch(() => {
        if (active) setQuestions(fallbackQuestions(itemType, itemName, t));
      })
      .finally(() => { if (active) setIsQuestionLoading(false); });
    return () => { active = false; };
  }, [isOpen, itemName, itemType, targetItemId, t]);

  const answerEntries = useMemo(() => questions.map((entry) => ({
    question: entry.question,
    answer: String(answers[entry.id] || '').trim(),
  })), [answers, questions]);

  const assessment = useMemo(
    () => estimateEvidence(proofDescription, answerEntries, images.length, t),
    [answerEntries, images.length, proofDescription, t],
  );

  const validateStep = () => {
    const next = {};
    if (step === 1 && !confirmedTarget) next.confirmedTarget = t('claim.confirmError');
    if (step === 2 && proofDescription.trim().length < 10) next.proofDescription = t('claim.detailError');
    if (step === 4) {
      const answered = answerEntries.filter((entry) => entry.answer.length >= 2).length;
      if (answered < Math.min(2, questions.length)) next.answers = t('claim.answerError');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setErrors({});
    setStep((current) => Math.min(5, current + 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (proofDescription.trim().length < 10) {
      setErrors({ proofDescription: t('claim.detailError') });
      setStep(2);
      return;
    }
    const verificationAnswers = answerEntries.filter((entry) => entry.answer.length >= 2);
    if (verificationAnswers.length < Math.min(2, questions.length)) {
      setErrors({ answers: t('claim.answerError') });
      setStep(4);
      return;
    }

    const formData = new FormData();
    formData.append('proofDescription', proofDescription.trim());
    formData.append(itemType === 'FoundItem' ? 'foundItemId' : 'lostItemId', targetItemId);
    formData.append('verificationAnswers', JSON.stringify(verificationAnswers));
    if (matchId) formData.append('matchId', matchId);
    images.forEach((image) => formData.append('proofImages', image));

    try {
      setIsSubmitting(true);
      const result = await dispatch(submitNewClaim(formData)).unwrap();
      const serverLevel = result?.evidenceAssessment?.level;
      const evidence = serverLevel ? t('claim.evidenceSuffix', { level: serverLevel }) : '';
      toast.success(t('claim.success', { evidence }));
      onClose(true);
    } catch (error) {
      toast.error(error || t('claim.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={t('claim.secureTitle', { item: itemName })} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <nav aria-label={t('claim.progress')} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {steps.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              disabled={id > step}
              onClick={() => id < step && setStep(id)}
              aria-current={step === id ? 'step' : undefined}
              className={`min-h-14 rounded-xl border px-3 py-2 text-left text-xs font-semibold ${step === id ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-950/30 dark:text-primary-200' : id < step ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200' : 'border-surface-200 text-surface-400 dark:border-surface-700'}`}
            >
              <span className="flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden="true" /> {id}. {label}</span>
            </button>
          ))}
        </nav>

        {Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
            <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" aria-hidden="true" /> {Object.values(errors)[0]}</p>
          </div>
        )}

        {step === 1 && (
          <section className="space-y-4" aria-labelledby="claim-confirm-title">
            <div>
              <h3 id="claim-confirm-title" className="text-xl font-bold">{t('claim.confirmTitle')}</h3>
              <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">{t('claim.confirmDesc')}</p>
            </div>
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">{t(itemType === 'FoundItem' ? 'claim.foundReport' : 'claim.lostReport')}</p>
              <p className="mt-1 text-lg font-bold">{itemName}</p>
              {itemCategory && <p className="text-sm text-surface-500">{itemCategory}</p>}
            </div>
            <label className="flex min-h-12 items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
              <input type="checkbox" checked={confirmedTarget} onChange={(event) => setConfirmedTarget(event.target.checked)} className="mt-1 h-5 w-5" />
              <span className="text-sm">{t('claim.acknowledge')}</span>
            </label>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4" aria-labelledby="claim-details-title">
            <div><h3 id="claim-details-title" className="text-xl font-bold">{t('claim.ownershipTitle')}</h3><p className="mt-1 text-sm text-surface-500">{t('claim.ownershipDesc')}</p></div>
            <Textarea
              name="proofDescription"
              label={t('claim.proofLabel')}
              value={proofDescription}
              onChange={(event) => setProofDescription(event.target.value)}
              error={errors.proofDescription}
              rows={7}
              required
              maxLength={2000}
              helperText={t('claim.proofHelp', { count: proofDescription.length })}
              placeholder={t('claim.proofPlaceholder')}
            />
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4" aria-labelledby="claim-evidence-title">
            <div><h3 id="claim-evidence-title" className="text-xl font-bold">{t('claim.evidenceTitle')}</h3><p className="mt-1 text-sm text-surface-500">{t('claim.evidenceDesc')}</p></div>
            <ImageUpload images={images} onChange={setImages} maxFiles={3} label={t('claim.proofImages')} />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">{t('claim.evidenceHelp')}</div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-4" aria-labelledby="claim-questions-title">
            <div><h3 id="claim-questions-title" className="text-xl font-bold">{t('claim.questionsTitle')}</h3><p className="mt-1 text-sm text-surface-500">{t('claim.questionsDesc')}</p></div>
            {isQuestionLoading ? <p role="status" className="text-sm text-surface-500">{t('claim.questionsLoading')}</p> : questions.map((entry, index) => (
              <Textarea
                key={entry.id || index}
                name={`verification-${entry.id || index}`}
                label={`${index + 1}. ${entry.question}`}
                value={answers[entry.id] || ''}
                onChange={(event) => setAnswers((current) => ({ ...current, [entry.id]: event.target.value }))}
                rows={3}
                maxLength={1000}
                helperText={t('claim.answerPrivate')}
              />
            ))}
          </section>
        )}

        {step === 5 && (
          <section className="space-y-4" aria-labelledby="claim-review-title">
            <div><h3 id="claim-review-title" className="text-xl font-bold">{t('claim.reviewTitle')}</h3><p className="mt-1 text-sm text-surface-500">{t('claim.reviewDesc')}</p></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700"><p className="text-xs text-surface-500">{t('claim.completeness')}</p><p className="text-2xl font-bold">{assessment.score}/100</p><p className="text-sm">{assessment.level}</p></div>
              <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700"><p className="text-xs text-surface-500">{t('claim.privateImages')}</p><p className="text-2xl font-bold">{images.length}</p><p className="text-sm">{t('claim.maximum')}</p></div>
              <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700"><p className="text-xs text-surface-500">{t('claim.questionsAnswered')}</p><p className="text-2xl font-bold">{answerEntries.filter((entry) => entry.answer.length >= 2).length}</p><p className="text-sm">{t('claim.of', { count: questions.length })}</p></div>
            </div>
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm dark:border-surface-700 dark:bg-surface-900/50">
              <p className="font-semibold">{t('claim.proofDescription')}</p>
              <p className="mt-1 whitespace-pre-wrap text-surface-600 dark:text-surface-300">{proofDescription || t('claim.notProvided')}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
              <strong>{t('claim.humanDecision')}</strong> {t('claim.humanDecisionDesc')}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
          <Button type="button" variant="outline" onClick={() => step === 1 ? onClose(false) : setStep((current) => current - 1)} icon={step > 1 ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : null} disabled={isSubmitting}>
            {t(step === 1 ? 'claim.cancel' : 'claim.back')}
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={goNext}>{t('claim.continue')} <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
          ) : (
            <Button type="submit" variant="success" isLoading={isSubmitting} icon={<Check className="h-4 w-4" aria-hidden="true" />}>{t('claim.submitHuman')}</Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ClaimModal;
