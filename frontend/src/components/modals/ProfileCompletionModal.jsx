import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateUserProfile } from '../../redux/slices/authSlice';
import authService from '../../services/authService';
import Input from '../common/Input';
import Button from '../common/Button';
import { validatePhone, validateStudentId } from '../../utils/validators';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiX, FiCamera } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';

const ProfileCompletionModal = ({ isOpen, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!phone) errors.phone = 'Phone number is required';
    else if (!validatePhone(phone)) {
      errors.phone = 'Invalid SL phone number (e.g. 0771234567 or +94771234567)';
    }

    if (!studentId) errors.studentId = 'Student ID is required';
    else if (!validateStudentId(studentId)) {
      errors.studentId = 'Student ID must be 2-30 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      
      let profileData;
      if (avatar) {
        profileData = new FormData();
        profileData.append('phone', phone);
        profileData.append('studentId', studentId);
        profileData.append('profileImage', avatar);
      } else {
        profileData = { phone, studentId };
      }

      const updatedUser = await authService.updateProfile(profileData);
      dispatch(updateUserProfile(updatedUser));
      toast.success('Profile completed successfully!');
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
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
        console.error('Image compression error:', error);
        toast.error('Failed to process image.', { id: compressToast });
        // Fallback to uncompressed
        setAvatar(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-surface-200 dark:border-surface-800 animate-scale-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FiAlertCircle className="text-xl text-amber-600 dark:text-amber-500" />
              </div>
              <h3 className="text-xl font-bold font-display text-surface-900 dark:text-white">
                Complete Your Profile
              </h3>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              >
                <FiX className="text-2xl" />
              </button>
            )}
          </div>
          
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-6 leading-relaxed">
            Since you signed in with Google, we need your <strong>Phone Number</strong> and <strong>Student ID</strong> before you can report or claim items. This helps us connect you with others securely.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex items-center gap-4 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-surface-200 dark:bg-surface-700 border-2 border-surface-100 dark:border-surface-600 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <FiCamera className="text-xl text-surface-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  id="modalAvatar"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <label
                  htmlFor="modalAvatar"
                  className="absolute bottom-0 right-0 h-5 w-5 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary-600 transition-colors ring-2 ring-white dark:ring-surface-900"
                >
                  <span className="text-[10px] text-white font-bold">+</span>
                </label>
              </div>
              <div>
                <p className="text-sm font-bold text-surface-900 dark:text-white">Add a Profile Picture <span className="font-normal text-surface-400">(Optional)</span></p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Helps others easily recognize you.</p>
              </div>
            </div>

            <Input
              label="Phone Number"
              name="phone"
              placeholder="e.g. 0771234567 or +94771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={fieldErrors.phone}
              required
              helperText="Sri Lankan format required for contact sharing."
            />

            <Input
              label="Student ID / Admin Code"
              name="studentId"
              placeholder="e.g. UWU-2023-CS-0045"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              error={fieldErrors.studentId}
              required
            />

            <div className="pt-4 flex gap-3">
              {onClose && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={isLoading}
                className="flex-1"
              >
                Save Details
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;
