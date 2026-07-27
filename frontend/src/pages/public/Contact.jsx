import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Button from '../../components/common/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import settingService from '../../services/settingService';
import feedbackService from '../../services/feedbackService';

export const Contact = () => {
  const { t } = useLanguage();
  const { user } = useSelector((state) => state.auth);
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);

  useEffect(() => {
    let active = true;
    settingService.getPublicSetting('contact_details')
      .then((response) => { if (active && response?.data) setContactDetails(response.data); })
      .catch((error) => console.error('Failed to fetch contact details:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setName(user?.fullName || '');
    setEmail(user?.email || '');
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error(t('contact.signInRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await feedbackService.createFeedback({
        subject: t('contact.subject', { name }),
        message,
        rating: 5,
        category: 'general',
      });
      toast.success(t('contact.sent'));
      setName(user.fullName || '');
      setEmail(user.email || '');
      setMessage('');
    } catch (error) {
      toast.error(t('contact.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const contactInfos = [
    {
      title: t('contact.office'),
      desc: contactDetails?.office || t('contact.officeMissing'),
      icon: <FiMapPin className="text-xl text-primary-500" aria-hidden="true" />,
      href: contactDetails?.office ? `https://maps.google.com/?q=${encodeURIComponent(contactDetails.office)}` : undefined,
      external: true,
    },
    {
      title: t('contact.emailTitle'),
      desc: contactDetails?.email || t('contact.emailMissing'),
      icon: <FiMail className="text-xl text-cyan-500" aria-hidden="true" />,
      href: contactDetails?.email ? `mailto:${contactDetails.email}` : undefined,
    },
    {
      title: t('contact.phoneTitle'),
      desc: contactDetails?.phone || t('contact.phoneMissing'),
      icon: <FiPhone className="text-xl text-emerald-500" aria-hidden="true" />,
      href: contactDetails?.phone ? `tel:${contactDetails.phone}` : undefined,
    },
  ];

  return (
    <div className="flex-1 py-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold font-display text-surface-900 dark:text-white">{t('contact.title')}</h1>
          <p className="text-base text-surface-500 dark:text-surface-400 mt-2">{t('contact.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <section className="md:col-span-1 flex flex-col gap-6" aria-label={t('contact.title')}>
            {contactInfos.map((info) => {
              const CardComponent = info.href ? 'a' : 'div';
              const cardProps = info.href ? { href: info.href, target: info.external ? '_blank' : undefined, rel: info.external ? 'noopener noreferrer' : undefined } : {};
              return (
                <CardComponent key={info.title} {...cardProps} className={`card p-5 bg-white dark:bg-surface-800 border border-surface-200/50 dark:border-surface-800 flex items-start gap-4 ${info.href ? 'hover:border-primary-500/30 cursor-pointer transition-colors block' : ''}`}>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex-shrink-0">{info.icon}</div>
                  <div>
                    <h2 className="text-base font-bold text-surface-950 dark:text-white">{info.title}</h2>
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">{info.desc}</p>
                  </div>
                </CardComponent>
              );
            })}
          </section>

          <section className="md:col-span-2 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl" aria-labelledby="contact-form-title">
            <h2 id="contact-form-title" className="text-lg font-bold font-display text-surface-900 dark:text-white mb-6">{t('contact.formTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('contact.name')} name="name" autoComplete="name" placeholder={t('contact.namePlaceholder')} value={name} onChange={(event) => setName(event.target.value)} required />
                <Input label={t('auth.email')} name="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <Textarea label={t('contact.message')} name="message" placeholder={t('contact.messagePlaceholder')} value={message} onChange={(event) => setMessage(event.target.value)} required />
              <Button type="submit" variant="primary" className="w-full sm:w-auto" isLoading={isLoading}>{t('contact.send')}</Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Contact;
