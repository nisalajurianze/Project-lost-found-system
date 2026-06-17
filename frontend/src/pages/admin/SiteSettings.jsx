import React, { useState, useEffect } from 'react';
import settingService from '../../services/settingService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiSave, FiEye, FiEyeOff, FiLock, FiGlobe } from 'react-icons/fi';

export const SiteSettings = () => {
  const [contactDetails, setContactDetails] = useState({
    office: '',
    email: '',
    phone: ''
  });
  const [contactVisibility, setContactVisibility] = useState('request_only');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [contactRes, visibilityRes] = await Promise.allSettled([
        settingService.getPublicSetting('contact_details'),
        settingService.getPublicSetting('contact_visibility')
      ]);

      if (contactRes.status === 'fulfilled' && contactRes.value?.data) {
        setContactDetails({
          office: contactRes.value.data.office || '',
          email: contactRes.value.data.email || '',
          phone: contactRes.value.data.phone || ''
        });
      }

      if (visibilityRes.status === 'fulfilled' && visibilityRes.value?.data) {
        setContactVisibility(visibilityRes.value.data || 'request_only');
      }
    } catch (err) {
      // silent - defaults are fine
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContactDetails = async (e) => {
    e.preventDefault();
    setIsSavingContact(true);
    try {
      await settingService.updateSetting('contact_details', contactDetails, 'Public contact details for the Contact Us page');
      toast.success('Contact details updated successfully');
    } catch (err) {
      toast.error('Failed to update contact details');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSaveVisibility = async (value) => {
    setContactVisibility(value);
    setIsSavingVisibility(true);
    try {
      await settingService.updateSetting(
        'contact_visibility',
        value,
        'Controls whether item reporter/finder contact details are shown publicly or only after connecting'
      );
      toast.success(`Contact visibility set to: ${value === 'public' ? 'Public (everyone sees)' : 'Request Only'}`);
    } catch (err) {
      toast.error('Failed to update visibility setting');
      setContactVisibility(value === 'public' ? 'request_only' : 'public'); // rollback
    } finally {
      setIsSavingVisibility(false);
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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900 dark:text-white">
          Site Settings
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage dynamic website configurations
        </p>
      </div>

      {/* Contact Visibility Setting */}
      <div className="card p-6 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <h2 className="text-lg font-bold font-display text-surface-900 dark:text-white mb-1 border-b border-surface-100 dark:border-surface-700 pb-3">
          Item Contact Visibility
        </h2>
        <p className="text-xs text-surface-500 dark:text-surface-400 mb-6">
          Control when finder/reporter contact details are shown on item detail pages.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Public Option */}
          <button
            onClick={() => handleSaveVisibility('public')}
            disabled={isSavingVisibility}
            className={`relative flex flex-col items-start gap-2 p-5 rounded-xl border-2 transition-all text-left ${
              contactVisibility === 'public'
                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
            }`}
          >
            {contactVisibility === 'public' && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            )}
            <div className={`p-2.5 rounded-lg ${contactVisibility === 'public' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'}`}>
              <FiGlobe className="text-lg" />
            </div>
            <div>
              <p className="font-bold text-surface-900 dark:text-white text-sm">Public</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed">
                Everyone can see the contact details on the item page — no need to connect first.
              </p>
            </div>
          </button>

          {/* Request Only Option */}
          <button
            onClick={() => handleSaveVisibility('request_only')}
            disabled={isSavingVisibility}
            className={`relative flex flex-col items-start gap-2 p-5 rounded-xl border-2 transition-all text-left ${
              contactVisibility === 'request_only'
                ? 'border-primary-500 bg-primary-500/5 dark:bg-primary-500/10'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
            }`}
          >
            {contactVisibility === 'request_only' && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary-500"></span>
            )}
            <div className={`p-2.5 rounded-lg ${contactVisibility === 'request_only' ? 'bg-primary-500/15 text-primary-500' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'}`}>
              <FiLock className="text-lg" />
            </div>
            <div>
              <p className="font-bold text-surface-900 dark:text-white text-sm">Request Only</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed">
                Contact details are hidden until the user clicks <strong>"This is mine"</strong> or <strong>"I have this"</strong>.
              </p>
            </div>
          </button>
        </div>

        <div className={`mt-4 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
          contactVisibility === 'public'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
        }`}>
          {contactVisibility === 'public' ? <FiEye /> : <FiEyeOff />}
          {contactVisibility === 'public'
            ? 'Contact details are currently visible to all visitors.'
            : 'Contact details are only revealed after a user connects (requests).'}
        </div>
      </div>

      {/* Contact Details Form */}
      <div className="card p-6 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <h2 className="text-lg font-bold font-display text-surface-900 dark:text-white mb-1 border-b border-surface-100 dark:border-surface-700 pb-3">
          Contact Details
        </h2>
        <p className="text-xs text-surface-500 dark:text-surface-400 mb-6">
          Displayed on the public Contact Us page.
        </p>

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
              isLoading={isSavingContact}
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
