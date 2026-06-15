// ============================================
// My Lost Reports Page Component
// Table listing of student lost reports with edit/delete actions
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLostItems, deleteLostReport, clearLostItemsList } from '../../redux/slices/lostItemSlice';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiPlusCircle } from 'react-icons/fi';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

export const MyLostItems = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, pagination, isLoading } = useSelector((state) => state.lostItems);

  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchLostItems({ userId: user._id, page, limit: 10, status: 'all' }));
    }
  }, [dispatch, user, page]);

  useEffect(() => {
    return () => {
      dispatch(clearLostItemsList());
    };
  }, [dispatch]);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteLostReport(deleteId)).unwrap();
      toast.success('Lost report deleted successfully.');
      setDeleteDialogOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to delete report.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && items.length === 0) return <Loader fullPage />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
            My Lost Reports
          </h1>
          <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
            Manage your reported lost property reports
          </p>
        </div>
        <Link to="/dashboard/report-lost" className="btn btn-primary btn-sm rounded-lg flex items-center gap-1.5 font-bold shadow-md">
          <FiPlusCircle /> Report New
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No lost reports found"
          description="You have not reported any lost property yet. Create a report to start scanning matches."
        />
      ) : (
        <>
          <div className="table-container bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700/60 shadow-sm rounded-2xl overflow-hidden">
            <table className="table-base w-full text-sm text-left">
              <thead className="table-head bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date Lost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="table-row border-t border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-surface-900 dark:text-white">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 text-surface-600 dark:text-surface-300">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 text-surface-500 dark:text-surface-400">
                      {new Date(item.lostDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2.5">
                      <Link
                        to={`/lost-items/${item._id}`}
                        className="p-1.5 text-surface-500 hover:text-primary-500 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-750 transition-all"
                        title="View Details"
                      >
                        <FiEye />
                      </Link>
                      <Link
                        to={`/dashboard/edit-lost/${item._id}`}
                        className="p-1.5 text-surface-500 hover:text-indigo-500 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-750 transition-all"
                        title="Edit Report"
                      >
                        <FiEdit2 />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(item._id)}
                        className="p-1.5 text-surface-500 hover:text-red-500 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-750 transition-all"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        message="Are you sure you want to delete this lost report? This will remove all associated matches."
        isLoading={isDeleting}
      />

    </div>
  );
};

export default MyLostItems;

