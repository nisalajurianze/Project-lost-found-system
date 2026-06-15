// ============================================
// Edit Lost Item Form Component
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLostItemById, updateLostReport } from '../../redux/slices/lostItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import CreatableCategorySelect from '../../components/common/CreatableCategorySelect';
import ImageUpload from '../../components/common/ImageUpload';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';
import Loader from '../../components/common/Loader';

export const EditLostItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { categories } = useSelector((state) => state.categories);
  const { currentItem, isLoading: itemLoading } = useSelector((state) => state.lostItems);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [lostLocation, setLostLocation] = useState('');
  const [lostDate, setLostDate] = useState('');
  const [contactPreference, setContactPreference] = useState('both');
  const [tags, setTags] = useState('');
  
  // Images
  const [existingImages, setExistingImages] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  // Errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchLostItemById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (currentItem && currentItem._id === id) {
      setItemName(currentItem.itemName || '');
      setCategory(currentItem.category || '');
      setDescription(currentItem.description || '');
      setLostLocation(currentItem.lostLocation || '');
      
      // Format date for datetime-local input
      if (currentItem.lostDate) {
        const dateObj = new Date(currentItem.lostDate);
        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
        setLostDate(dateObj.toISOString().slice(0, 16));
      }
      
      setContactPreference(currentItem.contactPreference || 'both');
      setTags(currentItem.tags ? currentItem.tags.join(', ') : '');
      
      setExistingImages(currentItem.images || []);
      setDeletedImages([]);
      setNewImages([]);
    }
  }, [currentItem, id]);

  const handleDeleteExistingImage = (imgUrl) => {
    setDeletedImages((prev) => [...prev, imgUrl]);
    setExistingImages((prev) => prev.filter((img) => img.url !== imgUrl));
  };

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
    if (!lostLocation.trim()) formErrors.lostLocation = 'Lost location is required';
    if (!lostDate) formErrors.lostDate = 'Lost date is required';
    else if (new Date(lostDate) > new Date()) {
      formErrors.lostDate = 'Date cannot be in the future';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Please fix errors in the form.');
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('itemName', itemName);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('lostLocation', lostLocation);
      formData.append('lostDate', new Date(lostDate).toISOString());
      formData.append('contactPreference', contactPreference);
      formData.append('tags', tags);

      // Append deleted images
      deletedImages.forEach((url) => {
        formData.append('deletedImages', url);
      });

      // Append new images
      newImages.forEach((img) => {
        formData.append('images', img);
      });

      await dispatch(updateLostReport({ id, formData })).unwrap();
      toast.success('Lost report updated successfully!');
      navigate('/dashboard/my-lost');
    } catch (err) {
      toast.error(err || 'Failed to update report.');
    } finally {
      setIsSaving(false);
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

  if (itemLoading && !currentItem) {
    return <Loader fullPage />;
  }

  const maxNewImages = 5 - existingImages.length;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          Edit Lost Property Report
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          Update the details of your lost property
        </p>
      </div>

      <div className="glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Item Name / Title"
              placeholder="e.g. Space Grey iPhone 13 Pro"
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
            placeholder="Describe unique characteristics like stickers, scratches, colors, models..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
            required
            helperText="Minimum 10 characters."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Last Seen Location"
              placeholder="e.g. Library 2nd floor desk"
              value={lostLocation}
              onChange={(e) => setLostLocation(e.target.value)}
              error={errors.lostLocation}
              required
            />

            <Input
              label="Estimated Date & Time Lost"
              type="datetime-local"
              value={lostDate}
              onChange={(e) => setLostDate(e.target.value)}
              error={errors.lostDate}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Contact Preference"
              options={contactOptions}
              value={contactPreference}
              onChange={(e) => setContactPreference(e.target.value)}
            />

            <Input
              label="Tags / Search Keywords (Optional)"
              placeholder="e.g. apple, phone, electronics, gray"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              helperText="Comma separated values."
            />
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <span className="input-label block">Current Images</span>
              <div className="flex flex-wrap gap-4">
                {existingImages.map((img) => (
                  <div key={img.publicId} className="relative w-24 h-24 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                    <img src={img.url} alt="Current" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingImage(img.url)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors"
                      title="Remove image"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Uploader */}
          <ImageUpload
            images={newImages}
            onChange={(imgs) => setNewImages(imgs)}
            maxFiles={maxNewImages}
            label={`Upload New Images (Max ${maxNewImages} more)`}
          />

          <div className="flex gap-4 pt-4 border-t border-surface-100 dark:border-surface-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard/my-lost')}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditLostItem;
