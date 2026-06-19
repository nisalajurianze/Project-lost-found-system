import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import Textarea from './Textarea';
import ImageUpload from './ImageUpload';
import { submitNewClaim } from '../../redux/slices/claimSlice';

const ClaimModal = ({ isOpen, onClose, targetItemId, itemType, itemName }) => {
  const dispatch = useDispatch();
  const [proofDescription, setProofDescription] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!proofDescription.trim()) {
      toast.error('Please provide a proof description.');
      return;
    }

    const formData = new FormData();
    formData.append('proofDescription', proofDescription);

    if (itemType === 'FoundItem') {
      formData.append('foundItemId', targetItemId);
    } else if (itemType === 'LostItem') {
      formData.append('lostItemId', targetItemId);
    }

    images.forEach(image => {
      formData.append('proofImages', image.file);
    });

    try {
      setIsSubmitting(true);
      await dispatch(submitNewClaim(formData)).unwrap();
      toast.success('Claim submitted successfully. Pending review.');
      setProofDescription('');
      setImages([]);
      onClose(true); // pass true to indicate success
    } catch (err) {
      toast.error(err || 'Failed to submit claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={`Claim "${itemName}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          To claim this item, please provide proof of ownership (or proof that you found it). 
          Your claim will be reviewed by the person who posted the item. Contact details will be shared upon approval.
        </p>

        <Textarea
          label="Proof Description *"
          placeholder="Describe unique features, when/where you lost it, or any details only the owner would know..."
          value={proofDescription}
          onChange={(e) => setProofDescription(e.target.value)}
          rows={4}
          required
        />

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Proof Images (Optional)
          </label>
          <ImageUpload
            images={images}
            setImages={setImages}
            maxImages={3}
            helpText="Upload up to 3 images (e.g., old photos of the item, receipts, or proof you have it)."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-surface-200 dark:border-surface-700">
          <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
            Submit Claim
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClaimModal;
