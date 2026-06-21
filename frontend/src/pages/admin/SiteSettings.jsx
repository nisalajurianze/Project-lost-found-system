import React, { useState, useEffect } from 'react';
import settingService from '../../services/settingService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiSave, FiEdit2 } from 'react-icons/fi';

export const SiteSettings = () => {
  const [contactDetails, setContactDetails] = useState({
    office: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [isSavingAuth, setIsSavingAuth] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingService.getPublicSetting('contact_details');
      if (res && res.data) {
        setContactDetails({
          office: res.data.office || '',
          email: res.data.email || '',
          phone: res.data.phone || ''
        });
      }
      
      const authRes = await settingService.getPublicSetting('require_email_verification');
      if (authRes && authRes.data !== null && authRes.data !== undefined) {
        setRequireEmailVerification(authRes.data === true || authRes.data === 'true');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Not found is fine for initial setup
      } else {
        toast.error('Failed to load site settings');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContactDetails = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingService.updateSetting('contact_details', contactDetails, 'Public contact details for the Contact Us page');
      toast.success('Contact details updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update contact details');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAuthSetting = async () => {
    setIsSavingAuth(true);
    const newValue = !requireEmailVerification;
    try {
      await settingService.updateSetting('require_email_verification', newValue, 'Require email verification for new registrations');
      setRequireEmailVerification(newValue);
      toast.success(newValue ? 'Email verification enabled' : 'Email verification disabled');
    } catch (err) {
      toast.error('Failed to update authentication settings');
      console.error(err);
    } finally {
      setIsSavingAuth(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContactDetails(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-surface-200 dark:bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-surface-200 dark:bg-surface-800 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-surface-900 dark:text-white">
          Site Settings
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage dynamic website configurations
        </p>
      </div>

      <div className="card p-6 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <div className="flex justify-between items-center mb-6 border-b border-surface-100 dark:border-surface-700 pb-3">
          <h2 className="text-lg font-bold font-display text-surface-900 dark:text-white">
            Contact Details
          </h2>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<FiEdit2 />}
            >
              Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSaveContactDetails} className="space-y-4">
          <Input
            label="University Office (Address)"
            name="office"
            value={contactDetails.office}
            onChange={handleChange}
            placeholder="e.g. Student Affairs Office, Admin Building, 2nd Floor"
            required
            disabled={!isEditing}
          />
          <Input
            type="email"
            label="Email Address"
            name="email"
            value={contactDetails.email}
            onChange={handleChange}
            placeholder="e.g. support-lostfound@university.edu"
            required
            disabled={!isEditing}
          />
          <Input
            label="Telephone Line"
            name="phone"
            value={contactDetails.phone}
            onChange={handleChange}
            placeholder="e.g. +94 55 2226262 (Ext: 1104)"
            required
            disabled={!isEditing}
          />

          {isEditing && (
            <div className="pt-4 flex gap-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                icon={<FiSave />}
              >
                Save Contact Details
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  fetchSettings(); // Reset fields to last saved state
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </form>
      </div>

      <div className="card p-6 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 mt-6">
        <div className="flex justify-between items-center mb-4 border-b border-surface-100 dark:border-surface-700 pb-3">
          <h2 className="text-lg font-bold font-display text-surface-900 dark:text-white">
            Authentication Settings
          </h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
          <div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-white">
              Require Email Verification
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-lg">
              When enabled, new users must verify their email address before logging in. Disable this for easier testing or demonstrations.
            </p>
          </div>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${requireEmailVerification ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'} ${isSavingAuth ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={requireEmailVerification}
            onClick={handleToggleAuthSetting}
            disabled={isSavingAuth}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireEmailVerification ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteSettings;

