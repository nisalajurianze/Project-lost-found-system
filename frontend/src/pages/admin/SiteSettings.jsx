import React, { useState, useEffect } from 'react';
import settingService from '../../../services/settingService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import toast from 'react-hot-toast';
import { FiSave } from 'react-icons/fi';

export const SiteSettings = () => {
  const [contactDetails, setContactDetails] = useState({
    office: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err) {
      toast.error('Failed to update contact details');
      console.error(err);
    } finally {
      setIsSaving(false);
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
        <h2 className="text-lg font-bold font-display text-surface-900 dark:text-white mb-6 border-b border-surface-100 dark:border-surface-700 pb-3">
          Contact Details
        </h2>

        <form onSubmit={handleSaveContactDetails} className="space-y-4">
          <Input
            label="University Office (Address)"
            name="office"
            value={contactDetails.office}
            onChange={handleChange}
            placeholder="e.g. Student Affairs Office, Admin Building, 2nd Floor"
            required
          />
          <Input
            type="email"
            label="Email Address"
            name="email"
            value={contactDetails.email}
            onChange={handleChange}
            placeholder="e.g. support-lostfound@university.edu"
            required
          />
          <Input
            label="Telephone Line"
            name="phone"
            value={contactDetails.phone}
            onChange={handleChange}
            placeholder="e.g. +94 55 2226262 (Ext: 1104)"
            required
          />

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              icon={<FiSave />}
            >
              Save Contact Details
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiteSettings;
