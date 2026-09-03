import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Check, ChevronLeft, ChevronRight, FileCheck2, Image as ImageIcon, MapPin, ShieldCheck, Trash2, WifiOff } from 'lucide-react';
import { createNewLostReport, fetchLostItemById, updateLostReport } from '../../redux/slices/lostItemSlice';
import { createNewFoundReport, fetchFoundItemById, updateFoundReport } from '../../redux/slices/foundItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import aiService from '../../services/aiService';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import Select from './Select';
import ImageUpload from './ImageUpload';
import CreatableCategorySelect from './CreatableCategorySelect';
import AISuggestionReview from './AISuggestionReview';
import ItemAttributeFields from './ItemAttributeFields';
import LocationAssistant from './LocationAssistant';
import ImagePrivacyReview from './ImagePrivacyReview';
import { createPrivacySafeImage, IMAGE_REDACTION_ERROR_CODES, imageFileKey, normalizeRedactionRegions } from '../../utils/imageRedaction';
import ConfirmDialog from './ConfirmDialog';
import ProfileCompletionModal from '../modals/ProfileCompletionModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { consumeAssistantReportDraft } from '../../utils/assistantReportDraft';

const stepDefinitions = [
  { id: 1, labelKey: 'report.stepPhoto', icon: ImageIcon },
  { id: 2, labelKey: 'report.stepDetails', icon: FileCheck2 },
  { id: 3, labelKey: 'report.stepLocation', icon: MapPin },
  { id: 4, labelKey: 'report.stepPrivacy', icon: ShieldCheck },
];

const emptyForm = {
  itemName: '', category: '', description: '', brand: '', model: '', colors: '', material: '', uniqueFeatures: '', tags: '',
  location: '', date: '', storedAt: '', contactPreference: 'both', contactVisibility: 'request_only',
};

const fieldStep = {
  itemName: 2, category: 2, description: 2,
  location: 3, date: 3,
};

const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const itemToForm = (item, isLost) => ({
  itemName: item?.itemName || '',
  category: typeof item?.category === 'string' ? item.category : item?.category?.name || '',
  description: item?.description || '',
  brand: item?.brand || '',
  model: item?.model || '',
  colors: Array.isArray(item?.colors) ? item.colors.join(', ') : item?.colors || '',
  material: item?.material || '',
  uniqueFeatures: Array.isArray(item?.uniqueFeatures) ? item.uniqueFeatures.join(', ') : item?.uniqueFeatures || '',
  tags: Array.isArray(item?.tags) ? item.tags.join(', ') : item?.tags || '',
  location: (isLost ? item?.lostLocation : item?.foundLocation) || '',
  date: toLocalDateTime(isLost ? item?.lostDate : item?.foundDate),
  storedAt: item?.storedAt || '',
  contactPreference: item?.contactPreference || 'both',
  contactVisibility: item?.contactVisibility || 'request_only',
});

const ReportItemWizard = ({ mode, itemId = null }) => {
  const { t, language } = useLanguage();
  const isLost = mode === 'lost';
  const isEdit = Boolean(itemId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories } = useSelector((state) => state.categories);
  const { user } = useSelector((state) => state.auth);
  const itemState = useSelector((state) => isLost ? state.lostItems : state.foundItems);
  const currentItem = itemState.currentItem;
  const itemLoading = itemState.isLoading;
  const principalId = user?._id || 'guest';
  const draftKey = `lf-report-draft:${mode}:${isEdit ? `edit:${itemId}` : 'create'}:${principalId}`;

  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [extraCategory, setExtraCategory] = useState(null);
  const [aiSuggestion, setAISuggestion] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInitialised, setIsInitialised] = useState(false);
  const [hasRequestedItem, setHasRequestedItem] = useState(false);
  const [reportAssessment, setReportAssessment] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isPrivacyScanning, setIsPrivacyScanning] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [imagePrivacyReviews, setImagePrivacyReviews] = useState([]);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [uploadProgress, setUploadProgress] = useState(null);
  const privacyScanId = useRef(0);
  const steps = useMemo(() => stepDefinitions.map((entry) => ({ ...entry, label: t(entry.labelKey) })), [t]);
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-US';

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [categories.length, dispatch]);

  useEffect(() => {
    const updateConnectivity = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);
    return () => {
      window.removeEventListener('online', updateConnectivity);
      window.removeEventListener('offline', updateConnectivity);
    };
  }, []);

  useEffect(() => {
    if (isEdit && itemId) {
      setHasRequestedItem(true);
      dispatch(isLost ? fetchLostItemById(itemId) : fetchFoundItemById(itemId));
    }
  }, [dispatch, isEdit, isLost, itemId]);

  useEffect(() => {
    if (!isEdit && user && (!user.phone || !user.studentId)) setIsProfileModalOpen(true);
  }, [isEdit, user]);

  useEffect(() => {
    if (isInitialised) return;
    if (isEdit && (!currentItem || currentItem._id !== itemId)) return;

    const sourceForm = isEdit ? itemToForm(currentItem, isLost) : emptyForm;

    let nextForm = sourceForm;
    let nextStep = 1;
    if (!isEdit) {
      const assistantDraft = consumeAssistantReportDraft({ principalId, reportType: mode });
      if (assistantDraft) {
        nextForm = { ...sourceForm, ...assistantDraft.fields };
        nextStep = 2;
        setDraftRestored(true);
      }
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form && typeof parsed.form === 'object') {
          nextForm = { ...sourceForm, ...parsed.form };
          nextStep = Math.max(1, Math.min(4, Number(parsed.step) || 1));
          setDraftRestored(true);
        }
      }
    } catch {
      localStorage.removeItem(draftKey);
    }

    setForm({ ...emptyForm, ...nextForm });
    setStep(nextStep);
    if (isEdit) setExistingImages(Array.isArray(currentItem.images) ? currentItem.images : []);
    setDeletedImages([]);
    setImages([]);
    setImagePrivacyReviews([]);
    setIsInitialised(true);
  }, [currentItem, draftKey, isEdit, isInitialised, isLost, itemId, mode, principalId]);

  useEffect(() => {
    if (!isInitialised) return undefined;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ form, step, updatedAt: new Date().toISOString() }));
      } catch {
        // Storage may be disabled; the report remains usable without autosave.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftKey, form, isInitialised, step]);

  const categoryOptions = useMemo(() => {
    const values = categories.map((category) => ({ value: category.name, label: `${category.icon} ${category.name}` }));
    if (extraCategory && !categories.some((category) => category.name === extraCategory.value)) values.push(extraCategory);
    return values;
  }, [categories, extraCategory]);

  const ensureCategory = async (value, icon = '📦') => {
    const candidate = String(value || '').trim();
    if (!candidate) return '';
    const existing = categories.find((category) => category.name.toLocaleLowerCase() === candidate.toLocaleLowerCase());
    if (existing) {
      update('category', existing.name);
      return existing.name;
    }
    setIsCategoryLoading(true);
    try {
      const response = await aiService.autoCreateCategory(candidate);
      const name = response.data.name;
      const resolvedIcon = response.data.icon || icon;
      setExtraCategory({ value: name, label: `${resolvedIcon} ${name}` });
      update('category', name);
      await dispatch(fetchCategories());
      return name;
    } catch (error) {
      update('category', '');
      setErrors((current) => ({ ...current, category: t('report.validCategory') }));
      toast.error(t('report.categoryCreateFailed'));
      return '';
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const applySuggestionField = async (field, value) => {
    const text = Array.isArray(value) ? value.join(', ') : String(value || '');
    const mapped = field === 'uniqueMarks' ? 'uniqueFeatures' : field;
    if (mapped === 'category') await ensureCategory(text, aiSuggestion?.categoryIcon);
    else update(mapped, text);
  };

  const applyAllSuggestions = async () => {
    if (!aiSuggestion) return;
    for (const field of ['itemName', 'category', 'description', 'tags', 'brand', 'model', 'colors', 'material', 'uniqueMarks']) {
      if (aiSuggestion[field]) await applySuggestionField(field, aiSuggestion[field]);
    }
    toast.success(t('report.suggestionsApplied'));
  };

  const handleImageChange = async (nextImages) => {
    const scanId = privacyScanId.current + 1;
    privacyScanId.current = scanId;
    const nextKeys = new Set(nextImages.map(imageFileKey));
    const retainedReviews = imagePrivacyReviews.filter((review) => nextKeys.has(review.key));
    const reviewedKeys = new Set(retainedReviews.map((review) => review.key));
    const filesToReview = nextImages.filter((file) => !reviewedKeys.has(imageFileKey(file)));

    setImages(nextImages);
    setImagePrivacyReviews(retainedReviews);
    setErrors((current) => ({ ...current, images: undefined }));
    if (filesToReview.length === 0) {
      setIsPrivacyScanning(false);
      return;
    }

    setIsPrivacyScanning(true);
    const toastId = toast.loading(t('report.checkingPhotos', { count: filesToReview.length }));
    const newReviews = [];
    const rejectedKeys = new Set();
    let firstSuggestion = null;

    try {
      for (const file of filesToReview) {
        const key = imageFileKey(file);
        try {
          const response = await aiService.suggestDetailsFromImage(file);
          const suggestion = response?.data;
          if (!suggestion) throw new Error(t('report.imageReviewUnavailable'));
          if (suggestion.isSpam || suggestion.moderationDecision === 'reject') {
            rejectedKeys.add(key);
            continue;
          }
          const regions = normalizeRedactionRegions(suggestion.redactionRegions);
          const warnings = (Array.isArray(suggestion.privacyWarnings) ? suggestion.privacyWarnings : [])
            .map((warning) => String(warning || '').trim().slice(0, 240))
            .filter(Boolean)
            .slice(0, 10);
          const status = regions.length > 0
            ? 'redaction-required'
            : (warnings.length > 0 || suggestion.moderationDecision === 'review' ? 'manual-review' : 'safe');
          newReviews.push({ key, fileName: file.name || t('report.selectedPhoto'), regions, warnings, status, moderationDecision: suggestion.moderationDecision });
          if (!firstSuggestion && !form.itemName && !form.description) firstSuggestion = suggestion;
        } catch {
          newReviews.push({
            key,
            fileName: file.name || t('report.selectedPhoto'),
            regions: [],
            warnings: [t('report.imageReviewUnavailable')],
            status: 'manual-review',
            scanUnavailable: true,
          });
        }
      }

      if (scanId !== privacyScanId.current) {
        toast.dismiss(toastId);
        return;
      }
      setImages((current) => current.filter((file) => !rejectedKeys.has(imageFileKey(file))));
      setImagePrivacyReviews([...retainedReviews, ...newReviews]);
      if (firstSuggestion) setAISuggestion(firstSuggestion);
      if (rejectedKeys.size > 0) {
        toast.error(t('report.moderationRemoved', { count: rejectedKeys.size }), { id: toastId });
      } else {
        toast.success(t('report.privacyReady'), { id: toastId });
      }
    } finally {
      if (scanId === privacyScanId.current) setIsPrivacyScanning(false);
    }
  };

  const applyPrivacyRedaction = async () => {
    const pending = imagePrivacyReviews.filter((review) => review.status === 'redaction-required');
    if (pending.length === 0) return;
    setIsRedacting(true);
    const toastId = toast.loading(t('report.privacyCopies'));
    try {
      const reviewByKey = new Map(imagePrivacyReviews.map((review) => [review.key, review]));
      const replacements = new Map();
      const rescans = new Map();
      for (const file of images) {
        const review = reviewByKey.get(imageFileKey(file));
        if (review?.status === 'redaction-required') {
          const replacement = await createPrivacySafeImage(file, review.regions);
          replacements.set(review.key, replacement);
          try {
            const response = await aiService.suggestDetailsFromImage(replacement);
            const result = response?.data || {};
            const remainingRegions = normalizeRedactionRegions(result.redactionRegions);
            const remainingWarnings = (result.privacyWarnings || []).filter(Boolean);
            rescans.set(review.key, {
              safe: remainingRegions.length === 0 && remainingWarnings.length === 0 && result.moderationDecision === 'allow',
              regions: remainingRegions,
              warnings: remainingWarnings.slice(0, 10),
            });
          } catch {
            rescans.set(review.key, { safe: false, regions: [], warnings: [t('report.redactionRescanUnavailable')] });
          }
        }
      }
      const nextImages = images.map((file) => replacements.get(imageFileKey(file)) || file);
      const nextReviews = imagePrivacyReviews.map((review) => {
        const replacement = replacements.get(review.key);
        const rescan = rescans.get(review.key);
        return replacement ? {
          ...review,
          key: imageFileKey(replacement),
          fileName: replacement.name,
          status: rescan?.safe ? 'redacted' : 'manual-review',
          regions: rescan?.regions || [],
          warnings: rescan?.warnings || [],
          rescannedAt: new Date().toISOString(),
        } : review;
      });
      setImages(nextImages);
      setImagePrivacyReviews(nextReviews);
      setErrors((current) => ({ ...current, images: undefined }));
      const needsManualReview = [...rescans.values()].some((entry) => !entry.safe);
      if (needsManualReview) toast(t('report.redactionNeedsReview'), { id: toastId });
      else toast.success(t('report.privacyRedacted'), { id: toastId });
    } catch (error) {
      const errorKey = {
        [IMAGE_REDACTION_ERROR_CODES.FILE_REQUIRED]: 'report.privacyFileRequired',
        [IMAGE_REDACTION_ERROR_CODES.DECODE_FAILED]: 'report.privacyDecodeFailed',
        [IMAGE_REDACTION_ERROR_CODES.INVALID_DIMENSIONS]: 'report.privacyInvalidDimensions',
        [IMAGE_REDACTION_ERROR_CODES.CANVAS_UNAVAILABLE]: 'report.privacyCanvasUnavailable',
        [IMAGE_REDACTION_ERROR_CODES.CREATE_FAILED]: 'report.privacyCreateFailed',
      }[error?.code] || 'report.privacyFailed';
      toast.error(t(errorKey), { id: toastId });
    } finally {
      setIsRedacting(false);
    }
  };

  const confirmManualPrivacyReview = (key) => {
    setImagePrivacyReviews((current) => current.map((review) => (
      review.key === key ? { ...review, status: 'manually-reviewed', confirmedAt: new Date().toISOString() } : review
    )));
    setErrors((current) => ({ ...current, images: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.itemName.trim()) next.itemName = t('report.itemRequired');
    if (!form.category) next.category = t('report.categoryRequired');
    if (form.description.trim().length < 10) next.description = t('report.descriptionRequired');
    if (!form.location.trim()) next.location = t('report.locationRequired', { type: t(isLost ? 'report.lost' : 'report.found') });
    if (!form.date) next.date = t('report.dateRequired', { type: t(isLost ? 'report.lost' : 'report.found') });
    else if (Number.isNaN(new Date(form.date).getTime()) || new Date(form.date) > new Date()) next.date = t('report.dateFuture');
    return next;
  };

  const validateCurrentStep = () => {
    const all = validate();
    const relevant = Object.fromEntries(Object.entries(all).filter(([field]) => fieldStep[field] === step));
    if (step === 1 && isPrivacyScanning) relevant.images = t('report.waitPrivacy');
    const activeImageKeys = new Set(images.map(imageFileKey));
    const activeReviews = imagePrivacyReviews.filter((review) => activeImageKeys.has(review.key));
    const unresolvedPrivacy = activeReviews.some((review) => ['redaction-required', 'manual-review'].includes(review.status));
    if (step === 1 && images.length > activeReviews.length) relevant.images = t('report.everyPhotoReview');
    else if (step === 1 && unresolvedPrivacy) relevant.images = t('report.resolvePrivacy');
    setErrors((current) => ({ ...current, ...relevant }));
    return Object.keys(relevant).length === 0;
  };

  const runReportAssessment = async () => {
    setIsAssessing(true);
    try {
      const result = await aiService.assessReportDraft({
        reportType: mode,
        itemName: form.itemName,
        category: form.category,
        description: form.description,
        brand: form.brand,
        model: form.model,
        colors: form.colors,
        material: form.material,
        uniqueFeatures: form.uniqueFeatures,
        tags: form.tags,
        location: form.location,
        date: form.date,
        hasImage: existingImages.length + images.length > 0,
        excludeItemId: isEdit ? itemId : undefined,
      });
      setReportAssessment(result);
    } catch {
      setReportAssessment(null);
      toast(t('report.preflightUnavailable'));
    } finally {
      setIsAssessing(false);
    }
  };

  const goNext = async () => {
    if (!validateCurrentStep()) {
      toast.error(t('report.fixHighlighted'));
      return;
    }
    setErrors({});
    if (step === 3) await runReportAssessment();
    setStep((current) => Math.min(4, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDraft = () => {
    setForm(isEdit && currentItem ? itemToForm(currentItem, isLost) : emptyForm);
    setImages([]);
    if (isEdit && currentItem) setExistingImages(Array.isArray(currentItem.images) ? currentItem.images : []);
    setDeletedImages([]);
    setAISuggestion(null);
    privacyScanId.current += 1;
    setIsPrivacyScanning(false);
    setImagePrivacyReviews([]);
    setReportAssessment(null);
    setExtraCategory(null);
    setErrors({});
    setStep(1);
    setDraftRestored(false);
    localStorage.removeItem(draftKey);
    setIsClearConfirmOpen(false);
    toast.success(t('report.draftCleared'));
  };

  const handleUploadProgress = (progressEvent) => {
    const progress = Number(progressEvent?.progress);
    if (Number.isFinite(progress)) {
      setUploadProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      return;
    }
    const total = Number(progressEvent?.total);
    const loaded = Number(progressEvent?.loaded);
    if (Number.isFinite(total) && total > 0 && Number.isFinite(loaded)) {
      setUploadProgress(Math.max(0, Math.min(100, Math.round((loaded / total) * 100))));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!navigator.onLine) {
      setIsOnline(false);
      toast.error(t('report.offlineSubmit'));
      return;
    }
    const allErrors = validate();
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStep(Math.min(...Object.keys(allErrors).map((field) => fieldStep[field] || 4)));
      toast.error(t('report.reviewErrors'));
      return;
    }
    setIsLoading(true);
    setUploadProgress(0);
    try {
      const data = new FormData();
      data.append('itemName', form.itemName.trim());
      data.append('category', form.category);
      data.append('description', form.description.trim());
      data.append(isLost ? 'lostLocation' : 'foundLocation', form.location.trim());
      data.append(isLost ? 'lostDate' : 'foundDate', new Date(form.date).toISOString());
      if (!isLost) data.append('storedAt', form.storedAt.trim());
      data.append('contactPreference', form.contactPreference);
      data.append('contactVisibility', form.contactVisibility);
      for (const field of ['tags', 'brand', 'model', 'colors', 'material', 'uniqueFeatures']) data.append(field, form[field]);
      deletedImages.forEach((url) => data.append('deletedImages', url));
      images.forEach((image) => data.append('images', image));
      if (isEdit) {
        await dispatch(isLost ? updateLostReport({ id: itemId, formData: data, onUploadProgress: handleUploadProgress }) : updateFoundReport({ id: itemId, formData: data, onUploadProgress: handleUploadProgress })).unwrap();
      } else {
        await dispatch(isLost ? createNewLostReport({ formData: data, onUploadProgress: handleUploadProgress }) : createNewFoundReport({ formData: data, onUploadProgress: handleUploadProgress })).unwrap();
      }
      localStorage.removeItem(draftKey);
      toast.success(t('report.success', { type: t(isLost ? 'report.lost' : 'report.found'), action: t(isEdit ? 'report.updated' : 'report.submitted') }));
      navigate(isLost ? '/dashboard/my-lost' : '/dashboard/my-found');
    } catch (error) {
      toast.error(error || t('report.submitFailed', { action: t(isEdit ? 'report.update' : 'report.submit') }));
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  const removeExistingImage = (image) => {
    const identifier = image?.url || image?.secureUrl || image?.publicId || image;
    if (!identifier) return;
    setDeletedImages((current) => current.includes(identifier) ? current : [...current, identifier]);
    setExistingImages((current) => current.filter((candidate) => (candidate?.url || candidate?.secureUrl || candidate?.publicId || candidate) !== identifier));
  };

  const handleProfileModalClose = () => {
    if (!user?.phone || !user?.studentId) {
      navigate('/dashboard');
      toast.error(t('report.completeProfile'));
    } else setIsProfileModalOpen(false);
  };

  const contactOptions = [
    { value: 'both', label: t('report.emailPhone') },
    { value: 'email', label: t('report.emailOnly') },
    { value: 'phone', label: t('report.phoneOnly') },
  ];
  const visibilityOptions = [
    { value: 'request_only', label: t('report.shareApproved') },
    { value: 'public', label: t('report.sharePublic') },
  ];

  if (isEdit && !isInitialised && (!hasRequestedItem || itemLoading)) return <div className="py-16 text-center text-surface-600 dark:text-surface-300" role="status">{t('report.loading')}</div>;
  if (isEdit && !isInitialised && hasRequestedItem && !itemLoading && (!currentItem || currentItem._id !== itemId)) return <div className="py-16 text-center text-red-700 dark:text-red-300" role="alert">{t('report.loadFailed')}</div>;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <ProfileCompletionModal isOpen={isProfileModalOpen} onClose={handleProfileModalClose} onSuccess={() => setIsProfileModalOpen(false)} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {isLost ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-rose-50 border border-rose-200/90 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                {t('report.lost')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-50 border border-emerald-200/90 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('report.found')}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white">{t('report.title', { action: t(isEdit ? 'report.edit' : 'report.create'), type: t(isLost ? 'report.lost' : 'report.found') })}</h1>
          <p className="mt-1 text-sm sm:text-base text-surface-600 dark:text-surface-300">{t('report.subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 font-semibold text-xs sm:text-sm"
          onClick={() => setIsClearConfirmOpen(true)}
        >
          {t('report.clearDraft')}
        </Button>
      </header>

      {draftRestored && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/90 dark:border-blue-900/50 dark:bg-blue-950/30 p-2.5 sm:p-3 text-xs sm:text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between gap-2 shadow-xs" role="status">
          <span>{t('report.draftRestored')}</span>
        </div>
      )}

      {!isOnline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100" role="status">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div><strong>{t('report.offlineTitle')}</strong><p className="mt-1">{t('report.offlineDesc')}</p></div>
        </div>
      )}

      <nav aria-label={t('report.progress')} className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {steps.map(({ id, label, icon: Icon }) => {
          const isCurrent = step === id;
          const isCompleted = id < step;
          const hasPhoto = (images && images.length > 0) || (existingImages && existingImages.length > 0);
          const isPhotoStepWithoutImage = id === 1 && isCompleted && !hasPhoto;

          let stepClass = 'border-surface-200 bg-surface-50 text-surface-400 dark:border-surface-800 dark:bg-surface-900/40';
          if (isCurrent) {
            stepClass = 'border-primary-500 bg-primary-50 text-primary-800 dark:border-primary-500 dark:bg-primary-950/30 dark:text-primary-200 shadow-xs';
          } else if (isPhotoStepWithoutImage) {
            stepClass = 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200';
          } else if (isCompleted) {
            stepClass = 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200';
          }

          return (
            <button
              key={id}
              type="button"
              onClick={() => id < step && setStep(id)}
              disabled={id > step}
              aria-current={isCurrent ? 'step' : undefined}
              className={`min-h-11 sm:min-h-14 rounded-xl border px-1 sm:px-3 py-2 text-center sm:text-left text-xs sm:text-sm font-semibold transition flex items-center justify-center sm:justify-start gap-1 sm:gap-2 ${stepClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <span className="hidden sm:inline">{id}. </span>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {Object.keys(errors).length > 0 && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100" role="alert" aria-labelledby="report-error-title">
          <h2 id="report-error-title" className="flex items-center gap-2 font-bold"><AlertCircle className="h-5 w-5" /> {t('report.fixFields')}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}><button type="button" className="underline" onClick={() => setStep(fieldStep[field] || 4)}>{message}</button></li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={handleSubmit} className={`rounded-2xl border border-surface-200 bg-white p-4 shadow-lg dark:border-surface-800 dark:bg-surface-900 sm:p-7 border-t-4 ${isLost ? '!border-t-rose-500' : '!border-t-emerald-500'}`}>
        {step === 1 && (
          <section className="space-y-5" aria-labelledby="photo-step-title">
            <div><h2 id="photo-step-title" className="text-xl font-bold">{t('report.photoTitle')}</h2><p className="mt-1 text-sm text-surface-500">{t('report.photoDesc')}</p></div>
            {existingImages.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">{t('report.existingImages')}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {existingImages.map((image, index) => (
                    <div key={image.publicId || image.url || index} className="relative overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700">
                      <img src={image.url || image.secureUrl || image} alt={t('report.existingAlt', { index: index + 1 })} className="h-32 w-full object-cover" />
                      <button type="button" onClick={() => removeExistingImage(image)} className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/75 text-white" aria-label={t('report.removeExisting', { index: index + 1 })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ImageUpload images={images} onChange={handleImageChange} maxFiles={Math.max(0, 5 - existingImages.length)} error={errors.images} />
            {errors.images && <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100" role="alert">{errors.images}</div>}
            <ImagePrivacyReview
              reviews={imagePrivacyReviews}
              isScanning={isPrivacyScanning}
              isRedacting={isRedacting}
              onRedactRequired={applyPrivacyRedaction}
              onConfirmManualReview={confirmManualPrivacyReview}
            />
            <AISuggestionReview suggestion={aiSuggestion} onApplyField={applySuggestionField} onApplyAll={applyAllSuggestions} onDismiss={() => setAISuggestion(null)} />
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5" aria-labelledby="details-step-title">
            <div><h2 id="details-step-title" className="text-xl font-bold">{t('report.detailsTitle')}</h2><p className="mt-1 text-sm text-surface-500">{t('report.detailsDesc')}</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label={t('report.itemName')} name="itemName" value={form.itemName} onChange={(event) => update('itemName', event.target.value)} error={errors.itemName} required />
              <CreatableCategorySelect
                label={t('report.itemCategory')}
                name="category"
                options={categoryOptions}
                value={form.category}
                isLoading={isCategoryLoading}
                onChange={(event) => ensureCategory(event.target.value)}
                error={errors.category}
                required
              />
            </div>
            <Textarea label={t('report.description')} name="description" value={form.description} onChange={(event) => update('description', event.target.value)} error={errors.description} required helperText={t('report.descriptionHelp', { count: form.description.length })} placeholder={t('report.descriptionPlaceholder')} />
            <ItemAttributeFields
              values={{ brand: form.brand, model: form.model, colors: form.colors, material: form.material, uniqueFeatures: form.uniqueFeatures }}
              setters={{ setBrand: (value) => update('brand', value), setModel: (value) => update('model', value), setColors: (value) => update('colors', value), setMaterial: (value) => update('material', value), setUniqueFeatures: (value) => update('uniqueFeatures', value) }}
            />
            <Input label={t('report.searchTags')} name="tags" value={form.tags} onChange={(event) => update('tags', event.target.value)} helperText={t('report.searchTagsHelp')} />
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5" aria-labelledby="location-step-title">
            <div><h2 id="location-step-title" className="text-xl font-bold">{t('report.locationTitle')}</h2><p className="mt-1 text-sm text-surface-500">{t('report.locationDesc')}</p></div>
            <LocationAssistant label={t(isLost ? 'report.lastSeen' : 'report.foundLocation')} name="location" value={form.location} onChange={(event) => update('location', event.target.value)} error={errors.location} required placeholder={t(isLost ? 'report.lostPlaceholder' : 'report.foundPlaceholder')} />
            <Input label={t(isLost ? 'report.lostDate' : 'report.foundDate')} name="date" type="datetime-local" value={form.date} onChange={(event) => update('date', event.target.value)} error={errors.date} required />
            {!isLost && <Input label={t('report.storedAt')} name="storedAt" value={form.storedAt} onChange={(event) => update('storedAt', event.target.value)} placeholder={t('report.storedPlaceholder')} helperText={t('report.storedHelp')} />}
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5" aria-labelledby="review-step-title">
            <div><h2 id="review-step-title" className="text-xl font-bold">{t('report.reviewTitle')}</h2><p className="mt-1 text-sm text-surface-500">{t('report.reviewDesc')}</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label={t('report.contactChannel')} name="contactPreference" value={form.contactPreference || 'both'} onChange={(event) => update('contactPreference', event.target.value)} options={contactOptions} placeholder="" />
              <Select label={t('report.contactVisibility')} name="contactVisibility" value={form.contactVisibility || 'request_only'} onChange={(event) => update('contactVisibility', event.target.value)} options={visibilityOptions} placeholder="" />
            </div>
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-950/40">
              <h3 className="font-bold text-surface-900 dark:text-white">{t('report.preview')}</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-surface-500">{t('report.item')}</dt><dd className="font-semibold">{form.itemName || t('report.notProvided')}</dd></div>
                <div><dt className="text-surface-500">{t('report.category')}</dt><dd className="font-semibold">{form.category || t('report.notProvided')}</dd></div>
                <div><dt className="text-surface-500">{t('report.location')}</dt><dd className="font-semibold">{form.location || t('report.notProvided')}</dd></div>
                <div><dt className="text-surface-500">{t('report.date')}</dt><dd className="font-semibold">{form.date ? new Date(form.date).toLocaleString(locale) : t('report.notProvided')}</dd></div>
                <div className="sm:col-span-2"><dt className="text-surface-500">{t('report.description')}</dt><dd className="whitespace-pre-wrap">{form.description || t('report.notProvided')}</dd></div>
                <div className="sm:col-span-2"><dt className="text-surface-500">{t('report.identification')}</dt><dd>{[form.brand, form.model, form.colors, form.material, form.uniqueFeatures].filter(Boolean).join(' · ') || t('report.noOptional')}</dd></div>
              </dl>
            </div>
            <section className="rounded-2xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900/50 dark:bg-primary-950/20" aria-labelledby="report-quality-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 id="report-quality-title" className="font-bold text-surface-900 dark:text-white">{t('report.qualityTitle')}</h3><p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{t('report.qualityDesc')}</p></div>
                {isAssessing ? <span role="status" className="text-sm font-semibold">{t('report.assessing')}</span> : reportAssessment?.quality && <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold shadow-sm dark:bg-surface-900">{reportAssessment.quality.score}% · {reportAssessment.quality.level}</span>}
              </div>
              {reportAssessment?.quality?.suggestions?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{reportAssessment.quality.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>}
              {reportAssessment?.duplicateCandidates?.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="font-bold text-amber-900 dark:text-amber-100">{t('report.duplicatesTitle')}</p>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{t('report.duplicatesDesc')}</p>
                  <div className="mt-2 space-y-2">{reportAssessment.duplicateCandidates.map((candidate) => (
                    <button key={candidate.itemId} type="button" onClick={() => navigate(`/dashboard/edit-${isLost ? 'lost' : 'found'}/${candidate.itemId}`)} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm dark:border-amber-900/60 dark:bg-surface-900">
                      <span><strong>{candidate.itemName}</strong><span className="block text-xs text-surface-500">{candidate.reasons.join(' · ') || t('report.similarDetails')}</span></span><span className="font-bold">{candidate.score}%</span>
                    </button>
                  ))}</div>
                </div>
              )}
            </section>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {t('report.privacyWarning')}
            </div>
          </section>
        )}

        {isLoading && uploadProgress !== null && (
          <div className="mt-7" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-sm"><span className="font-semibold">{t('report.uploading')}</span><span>{uploadProgress}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700" role="progressbar" aria-label={t('report.uploadProgress')} aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress}>
              <div className="h-full rounded-full bg-primary-600 transition-[width]" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-5 dark:border-surface-800">
          <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} icon={<ChevronLeft className="h-4 w-4" />}>{t('report.back')}</Button>
          {step < 4 ? (
            <Button
              type="button"
              onClick={goNext}
              className={isLost ? '!bg-rose-600 hover:!bg-rose-700 !text-white' : '!bg-emerald-600 hover:!bg-emerald-700 !text-white'}
            >
              {t('report.continue')} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="success"
              isLoading={isLoading}
              disabled={!isOnline}
              className={isLost ? '!bg-rose-600 hover:!bg-rose-700 !text-white' : '!bg-emerald-600 hover:!bg-emerald-700 !text-white'}
              icon={<Check className="h-4 w-4" />}
            >
              {t(isEdit ? 'report.saveChanges' : 'report.submitReport')}
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={clearDraft} title={t('report.clearTitle')} message={t(isEdit ? 'report.clearEditMessage' : 'report.clearCreateMessage')} confirmText={t('report.clearDraft')} />
    </div>
  );
};

export default ReportItemWizard;
