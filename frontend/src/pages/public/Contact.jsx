// ============================================
// Contact Page Component
// Campus support details and feedback forms
// ============================================

import React, { useState } from 'react';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Your message has been sent! We will contact you soon.');
      setName('');
      setEmail('');
      setMessage('');
    }, 1000);
  };

  const contactInfos = [
    {
      title: 'University Office',
      desc: 'Student Affairs Office, Admin Building, 2nd Floor',
      icon: <FiMapPin className="text-xl text-primary-500" />
    },
    {
      title: 'Email Address',
      desc: 'support-lostfound@university.edu',
      icon: <FiMail className="text-xl text-cyan-500" />
    },
    {
      title: 'Telephone Line',
      desc: '+94 55 2226262 (Ext: 1104)',
      icon: <FiPhone className="text-xl text-emerald-500" />
    }
  ];

  return (
    <div className="flex-1 py-12 bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <div className="page-container max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold font-display text-surface-900 dark:text-white">
            Contact Support
          </h1>
          <p className="text-base text-surface-500 dark:text-surface-400 mt-2">
            Get in touch with the Student Affairs Office or send system feedback
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Support Details */}
          <div className="md:col-span-1 flex flex-col gap-6">
            {contactInfos.map((info, index) => (
              <div key={index} className="card p-5 bg-white dark:bg-surface-800 border border-surface-200/50 dark:border-surface-800 flex items-start gap-4">
                <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex-shrink-0">
                  {info.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-950 dark:text-white">
                    {info.title}
                  </h4>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                    {info.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Query Form */}
          <div className="md:col-span-2 glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
            <h3 className="text-lg font-bold font-display text-surface-900 dark:text-white mb-6">
              Send a Quick Message
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Name"
                  name="name"
                  placeholder="e.g. Dineth"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="e.g. student@student.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Textarea
                label="Your Message"
                name="message"
                placeholder="What can we help you with?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto"
                isLoading={isLoading}
              >
                Send Message
              </Button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Contact;

