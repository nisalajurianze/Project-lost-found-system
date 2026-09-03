// ============================================
// Lost Item Detail Page
// Premium UI with image gallery, status badge, location/date,
// and contact information (protected for logged-in users)
// ============================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLostItemById, clearCurrentLostItem } from '../../redux/slices/lostItemSlice';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import ClaimModal from '../../components/common/ClaimModal';
import { getCategoryIcon, optimizeImageUrl } from '../../utils/helpers';
import { FiArrowLeft, FiMapPin, FiClock, FiUser, FiMail, FiPhone, FiLock } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import lostItemService from '../../services/lostItemService';
import toast from 'react-hot-toast';
import { formatAbsoluteDate, formatRelativeTime } from '../../utils/formatDate';
import WorkflowTimeline from '../../components/common/WorkflowTimeline';
import ItemEvidenceSummary from '../../components/common/ItemEvidenceSummary';
import PosterGenerator from '../../components/common/PosterGenerator';
import AccessibilityCaptionReview from '../../components/common/AccessibilityCaptionReview';
import { useLanguage } from '../../i18n/LanguageContext';

export const LostItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { currentItem, isLoading, error } = useSelector((state) => state.lostItems);
  const [activeImage, setActiveImage] = useState('');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [hasClaimedSession, setHasClaimedSession] = useState(false);
  const [hasExistingClaim, setHasExistingClaim] = useState(false);
  const [isContactShared, setIsContactShared] = useState(false);

  const isValidId = /^[0-9a-fA-F]{24}$/.test(String(id || ''));

  useEffect(() => {
    if (isAuthenticated && isValidId) {
      import('../../services/claimService').then((module) => {
        module.default.checkClaim(id).then((data) => {
          setHasExistingClaim(data.hasClaim);
          if (data.claim?.isContactShared) {
            setIsContactShared(true);
          }
        }).catch(() => {});
      });
    }
  }, [isAuthenticated, id, isValidId]);
  const loggedInUserId = useSelector((state) => state.auth.user?._id);

  useEffect(() => {
    if (isValidId) {
      dispatch(fetchLostItemById(id));
    }

    return () => {
      dispatch(clearCurrentLostItem());
    };
  }, [dispatch, id, isValidId]);

  useEffect(() => {
    if (currentItem?.images && currentItem.images.length > 0) {
      setActiveImage(currentItem.images[0].url);
    } else {
      setActiveImage('');
    }
  }, [currentItem]);

  useEffect(() => {
    if (new URLSearchParams(search).get('claim') !== '1' || !isAuthenticated || !currentItem) return;
    const reporterId = currentItem.userId?._id || currentItem.userId;
    const eligible = ['available', 'pending', 'matched'].includes(currentItem.status)
      && reporterId?.toString() !== loggedInUserId?.toString()
      && !hasClaimedSession && !hasExistingClaim;
    if (eligible) setIsClaimModalOpen(true);
  }, [currentItem, hasClaimedSession, hasExistingClaim, isAuthenticated, loggedInUserId, search]);

  if (isLoading) {
    return <Loader fullPage />;
  }

  if (error || !currentItem) {
    return (
      <div className="flex-1 py-16 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="text-6xl text-primary-500 mb-4">🔍</div>
          <h2 className="text-2xl font-extrabold font-display text-surface-900 dark:text-white mb-2">
            {t('detail.lostNotFound')}
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-6">
            {t('detail.lostNotFoundDesc')}
          </p>
          <Button onClick={() => navigate('/lost-items')} variant="primary" className="w-full">
            {t('detail.backDirectory')}
          </Button>
        </div>
      </div>
    );
  }

  const hasImages = currentItem.images && currentItem.images.length > 0;
  const isOwner = (currentItem.userId?._id || currentItem.userId)?.toString() === loggedInUserId?.toString();
  const isConnectedUser = currentItem.connectedUserId?.toString() === loggedInUserId?.toString();
  const isClaimable = (currentItem.status === 'available' || currentItem.status === 'pending' || currentItem.status === 'matched') && !isOwner && !isConnectedUser && !hasClaimedSession && !hasExistingClaim;
  const isHandoverInProgress = currentItem.status === 'in_progress';

  const canSeeContact = user?.role === 'admin' || isOwner || isConnectedUser || isContactShared;

  return (
    <div className="flex-1 pt-4 pb-12 sm:pt-6 sm:pb-16 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back navigation */}
        <button type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-surface-500 dark:text-surface-400 hover:text-primary-500 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <FiArrowLeft aria-hidden="true" /> {t('detail.back')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-[4/3] sm:aspect-video rounded-2xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-800 overflow-hidden shadow-md flex items-center justify-center p-2">
              {hasImages && activeImage ? (
                <img
                  src={optimizeImageUrl(activeImage, 1200)}
                  alt={currentItem.images.find((image) => image.url === activeImage)?.accessibilityAlt?.text || currentItem.itemName}
                  className="w-full h-full object-contain drop-shadow-md"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-6xl bg-gradient-to-br from-primary-950/20 to-primary-950/5 text-primary-500/50">
                  {getCategoryIcon(currentItem.category)}
                  <span className="text-xs font-semibold uppercase tracking-wider text-surface-400 mt-3">
                    {t('detail.noImage')}
                  </span>
                </div>
              )}

              <div className="absolute top-4 right-4">
                <StatusBadge status={currentItem.status} />
              </div>
            </div>

            {/* Thumbnails */}
            {hasImages && currentItem.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-surface-300 dark:scrollbar-thumb-surface-600">
                {currentItem.images.map((img, index) => (
                  <button type="button"
                    key={index}
                    onClick={() => setActiveImage(img.url)}
                    className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all p-1 bg-surface-100 dark:bg-surface-800 ${
                      activeImage === img.url
                        ? 'border-primary-500 ring-2 ring-primary-500/20'
                        : 'border-transparent hover:border-surface-300 dark:hover:border-surface-600'
                    }`}
                  >
                    <img src={optimizeImageUrl(img.url, 200)} alt={img.accessibilityAlt?.text || `${currentItem.itemName} ${index + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Item Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header info */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                {getCategoryIcon(currentItem.category)} {currentItem.category}
              </span>
              <h1 className="text-3xl font-extrabold font-display text-surface-900 dark:text-white leading-tight">
                {currentItem.itemName}
              </h1>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-surface-500 dark:text-surface-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <FiClock className="flex-shrink-0" />
                  {t('detail.reported', { time: formatRelativeTime(currentItem.createdAt) })}
                </span>
                <span>•</span>
                <span>{t('detail.lostDate', { date: formatAbsoluteDate(currentItem.lostDate) })}</span>
              </div>
            </div>

            <WorkflowTimeline type="item" status={currentItem.status} />

            {/* Description Card */}
            <div className="glass-card p-6 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900/50 shadow-sm rounded-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-surface-400 mb-2">
                {t('detail.description')}
              </h3>
              <p className="text-surface-700 dark:text-surface-300 text-sm leading-relaxed whitespace-pre-line">
                {currentItem.description}
              </p>
            </div>

            {/* Resolution Actions */}
            <div className="mobile-sticky-claim p-4 rounded-xl border bg-primary-500/5 dark:bg-primary-500/10 border-primary-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-extrabold text-surface-900 dark:text-white">
                  {isHandoverInProgress ? t('detail.handoverProgress') : t('detail.haveItem')}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {isHandoverInProgress
                    ? ((isOwner || isConnectedUser) ? t('detail.arrangeHandover') : t('detail.handoverToOwner'))
                    : t('detail.connectReporter')}
                </p>
              </div>
              <div>
                {currentItem.status === 'claimed' ? (
                  <span className="text-xs font-bold text-surface-400 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800">
                    {t('detail.itemResolved')}
                  </span>
                ) : hasClaimedSession || hasExistingClaim ? (
                  <Button disabled variant="outline">
                    {t('detail.claimPending')}
                  </Button>
                ) : isHandoverInProgress && (isOwner || isConnectedUser) ? (
                  <Button
                    onClick={async () => {
                      const confirmMsg = isOwner
                        ? t('detail.confirmReceivedBackQuestion')
                        : t('detail.confirmHandoverQuestion');
                      if (window.confirm(confirmMsg)) {
                        try {
                          await lostItemService.resolveLostItem(currentItem._id);
                          dispatch(fetchLostItemById(id));
                          toast.success(t('detail.resolvedSuccess'));
                        } catch (err) {
                          toast.error(t('detail.resolveError'));
                        }
                      }
                    }}
                    variant="primary"
                  >
                    {isOwner ? t('detail.confirmReceived') : t('detail.confirmHandover')}
                  </Button>
                ) : isClaimable ? (
                  isAuthenticated ? (
                    <>
                      <Button
                        onClick={() => setIsClaimModalOpen(true)}
                        variant="primary"
                      >
                        {t('detail.iHaveThis')}
                      </Button>
                      <ClaimModal
                        isOpen={isClaimModalOpen}
                        onClose={(isSuccess) => {
                          setIsClaimModalOpen(false);
                          if (isSuccess === true) setHasClaimedSession(true);
                        }}
                        targetItemId={currentItem._id}
                        itemType="LostItem"
                        itemName={currentItem.itemName}
                        itemCategory={typeof currentItem.category === 'string' ? currentItem.category : currentItem.category?.name}
                      />
                    </>
                  ) : (
                    <Link to="/login">
                      <Button variant="primary">{t('detail.loginConnect')}</Button>
                    </Link>
                  )
                ) : null}
              </div>
            </div>

            <ItemEvidenceSummary item={currentItem} />
            {isOwner && <AccessibilityCaptionReview reportType="lost" reportId={currentItem._id} image={currentItem.images?.[0]} />}
            {isOwner && <PosterGenerator reportType="lost" reportId={currentItem._id} />}

            {/* Location & Tags details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Location Card */}
              <div className="glass-card p-5 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900/50 shadow-sm rounded-xl flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 flex-shrink-0">
                  <FiMapPin className="text-lg" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                    {t('detail.lastSeen')}
                  </h4>
                  <p className="text-surface-800 dark:text-surface-200 text-sm font-medium mt-1 leading-snug">
                    {currentItem.lostLocation}
                  </p>
                </div>
              </div>

              {/* Tags Card */}
              {currentItem.tags && currentItem.tags.length > 0 && (
                <div className="glass-card p-5 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900/50 shadow-sm rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2.5">
                    {t('detail.keywords')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {currentItem.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Details (Security protected) */}
            <div className="glass-card p-6 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900/50 shadow-sm rounded-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-surface-400 mb-4">
                {t('detail.contactInfo')}
              </h3>

              {canSeeContact ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 text-sm text-surface-700 dark:text-surface-300">
                    {currentItem.userId?.profileImage?.url ? (
                      <img
                        src={currentItem.userId.profileImage.url}
                        alt={currentItem.userId.fullName || t('detail.owner')}
                        className="w-10 h-10 rounded-full object-cover border border-surface-200 dark:border-surface-700 flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center flex-shrink-0 border border-surface-200 dark:border-surface-700">
                        <FiUser className="text-surface-400 text-lg" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-surface-400 font-medium">{t('detail.reportedBy')}</p>
                      <p className="font-semibold text-surface-800 dark:text-surface-200">
                        {currentItem.userId?.fullName || t('detail.anonymousUser')}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  {(currentItem.contactPreference === 'email' || currentItem.contactPreference === 'both') && currentItem.userId?.email && (
                    <div className="flex items-center gap-3.5 text-sm text-surface-700 dark:text-surface-300">
                      <FiMail className="text-surface-400 text-lg flex-shrink-0" />
                      <div>
                        <p className="text-xs text-surface-400 font-medium">{t('detail.email')}</p>
                        <a
                          href={`mailto:${currentItem.userId.email}`}
                          className="font-semibold text-primary-500 hover:underline"
                        >
                          {currentItem.userId.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {(currentItem.contactPreference === 'phone' || currentItem.contactPreference === 'both') && currentItem.userId?.phone && (
                    <div className="flex items-center gap-3.5 text-sm text-surface-700 dark:text-surface-300">
                      <FiPhone className="text-surface-400 text-lg flex-shrink-0" />
                      <div>
                        <p className="text-xs text-surface-400 font-medium">{t('detail.phone')}</p>
                        <a
                          href={`tel:${currentItem.userId.phone}`}
                          className="font-semibold text-primary-500 hover:underline"
                        >
                          {currentItem.userId.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {isOwner && (
                    <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-semibold text-center">
                      🌟 {t('detail.ownerNotice')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500">
                    <FiLock className="text-xl" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                      {t('detail.contactProtected')}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      {isAuthenticated
                        ? (hasClaimedSession || hasExistingClaim
                            ? t('detail.claimSubmitted')
                            : t('detail.clickHave'))
                        : t('detail.loginProtected')}
                    </p>
                  </div>
                  <div className="pt-2">
                    {!isAuthenticated && (
                      <Link to="/login">
                        <Button variant="primary" size="sm" className="px-6">
                          {t('detail.loginContact')}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LostItemDetail;
