// ============================================
// Profile Settings Page Component
// Personal profile edit inputs, profile avatar uploads, and password change
// ============================================

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfile } from '../../redux/slices/authSlice';
import api from '../../services/api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { getInitials } from '../../utils/helpers';
import { FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';

export const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

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
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
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
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
        return;
      }

      const compressToast = toast.loading('Compressing image...');
      try {
        const options = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        setAvatar(compressedFile);
        setAvatarPreview(URL.createObjectURL(compressedFile));
        toast.success('Image ready!', { id: compressToast });
      } catch (error) {
        console.error("Compression error:", error);
        toast.error('Failed to process image.', { id: compressToast });
      }
    }
  };

  // Password submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.put('/users/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsEditingPassword(false);
    } catch (err) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your personal profile and account credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card & Details Form */}
        <div className="lg:col-span-2 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white">
              Account Information
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
                    Edit Profile
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            
            {/* Avatar Uploader */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-surface-100 dark:border-surface-800">
              <div 
                className={`relative group ${isEditing ? 'cursor-pointer' : 'opacity-80'}`} 
                onClick={() => isEditing && document.getElementById('avatar-input').click()}
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
              </div>
              <div>
                <p className="text-sm font-bold text-surface-900 dark:text-white">Profile Avatar</p>
                <p className="text-xs text-surface-400 mt-1">PNG, JPG or WebP. Capped at 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={!isEditing}
              />
              <Input
                label="Student ID / Admin Code *"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                disabled={!isEditing}
              />
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Email Address (Locked)"
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
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isUpdatingProfile}
                  >
                    Cancel
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="lg:col-span-1 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl h-fit">
          <div className={`flex justify-between items-center ${isEditingPassword ? 'mb-6' : ''} transition-all duration-300`}>
            <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white">
              Change Password
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
                    Edit
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
                  label="Current Password *"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="New Password *"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  helperText="Must be at least 8 characters"
                />
                <Input
                  type="password"
                  label="Confirm New Password *"
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
                    Update
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelPasswordEdit}
                    disabled={isChangingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default Profile;

