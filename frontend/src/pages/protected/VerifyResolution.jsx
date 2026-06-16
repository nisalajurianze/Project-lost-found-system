import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import foundItemService from '../../services/foundItemService';
import lostItemService from '../../services/lostItemService';
import { fetchLostItemById } from '../../redux/slices/lostItemSlice';
import { fetchFoundItemById } from '../../redux/slices/foundItemSlice';

const VerifyResolution = () => {
  const { type, id } = useParams(); // type is 'found' or 'lost'
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        if (type === 'found') {
          const res = await dispatch(fetchFoundItemById(id)).unwrap();
          setItem(res);
        } else if (type === 'lost') {
          const res = await dispatch(fetchLostItemById(id)).unwrap();
          setItem(res);
        } else {
          toast.error('Invalid item type');
          navigate('/dashboard');
        }
      } catch (error) {
        toast.error('Item not found or you are not authorized.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [type, id, dispatch, navigate]);

  const handleResolve = async () => {
    setIsProcessing(true);
    try {
      if (type === 'found') {
        await foundItemService.resolveFoundItem(id);
      } else {
        await lostItemService.resolveLostItem(id);
      }
      toast.success('Thank you! The item has been marked as resolved.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resolve item');
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      if (type === 'found') {
        await foundItemService.cancelConnection(id);
      } else {
        await lostItemService.cancelConnection(id);
      }
      toast.success('Connection cancelled. The item is available again.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel connection');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <FiLoader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!item) return null;

  if (item.status === 'claimed') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-surface-800 rounded-3xl p-8 shadow-xl border border-surface-200 dark:border-surface-700">
          <FiCheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Already Resolved</h2>
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            This item has already been marked as resolved. Thank you!
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (item.status !== 'in_progress') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-surface-800 rounded-3xl p-8 shadow-xl border border-surface-200 dark:border-surface-700">
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Invalid State</h2>
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            This item is not currently waiting for resolution verification.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-surface-800 rounded-3xl p-8 sm:p-12 shadow-xl border border-surface-200 dark:border-surface-700 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500 mb-6">
          <FiCheckCircle className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-black font-display tracking-tight text-surface-900 dark:text-white mb-4">
          Verify Resolution
        </h1>
        
        <p className="text-lg text-surface-600 dark:text-surface-300 mb-8">
          You recently connected regarding the {type} item <strong className="text-primary-600 dark:text-primary-400">"{item.itemName}"</strong>. 
          Did you successfully exchange this item?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleResolve}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 transition-all focus:outline-none focus:ring-4 focus:ring-green-500/20"
          >
            <FiCheckCircle className="w-8 h-8" />
            <span className="font-bold">Yes, it was resolved</span>
          </button>
          
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 transition-all focus:outline-none focus:ring-4 focus:ring-red-500/20"
          >
            <FiXCircle className="w-8 h-8" />
            <span className="font-bold">No, we didn't exchange it</span>
          </button>
        </div>
        
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-8">
          If you select "No", the connection will be cancelled and the item will be available for others to claim.
        </p>
      </div>
    </div>
  );
};

export default VerifyResolution;
