// ============================================
// Profile settings page component
// Personal profile edit inputs, profile avatar uploads, password change, and notification preferences
// ============================================

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfile } from '../../redux/slices/authSlice';
import api from '../../services/api';
import { validatePassword } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { getInitials } from '../../utils/helpers';
import { FiCamera } from 'react-icons/fi';
import { Accessibility, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  clearAccessibilityPreferences,
} from '../../utils/accessibilityPreferences';

export const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { t } = useLanguage();

  // Profile fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.profileImage?.url || null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  // Sync form inputs when user state updates (e.g. on session refresh)
  useEffect(() => {
    if (user && !isEditing) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setStudentId(user.studentId || '');
      setAvatarPreview(user.profileImage?.url || null);
    }
  }, [user, isEditing]);

  // Password fields
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Accessibility preferences state
  const [a11yPreferences, setA11yPreferences] = useState(loadAccessibilityPreferences);

  useEffect(() => {
    setA11yPreferences((current) => saveAccessibilityPreferences(current));
  }, []);

  const updateA11y = (field, value) => {
    setA11yPreferences((current) => saveAccessibilityPreferences({ ...current, [field]: value }));
  };

  const resetA11y = () => {
    setA11yPreferences(clearAccessibilityPreferences());
    toast.success(t('accessibility.reset'));
  };

  // Profile submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('phone', phone);
      formData.append('studentId', studentId);

      if (avatar) {
        formData.append('profileImage', avatar);
      }

      const res = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update Redux state & LocalStorage
      dispatch(updateUserProfile(res.data.data));
      toast.success(t('profile.updated'));
      setIsEditing(false);
    } catch {
      toast.error(t('profile.updateError'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    setStudentId(user?.studentId || '');
    setAvatar(null);
    setAvatarPreview(user?.profileImage?.url || null);
  };

  const handleCancelPasswordEdit = () => {
    setIsEditingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Profile avatar select
  const handleAvatarChange = async (e) => {
    if (!isEditing) return;
    const file = e.target.files[0];
    if (!file) return;

    // Check size & compress
    try {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 800,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setAvatar(compressedFile);
      setAvatarPreview(URL.createObjectURL(compressedFile));
    } catch {
      toast.error(t('profile.imageProcessError'));
    }
  };

  // Change password submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword(newPassword)) {
      toast.error(t('profile.passwordHelper'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.put('/users/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      toast.success(t('profile.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsEditingPassword(false);
    } catch {
      toast.error(t('profile.passwordUpdateError'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">{t('profile.title')}</h1>
          <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Profile Card & Details Form */}
        <div className="lg:col-span-2 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white">
              {t('profile.accountInfo')}
            </h3>
            <AnimatePresence mode="wait">
              {!isEditing && (
                <motion.div
                  key="edit-profile"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    {t('profile.editProfile')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">

            {/* Avatar Uploader */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-surface-100 dark:border-surface-800">
              <label
                htmlFor="avatar-input"
                className={`relative group ${isEditing ? 'cursor-pointer' : 'opacity-80'}`}
                aria-label={t('profile.chooseImage')}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={fullName}
                    className="h-24 w-24 rounded-full object-cover border-4 border-primary-500/20"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary-500 text-white flex items-center justify-center text-3xl font-bold font-display">
                    {getInitials(fullName)}
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiCamera className="text-xl" />
                  </div>
                )}
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={!isEditing}
                />
              </label>
              <div>
                <p className="text-sm font-bold text-surface-900 dark:text-white">{t('profile.avatar')}</p>
                <p className="text-xs text-surface-400 mt-1">{t('profile.imageFormats')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('profile.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={!isEditing}
              />
              <Input
                label={t('profile.studentId')}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                disabled={!isEditing}
              />
              <Input
                label={t('profile.phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label={t('profile.emailLocked')}
                value={user?.email || ''}
                disabled
                className="opacity-70"
              />
            </div>

            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-3 pt-2 overflow-hidden"
                >
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isUpdatingProfile}
                  >
                    {t('profile.save')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isUpdatingProfile}
                  >
                    {t('common.cancel')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Change password card */}
        <div className="lg:col-span-1 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl h-fit">
          <div className={`flex justify-between items-center ${isEditingPassword ? 'mb-6' : ''} transition-all duration-300`}>
            <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white">
              {t('profile.changePassword')}
            </h3>
            <AnimatePresence mode="wait">
              {!isEditingPassword && (
                <motion.div
                  key="edit-password"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPassword(true)}>
                    {t('common.edit')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isEditingPassword && (
              <motion.form
                onSubmit={handlePasswordSubmit}
                className="space-y-4 overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Input
                  type="password"
                  label={t('profile.currentPassword')}
                  showPasswordLabel={t('profile.showPassword')}
                  hidePasswordLabel={t('profile.hidePassword')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label={t('profile.newPassword')}
                  showPasswordLabel={t('profile.showPassword')}
                  hidePasswordLabel={t('profile.hidePassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  helperText={t('profile.passwordHelper')}
                />
                <Input
                  type="password"
                  label={t('profile.confirmPassword')}
                  showPasswordLabel={t('profile.showPassword')}
                  hidePasswordLabel={t('profile.hidePassword')}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isChangingPassword}
                  >
                    {t('profile.update')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelPasswordEdit}
                    disabled={isChangingPassword}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Accessibility Preferences Card */}
        <div className="lg:col-span-3 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold font-display text-surface-900 dark:text-white">
                <Accessibility className="h-5 w-5 text-primary-600" aria-hidden="true" />
                {t('accessibility.title')}
              </h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {t('accessibility.description')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetA11y}
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            >
              {t('accessibility.reset')}
            </Button>
          </div>

          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-bold text-surface-900 dark:text-white mb-3">{t('accessibility.textSize')}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['default', t('accessibility.default')],
                  ['large', t('accessibility.large')],
                  ['xlarge', t('accessibility.xlarge')],
                ].map(([value, label]) => (
                  <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-surface-200 px-4 py-3 transition hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/60">
                    <input
                      type="radio"
                      name="profile-a11y-text-scale"
                      value={value}
                      checked={a11yPreferences.textScale === value}
                      onChange={() => updateA11y('textScale', value)}
                      className="h-5 w-5 accent-primary-600"
                    />
                    <span className="text-sm font-semibold text-surface-900 dark:text-white">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['highContrast', t('accessibility.highContrast'), t('accessibility.highContrastDesc')],
                ['reduceMotion', t('accessibility.reduceMotion'), t('accessibility.reduceMotionDesc')],
                ['lowEffects', t('accessibility.lowEffects'), t('accessibility.lowEffectsDesc')],
              ].map(([field, label, description]) => (
                <label key={field} className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-4 transition hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/60">
                  <input
                    type="checkbox"
                    checked={Boolean(a11yPreferences[field])}
                    onChange={(event) => updateA11y(field, event.target.checked)}
                    className="mt-1 h-5 w-5 accent-primary-600 rounded"
                  />
                  <span>
                    <strong className="block text-sm text-surface-900 dark:text-white">{label}</strong>
                    <span className="mt-1 block text-xs text-surface-500 dark:text-surface-400">{description}</span>
                  </span>
                </label>
              ))}
            </div>

            <p className="text-xs text-surface-400 dark:text-surface-500">{t('accessibility.storage')}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
