import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiAlertCircle, FiCamera } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
import { useLanguage } from '../../i18n/LanguageContext';
import { updateUserProfile } from '../../redux/slices/authSlice';
import authService from '../../services/authService';
import { validatePhone, validateStudentId } from '../../utils/validators';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

const ProfileCompletionModal = ({ isOpen, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const setPreviewFile = (file) => {
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!phone.trim()) errors.phone = t('profileCompletion.phoneRequired');
    else if (!validatePhone(phone.trim())) errors.phone = t('profileCompletion.phoneInvalid');
    if (!studentId.trim()) errors.studentId = t('profileCompletion.studentRequired');
    else if (!validateStudentId(studentId.trim())) errors.studentId = t('profileCompletion.studentInvalid');
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setIsLoading(true);
    try {
      let profileData;
      if (avatar) {
        profileData = new FormData();
        profileData.append('phone', phone.trim());
        profileData.append('studentId', studentId.trim());
        profileData.append('profileImage', avatar);
      } else {
        profileData = { phone: phone.trim(), studentId: studentId.trim() };
      }
      const updatedUser = await authService.updateProfile(profileData);
      dispatch(updateUserProfile(updatedUser));
      toast.success(t('profileCompletion.success'));
      onSuccess?.();
      onClose?.();
    } catch {
      toast.error(t('profileCompletion.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('profileCompletion.imageType'));
      return;
    }
    const compressToast = toast.loading(t('profileCompletion.compressing'));
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1024, useWebWorker: true });
      setPreviewFile(compressedFile);
      toast.success(t('profileCompletion.imageReady'), { id: compressToast });
    } catch {
      setPreviewFile(file);
      toast.error(t('profileCompletion.imageError'), { id: compressToast });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profileCompletion.title')} closeLabel={t('profileCompletion.close')} size="md">
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <FiAlertCircle aria-hidden="true" className="mt-0.5 flex-none text-xl" />
          <p>{t('profileCompletion.description')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface-100 bg-surface-200 dark:border-surface-600 dark:bg-surface-700">
              {avatarPreview ? <img src={avatarPreview} alt={t('profileCompletion.avatarAlt')} className="h-full w-full object-cover" /> : <FiCamera aria-hidden="true" className="text-xl text-surface-400" />}
            </div>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-surface-900 dark:text-white">{t('profileCompletion.addPicture')} <span className="font-normal text-surface-400">({t('profileCompletion.optional')})</span></p><p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{t('profileCompletion.pictureDesc')}</p></div>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} aria-label={t('profileCompletion.choosePicture')} icon={<FiCamera aria-hidden="true" />}>{t('profileCompletion.choosePicture')}</Button>
          </div>
          <Input label={t('profileCompletion.phone')} name="phone" autoComplete="tel" inputMode="tel" placeholder={t('profileCompletion.phonePlaceholder')} value={phone} onChange={(event) => { setPhone(event.target.value); setFieldErrors((current) => ({ ...current, phone: '' })); }} error={fieldErrors.phone} required helperText={t('profileCompletion.phoneHelp')} />
          <Input label={t('profileCompletion.studentId')} name="studentId" autoComplete="off" placeholder={t('profileCompletion.studentPlaceholder')} value={studentId} onChange={(event) => { setStudentId(event.target.value); setFieldErrors((current) => ({ ...current, studentId: '' })); }} error={fieldErrors.studentId} required />
          <div className="flex flex-col-reverse gap-3 border-t border-surface-100 pt-4 dark:border-surface-800 sm:flex-row sm:justify-end">
            {onClose && <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>{t('profileCompletion.cancel')}</Button>}
            <Button type="submit" variant="primary" isLoading={isLoading}>{t('profileCompletion.save')}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProfileCompletionModal;
