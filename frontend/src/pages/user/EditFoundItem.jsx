// ============================================
// Edit Found Item Form Component
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFoundItemById, updateFoundReport } from '../../redux/slices/foundItemSlice';
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

export const EditFoundItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { categories } = useSelector((state) => state.categories);
  const { currentItem, isLoading: itemLoading } = useSelector((state) => state.foundItems);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDate, setFoundDate] = useState('');
  const [storedAt, setStoredAt] = useState('');
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
    dispatch(fetchFoundItemById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (currentItem && currentItem._id === id) {
      setItemName(currentItem.itemName || '');
      setCategory(currentItem.category || '');
      setDescription(currentItem.description || '');
      setFoundLocation(currentItem.foundLocation || '');
      
      // Format date for datetime-local input
      if (currentItem.foundDate) {
        const dateObj = new Date(currentItem.foundDate);
        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
        setFoundDate(dateObj.toISOString().slice(0, 16));
      }
      
      setStoredAt(currentItem.storedAt || '');
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

    setIsSaving(true);

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

      // Append deleted images
      deletedImages.forEach((url) => {
        formData.append('deletedImages', url);
      });

      // Append new images
      newImages.forEach((img) => {
        formData.append('images', img);
      });

      await dispatch(updateFoundReport({ id, formData })).unwrap();
      toast.success('Found report updated successfully!');
      navigate('/dashboard/my-found');
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
          Edit Found Property Report
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          Update the details of the item you found
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
              onClick={() => navigate('/dashboard/my-found')}
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

export default EditFoundItem;
