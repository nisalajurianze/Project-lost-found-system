// ============================================
// Image Uploader Component
// Drag-and-drop support, image limits, and preview cards
// ============================================

import React, { useState } from 'react';
import { FiUpload, FiX, FiCamera, FiImage, FiCrop, FiRotateCw } from 'react-icons/fi';
import { BiLoaderAlt } from 'react-icons/bi';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { IMAGE_TRANSFORM_ERROR_CODES, transformImageFile } from '../../utils/imageTransform';
import { imageFileKey } from '../../utils/imageRedaction';
import { useLanguage } from '../../i18n/LanguageContext';
import { assessImageFile } from '../../utils/imageQuality';

export const ImageUpload = ({
  images = [],
  onChange,
  maxFiles = 5,
  label = null
}) => {
  const { t } = useLanguage();
  const [previews, setPreviews] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [preparationProgress, setPreparationProgress] = useState(null);
  const previewsRef = React.useRef([]);

  // Keep object URLs aligned with the parent image list, including moderation removals and edits.
  React.useEffect(() => {
    setPreviews((current) => {
      const currentByKey = new Map(current.map((preview) => [preview.key, preview]));
      const next = images.map((image) => {
        const key = imageFileKey(image);
        const existing = currentByKey.get(key);
        if (existing) return existing;
        if (image instanceof File || image instanceof Blob) return { key, url: URL.createObjectURL(image), owned: true };
        return { key, url: image?.url || image?.secureUrl || image, owned: false };
      });
      const nextKeys = new Set(next.map((preview) => preview.key));
      current.forEach((preview) => {
        if (preview.owned && !nextKeys.has(preview.key)) URL.revokeObjectURL(preview.url);
      });
      return next;
    });
  }, [images]);

  React.useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  React.useEffect(() => () => {
    previewsRef.current.forEach((preview) => {
      if (preview.owned) URL.revokeObjectURL(preview.url);
    });
  }, []);

  const handleFiles = async (files) => {
    const totalFiles = images.length + files.length;
    if (totalFiles > maxFiles) {
      toast.error(t('report.uploadMax', { max: maxFiles }));
      return;
    }

    setIsCompressing(true);
    setPreparationProgress({ completed: 0, total: files.length });
    const validFiles = [];

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const lowDataMode = Boolean(connection?.saveData || /(^|-)2g$/.test(String(connection?.effectiveType || '')));
    const options = {
      maxSizeMB: lowDataMode ? 2 : 5,
      maxWidthOrHeight: lowDataMode ? 1280 : 1920,
      useWebWorker: true
    };
    if (lowDataMode) toast(t('report.uploadLowData'));

    for (const [fileIndex, file] of Array.from(files).entries()) {
      // Validate type
      if (!file.type.startsWith('image/')) {
        toast.error(t('report.uploadNotImage', { file: file.name }));
        continue;
      }

      try {
        const quality = await assessImageFile(file);
        if (!quality.acceptable) {
          toast.error(t('report.photoQualityReject', { guidance: quality.guidance.join(', ') || t('report.photoQualityBetter') }));
          continue;
        }
        if (quality.score < 60) toast(t('report.photoQualityWarn', { guidance: quality.guidance.join(', ') || t('report.photoQualityBetter') }));
        const compressedFile = await imageCompression(file, options);
        validFiles.push(compressedFile);
      } catch (error) {
        console.error("Compression error:", error);
        toast.error(t('report.uploadCompressFailed', { file: file.name }));
      } finally {
        setPreparationProgress({ completed: fileIndex + 1, total: files.length });
      }
    }

    setIsCompressing(false);
    setPreparationProgress(null);
    if (validFiles.length > 0) {
      await onChange([...images, ...validFiles]);
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

  const editImage = async (index, options) => {
    const source = images[index];
    if (!(source instanceof Blob)) {
      toast.error(t('report.uploadOnlyNew'));
      return;
    }
    setEditingIndex(index);
    const toastId = toast.loading(options.cropSquare ? t('report.uploadCropping') : t('report.uploadRotating'));
    try {
      const edited = await transformImageFile(source, options);
      const nextImages = images.map((image, imageIndex) => imageIndex === index ? edited : image);
      // The parent also scans new files with AI. Do not keep the image editor
      // locked while that network request is running; the transformed file is
      // already ready to preview/save at this point.
      setEditingIndex(null);
      const update = onChange(nextImages);
      void Promise.resolve(update).catch((error) => {
        console.error('Image update failed after edit:', error);
      });
      toast.success(t('report.uploadUpdated'), { id: toastId });
    } catch (error) {
      const errorKey = {
        [IMAGE_TRANSFORM_ERROR_CODES.FILE_REQUIRED]: 'report.uploadOnlyNew',
        [IMAGE_TRANSFORM_ERROR_CODES.OPEN_FAILED]: 'report.uploadOpenFailed',
        [IMAGE_TRANSFORM_ERROR_CODES.CANVAS_UNAVAILABLE]: 'report.uploadCanvasUnavailable',
        [IMAGE_TRANSFORM_ERROR_CODES.CREATE_FAILED]: 'report.uploadCreateFailed',
      }[error?.code] || 'report.uploadEditFailed';
      toast.error(t(errorKey), { id: toastId });
    } finally {
      setEditingIndex(null);
    }
  };

  const removeImage = (index) => {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
  };

  return (
    <div className="w-full">
      <span className="input-label mb-2 block">{label || t('report.uploadImages')}</span>

      {/* Drag & Drop Area */}
      {images.length < maxFiles && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          role={showOptions ? 'group' : 'button'}
          tabIndex={showOptions ? -1 : 0}
          aria-label={showOptions ? t('report.uploadChooseMethod') : t('report.uploadOpenOptions')}
          onKeyDown={(event) => {
            if (!showOptions && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              setShowOptions(true);
            }
          }}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer min-h-[140px]"
          onClick={(e) => {
            if (showOptions) return;
            setShowOptions(true);
          }}
        >
          {isCompressing ? (
            <div className="flex flex-col items-center">
              <BiLoaderAlt className="text-3xl text-primary-500 mb-2 animate-spin" />
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                {t('report.uploadPreparing')}{preparationProgress ? ` (${preparationProgress.completed}/${preparationProgress.total})` : '…'}
              </p>
            </div>
          ) : showOptions ? (
            <div className="flex flex-col items-center w-full animate-fade-in">
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300 mb-3">
                {t('report.uploadChooseMethod')}
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions(false);
                    document.getElementById('camera-upload-input').click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-primary-500 hover:text-white transition-colors text-sm font-semibold shadow-sm"
                >
                  <FiCamera className="text-lg" aria-hidden="true" /> {t('report.uploadTakePhoto')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions(false);
                    document.getElementById('image-upload-input').click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-primary-500 hover:text-white transition-colors text-sm font-semibold shadow-sm"
                >
                  <FiImage className="text-lg" aria-hidden="true" /> {t('report.uploadGallery')}
                </button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(false);
                }}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1"
              >
                {t('report.cancel')}
              </button>
            </div>
          ) : (
            <>
              <FiUpload className="text-3xl text-surface-400 mb-2" />
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                {t('report.uploadClick')} <span className="text-primary-500 font-semibold">{t('report.uploadMethod')}</span>
              </p>
              <p className="text-xs text-surface-400 mt-1">
                {t('report.uploadTypes', { max: maxFiles })}
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
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, index) => {
            const isFile = img instanceof File || img instanceof Blob;
            const src = previews[index]?.url || (isFile ? '' : img.url || img.secureUrl || img);

            return (
              <div key={`${img.name || img.url || 'image'}-${index}`} className="overflow-hidden rounded-xl border border-surface-200 bg-surface-100 dark:border-surface-700 dark:bg-surface-800">
                <div className="relative aspect-square p-1">
                  <img
                    src={src}
                    alt={t('report.uploadPreviewAlt', { index: index + 1 })}
                    className="h-full w-full object-contain drop-shadow-sm"
                  />
                  {editingIndex === index && <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white" role="status"><BiLoaderAlt className="mr-2 animate-spin" aria-hidden="true" /> {t('report.uploadEditing')}</div>}
                </div>
                <div className="grid grid-cols-3 border-t border-surface-200 dark:border-surface-700">
                  <button type="button" onClick={() => editImage(index, { rotation: 90 })} disabled={editingIndex !== null} className="flex min-h-11 items-center justify-center text-surface-600 hover:bg-white hover:text-primary-700 disabled:opacity-50 dark:text-surface-300 dark:hover:bg-surface-700" aria-label={t('report.uploadRotate', { index: index + 1 })}><FiRotateCw aria-hidden="true" /></button>
                  <button type="button" onClick={() => editImage(index, { cropSquare: true })} disabled={editingIndex !== null} className="flex min-h-11 items-center justify-center border-x border-surface-200 text-surface-600 hover:bg-white hover:text-primary-700 disabled:opacity-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-700" aria-label={t('report.uploadCrop', { index: index + 1 })}><FiCrop aria-hidden="true" /></button>
                  <button type="button" onClick={() => removeImage(index)} disabled={editingIndex !== null} className="flex min-h-11 items-center justify-center text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/30" aria-label={t('report.uploadRemove', { index: index + 1 })}><FiX aria-hidden="true" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
