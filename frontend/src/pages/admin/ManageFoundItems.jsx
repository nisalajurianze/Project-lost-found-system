import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle, Trash2, Calendar, MapPin, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchFoundItems, deleteFoundReport } from '../../redux/slices/foundItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import SearchFilter from '../../components/common/SearchFilter';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import { formatAbsoluteDate as formatDate } from '../../utils/formatDate';
import { getInitials } from '../../utils/helpers';

const ManageFoundItems = () => {
  const dispatch = useDispatch();
  const { items, pagination, isLoading, error } = useSelector((state) => state.foundItems);
  const { categories } = useSelector((state) => state.categories);

  // States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchFoundItems({ 
      search, 
      category, 
      status, 
      sort, 
      page, 
      limit: 10 
    }));
  }, [dispatch, search, category, status, sort, page]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilter = (filters) => {
    if (filters.category !== undefined) setCategory(filters.category);
    if (filters.status !== undefined) setStatus(filters.status);
    if (filters.sort !== undefined) setSort(filters.sort);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleDeleteItem = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteFoundReport(deleteId)).unwrap();
      toast.success('Found report successfully deleted.');
    } catch (err) {
      toast.error(err || 'Failed to delete report.');
    } finally {
      setDeleteId(null);
    }
  };

  // Convert categories list to select format
  const categoryOptions = categories.map(cat => ({
    value: cat.name,
    label: cat.name
  }));

  const foundStatusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'matched', label: 'Matched' },
    { value: 'claimed', label: 'Claimed' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          Manage Found Items
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Moderate, review, or delete found item listings posted by users.
        </p>
      </div>

      {/* Filter Bar */}
      <SearchFilter 
        onSearch={handleSearch}
        onFilter={handleFilter}
        categories={categoryOptions}
        statuses={foundStatusOptions}
        placeholder="Search by title, description, or location..."
      />

      {/* Items list */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to fetch found listings: {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState 
          title="No Found Items Listed" 
          message="No found listings match your search criteria." 
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div 
                key={item._id} 
                className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row gap-5 hover:shadow-md transition-shadow group"
              >
                {/* Thumbnail */}
                <div className="h-32 w-full md:w-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  {item.images?.[0]?.url ? (
                    <img src={item.images[0].url} alt={item.itemName} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <CheckCircle className="h-10 w-10 text-slate-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                          {item.itemName}
                        </h3>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                          {item.category}
                        </span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{item.foundLocation}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span>{formatDate(item.foundDate)}</span>
                      </div>
                    </div>

                    {item.storedAt && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                        <Package className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-medium truncate">Stored at: {item.storedAt}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer / User / Action */}
                  <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                        {getInitials(item.userId?.fullName)}
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                        {item.userId?.fullName || 'Deleted User'}
                      </span>
                    </div>

                    <Button 
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteId(item._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination 
              page={page} 
              totalPages={pagination.totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <ConfirmDialog 
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteItem}
          title="Delete Found Listing?"
          message="Are you sure you want to permanently delete this found item listing? This action is irreversible and will delete any associated match listings."
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
};

export default ManageFoundItems;

