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
  const handleAvatarChange = (e) => {
    if (!isEditing) return;
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Avatar image must be under 2MB.');
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
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
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
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

            {isEditing && (
              <div className="flex gap-3 pt-2">
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
              </div>
            )}
          </form>
        </div>

        {/* Change Password Card */}
        <div className="lg:col-span-1 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl h-fit">
          <div className={`flex justify-between items-center ${isEditingPassword ? 'mb-6' : ''} transition-all duration-300`}>
            <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white">
              Change Password
            </h3>
            {!isEditingPassword && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingPassword(true)}>
                Edit
              </Button>
            )}
          </div>

          <div className={`grid transition-all duration-300 ease-in-out ${isEditingPassword ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
                <Input
                  label="Current Password *"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={!isEditingPassword}
                />
                <Input
                  label="New Password *"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={!isEditingPassword}
                />
                <Input
                  label="Confirm New Password *"
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  disabled={!isEditingPassword}
                />

                {isEditingPassword && (
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      isLoading={isChangingPassword}
                    >
                      Update Password
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleCancelPasswordEdit}
                      disabled={isChangingPassword}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;

