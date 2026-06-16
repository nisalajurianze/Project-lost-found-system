// ============================================
// Lost Item Detail Page
// Premium UI with image gallery, status badge, location/date,
// and contact information (protected for logged-in users)
// ============================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLostItemById, clearCurrentLostItem } from '../../redux/slices/lostItemSlice';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import { getCategoryIcon, optimizeImageUrl } from '../../utils/helpers';
import { formatAbsoluteDate, formatRelativeTime } from '../../utils/formatDate';
import { FiArrowLeft, FiMapPin, FiClock, FiUser, FiMail, FiPhone, FiLock } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';

export const LostItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  
  const { currentItem, isLoading, error } = useSelector((state) => state.lostItems);
  const [activeImage, setActiveImage] = useState('');

  const loggedInUserId = useSelector((state) => state.auth.user?._id);

  useEffect(() => {
    dispatch(fetchLostItemById(id));
    return () => {
      dispatch(clearCurrentLostItem());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (currentItem?.images && currentItem.images.length > 0) {
      setActiveImage(currentItem.images[0].url);
    } else {
      setActiveImage('');
    }
  }, [currentItem]);

  if (isLoading) {
    return <Loader fullPage />;
  }

  if (error || !currentItem) {
    return (
      <div className="flex-1 py-16 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="text-6xl text-primary-500 mb-4">🔍</div>
          <h2 className="text-2xl font-extrabold font-display text-surface-900 dark:text-white mb-2">
            Lost Report Not Found
          </h2>
          <p className="text-surface-500 dark:text-surface-400 mb-6">
            The item report you are looking for may have been claimed, closed, or deleted.
          </p>
          <Button onClick={() => navigate('/lost-items')} variant="primary" className="w-full">
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const hasImages = currentItem.images && currentItem.images.length > 0;
  const isOwner = currentItem.userId?._id === loggedInUserId;

  return (
    <div className="flex-1 py-8 sm:py-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-surface-500 dark:text-surface-400 hover:text-primary-500 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <FiArrowLeft /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-[4/3] rounded-2xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-800 overflow-hidden shadow-md">
              {hasImages && activeImage ? (
                <img
                  src={optimizeImageUrl(activeImage, 1200)}
                  alt={currentItem.itemName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-6xl bg-gradient-to-br from-primary-950/20 to-primary-950/5 text-primary-500/50">
                  {getCategoryIcon(currentItem.category)}
                  <span className="text-xs font-semibold uppercase tracking-wider text-surface-400 mt-3">
                    No Image Provided
                  </span>
                </div>
              )}
              
              <div className="absolute top-4 right-4">
                <StatusBadge status={currentItem.status} />
              </div>
            </div>

            {/* Thumbnails */}
            {hasImages && currentItem.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {currentItem.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(img.url)}
                    className={`relative w-20 aspect-[4/3] rounded-lg bg-surface-100 dark:bg-surface-800 border-2 overflow-hidden flex-shrink-0 transition-all ${
                      activeImage === img.url
                        ? 'border-primary-500 scale-95 shadow-sm'
                        : 'border-transparent hover:border-surface-300 dark:hover:border-surface-700'
                    }`}
                  >
                    <img src={optimizeImageUrl(img.url, 200)} alt="" className="w-full h-full object-cover" />
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
                  Reported {formatRelativeTime(currentItem.createdAt)}
                </span>
                <span>•</span>
                <span>Lost Date: {formatAbsoluteDate(currentItem.lostDate)}</span>
              </div>
            </div>

            {/* Description Card */}
            <div className="glass-card p-6 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900/50 shadow-sm rounded-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-surface-400 mb-2">
                Description
              </h3>
              <p className="text-surface-700 dark:text-surface-300 text-sm leading-relaxed whitespace-pre-line">
                {currentItem.description}
              </p>
            </div>

            {/* Location & Tags details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Location Card */}
              <div className="glass-card p-5 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900/50 shadow-sm rounded-xl flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 flex-shrink-0">
                  <FiMapPin className="text-lg" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                    Last Seen Location
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
                    Keywords / Tags
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
                Contact Information
              </h3>

              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 text-sm text-surface-700 dark:text-surface-300">
                    <FiUser className="text-surface-400 text-lg flex-shrink-0" />
                    <div>
                      <p className="text-xs text-surface-400 font-medium">Reported By</p>
                      <p className="font-semibold text-surface-800 dark:text-surface-200">
                        {currentItem.userId?.fullName || 'Anonymous User'}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  {(currentItem.contactPreference === 'email' || currentItem.contactPreference === 'both') && currentItem.userId?.email && (
                    <div className="flex items-center gap-3.5 text-sm text-surface-700 dark:text-surface-300">
                      <FiMail className="text-surface-400 text-lg flex-shrink-0" />
                      <div>
                        <p className="text-xs text-surface-400 font-medium">Email Address</p>
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
                        <p className="text-xs text-surface-400 font-medium">Phone Number</p>
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
                      🌟 You created this report. You can manage it from your dashboard.
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
                      Contact details are protected
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      Please log in to view the reporter's contact details and coordinate return.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link to="/login">
                      <Button variant="primary" size="sm" className="px-6">
                        Log In to Contact
                      </Button>
                    </Link>
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
