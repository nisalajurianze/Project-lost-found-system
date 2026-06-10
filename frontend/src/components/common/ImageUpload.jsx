// ============================================
// Image Uploader Component
// Drag-and-drop support, image limits, and preview cards
// ============================================

import React, { useState } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export const ImageUpload = ({
  images = [],
  onChange,
  maxFiles = 5,
  label = 'Upload Images'
}) => {
  const [previews, setPreviews] = useState([]);

  const handleFiles = (files) => {
    const totalFiles = images.length + files.length;
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed.`);
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    Array.from(files).forEach((file) => {
      // Validate type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`);
        return;
      }
      
      // Validate size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit.`);
        return;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    if (validFiles.length > 0) {
      onChange([...images, ...validFiles]);
      setPreviews([...previews, ...newPreviews]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInput = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index) => {
    // Revoke object URL to avoid memory leak
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }

    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    onChange(updatedImages);
    setPreviews(updatedPreviews);
  };

  return (
    <div className="w-full">
      <span className="input-label mb-2 block">{label}</span>
      
      {/* Drag & Drop Area */}
      {images.length < maxFiles && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
          onClick={() => document.getElementById('image-upload-input').click()}
        >
          <FiUpload className="text-3xl text-surface-400 mb-2" />
          <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
            Drag & drop images here or <span className="text-primary-500 font-semibold">browse</span>
          </p>
          <p className="text-xs text-surface-400 mt-1">
            PNG, JPG, WebP up to 5MB (Max {maxFiles} images)
          </p>
          <input
            id="image-upload-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleInput}
          />
        </div>
      )}

      {/* Previews List */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mt-4">
          {images.map((img, index) => {
            const isFile = img instanceof File;
            const src = isFile ? previews[index] : img.url || img;
            
            return (
              <div key={index} className="relative aspect-square rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden group">
                <img
                  src={src}
                  alt={`Preview ${index}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                >
                  <FiX className="text-xs" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
