// ============================================
// Image Uploader Component
// Drag-and-drop support, image limits, and preview cards
// ============================================

import React, { useState } from 'react';
import { FiUpload, FiX, FiCamera } from 'react-icons/fi';
import { BiLoaderAlt } from 'react-icons/bi';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

export const ImageUpload = ({
  images = [],
  onChange,
  maxFiles = 5,
  label = 'Upload Images'
}) => {
  const [previews, setPreviews] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Sync previews if parent clears the images array
  React.useEffect(() => {
    if (images.length === 0 && previews.length > 0) {
      previews.forEach(p => URL.revokeObjectURL(p));
      setPreviews([]);
    }
  }, [images.length]);

  const handleFiles = async (files) => {
    const totalFiles = images.length + files.length;
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed.`);
      return;
    }

    setIsCompressing(true);
    const validFiles = [];
    const newPreviews = [];

    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };

    for (const file of files) {
      // Validate type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }

      try {
        const compressedFile = await imageCompression(file, options);
        validFiles.push(compressedFile);
        newPreviews.push(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Compression error:", error);
        toast.error(`Failed to compress ${file.name}`);
      }
    }

    if (validFiles.length > 0) {
      onChange([...images, ...validFiles]);
      setPreviews([...previews, ...newPreviews]);
    }
    
    setIsCompressing(false);
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
          {isCompressing ? (
            <div className="flex flex-col items-center">
              <BiLoaderAlt className="text-3xl text-primary-500 mb-2 animate-spin" />
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                Compressing images...
              </p>
            </div>
          ) : (
            <>
              <FiUpload className="text-3xl text-surface-400 mb-2" />
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                Drag & drop images here or <span className="text-primary-500 font-semibold">browse</span>
              </p>
              
              <div className="flex items-center justify-center mt-3 mb-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('camera-upload-input').click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-primary-500 hover:text-white transition-colors text-xs font-semibold shadow-sm"
                >
                  <FiCamera className="text-sm" /> Take Photo
                </button>
              </div>

              <p className="text-xs text-surface-400 mt-1">
                PNG, JPG, WebP (Max {maxFiles} images)
              </p>
            </>
          )}
          <input
            id="image-upload-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleInput}
          />
          <input
            id="camera-upload-input"
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInput}
          />
        </div>
      )}

      {/* Previews List */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mt-4">
          {images.map((img, index) => {
            const isFile = img instanceof File || img instanceof Blob;
            const src = isFile ? previews[index] : img.url || img;
            
            return (
              <div key={index} className="relative aspect-square rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden group bg-surface-100 dark:bg-surface-800 p-1">
                <img
                  src={src}
                  alt={`Preview ${index}`}
                  className="w-full h-full object-contain drop-shadow-sm"
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

