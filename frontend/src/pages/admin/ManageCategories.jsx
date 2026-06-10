import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tag, Plus, Edit2, Trash2, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchCategories, 
  createNewCategory, 
  updateCategoryDetails, 
  deleteCategoryById 
} from '../../redux/slices/categorySlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const ManageCategories = () => {
  const dispatch = useDispatch();
  const { categories, isLoading, error } = useSelector((state) => state.categories);

  // Modal / Form States
  const [categoryModal, setCategoryModal] = useState(null); // 'create' | { editData }
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleOpenCreate = () => {
    setCategoryModal('create');
    setName('');
    setIcon('📦');
    setDescription('');
  };

  const handleOpenEdit = (cat) => {
    setCategoryModal(cat);
    setName(cat.name);
    setIcon(cat.icon || '📦');
    setDescription(cat.description || '');
  };

  const handleCloseModal = () => {
    setCategoryModal(null);
    setName('');
    setIcon('📦');
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (categoryModal === 'create') {
        await dispatch(createNewCategory({ name, icon, description })).unwrap();
        toast.success(`Category "${name}" created successfully.`);
      } else {
        await dispatch(updateCategoryDetails({ 
          id: categoryModal._id, 
          categoryData: { name, icon, description } 
        })).unwrap();
        toast.success(`Category "${name}" updated successfully.`);
      }
      handleCloseModal();
      dispatch(fetchCategories()); // Reload categories list
    } catch (err) {
      toast.error(err || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteCategoryById(deleteId)).unwrap();
      toast.success('Category successfully deleted/deactivated.');
      dispatch(fetchCategories()); // Reload list
    } catch (err) {
      toast.error(err || 'Failed to delete category.');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            Manage Categories
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define item groups for reports. Adding emojis makes reporting intuitive for users.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {isLoading && categories.length === 0 ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to fetch categories: {error}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState 
          title="No Categories Available" 
          message="Click 'Add Category' to define the first item group." 
          action={{ label: 'Create Category', onClick: handleOpenCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div 
              key={cat._id} 
              className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {cat.icon}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                        {cat.itemCount || 0} items
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                  {cat.description || 'No description provided for this category.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-850 pt-4 mt-5">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleOpenEdit(cat)}
                  className="flex items-center gap-1.5 text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => setDeleteId(cat._id)}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {categoryModal && (
        <Modal
          isOpen={!!categoryModal}
          onClose={handleCloseModal}
          title={categoryModal === 'create' ? 'Create New Category' : 'Edit Category Details'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <Input 
                  label="Emoji Icon"
                  placeholder="📦"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={4}
                  required
                />
              </div>
              <div className="col-span-3">
                <Input 
                  label="Category Name"
                  placeholder="e.g. Mobile Phones, Calculators"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <Textarea 
              label="Description"
              placeholder="Provide a brief description of what types of items belong in this category."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
              <Button 
                variant="secondary" 
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                type="submit"
                loading={isSubmitting}
              >
                {categoryModal === 'create' ? 'Create Category' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <ConfirmDialog 
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteCategory}
          title="Delete Category?"
          message="Are you sure you want to delete this category? If there are any items currently assigned to it, the category will be deactivated rather than deleted to preserve database associations."
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
};

export default ManageCategories;
