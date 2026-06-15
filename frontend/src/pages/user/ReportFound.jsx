// ============================================
// Report Found Item Form Component
// Multiparts form data with storage locations inputs
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createNewFoundReport } from '../../redux/slices/foundItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import CreatableCategorySelect from '../../components/common/CreatableCategorySelect';
import ImageUpload from '../../components/common/ImageUpload';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import aiService from '../../services/aiService';

export const ReportFound = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { categories } = useSelector((state) => state.categories);
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDate, setFoundDate] = useState('');
  const [storedAt, setStoredAt] = useState('');
  const [contactPreference, setContactPreference] = useState('both');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);

  // Errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validations
    const formErrors = {};
    if (!itemName.trim()) formErrors.itemName = 'Item name is required';
    if (!category) formErrors.category = 'Category is required';
    if (!description.trim() || description.length < 10) {
      formErrors.description = 'Description must be at least 10 characters';
    }
    if (!foundLocation.trim()) formErrors.foundLocation = 'Found location is required';
    if (!foundDate) formErrors.foundDate = 'Found date is required';
    else if (new Date(foundDate) > new Date()) {
      formErrors.foundDate = 'Date cannot be in the future';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Please fix errors in the form.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('itemName', itemName);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('foundLocation', foundLocation);
      formData.append('foundDate', new Date(foundDate).toISOString());
      formData.append('storedAt', storedAt);
      formData.append('contactPreference', contactPreference);
      formData.append('tags', tags);

      // Append images
      images.forEach((img) => {
        formData.append('images', img);
      });

      await dispatch(createNewFoundReport(formData)).unwrap();
      toast.success('Found report submitted! AI matching triggered.');
      navigate('/dashboard/my-found');
    } catch (err) {
      toast.error(err || 'Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = async (imgs) => {
    setImages(imgs);
    
    // If it's the first image being added and fields are mostly empty, suggest details
    if (imgs.length === 1 && !itemName && !description) {
      const loadingToast = toast.loading('✨ AI is analyzing your image...');
      try {
        const result = await aiService.suggestDetailsFromImage(imgs[0]);
        if (result && result.data) {
          if (result.data.itemName) setItemName(result.data.itemName);
          if (result.data.category) setCategory(result.data.category);
          if (result.data.description) setDescription(result.data.description);
          if (result.data.tags) setTags(result.data.tags);
          toast.success('Fields auto-filled by AI!', { id: loadingToast });
        } else {
          toast.dismiss(loadingToast);
        }
      } catch (err) {
        toast.dismiss(loadingToast);
      }
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.name,
    label: `${cat.icon} ${cat.name}`
  }));

  const contactOptions = [
    { value: 'both', label: 'Email & Phone Number' },
    { value: 'email', label: 'Email Only' },
    { value: 'phone', label: 'Phone Number Only' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          Report Found Property
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          Provide accurate details about the item you found on campus
        </p>
      </div>

      <div className="glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Item Name / Title"
              placeholder="e.g. Mi Smart Band 6"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              error={errors.itemName}
              required
            />
            
            <CreatableCategorySelect
              label="Item Category"
              name="category"
              options={categoryOptions}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              error={errors.category}
              required
            />
          </div>

          <Textarea
            label="Item Description"
            placeholder="Describe unique characteristics like screen conditions, colors, covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
            required
            helperText="Minimum 10 characters."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Where was it found?"
              placeholder="e.g. Science Block lecture hall B"
              value={foundLocation}
              onChange={(e) => setFoundLocation(e.target.value)}
              error={errors.foundLocation}
              required
            />

            <Input
              label="Date & Time Found"
              type="datetime-local"
              value={foundDate}
              onChange={(e) => setFoundDate(e.target.value)}
              error={errors.foundDate}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Current Safe Storage Location"
              placeholder="e.g. Science Faculty Office Desk"
              value={storedAt}
              onChange={(e) => setStoredAt(e.target.value)}
              helperText="Where can the owner collect it?"
            />

            <Input
              label="Tags / Search Keywords (Optional)"
              placeholder="e.g. smartwatch, fitness, wristband"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              helperText="Comma separated values."
            />
          </div>

          <Select
            label="Contact Preference"
            options={contactOptions}
            value={contactPreference}
            onChange={(e) => setContactPreference(e.target.value)}
          />

          {/* Image Uploader */}
          <ImageUpload
            images={images}
            onChange={handleImageChange}
            maxFiles={5}
            label="Upload Item Images (Auto-fill supported via AI)"
          />

          <div className="flex gap-4 pt-4 border-t border-surface-100 dark:border-surface-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Submit Report
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ReportFound;

