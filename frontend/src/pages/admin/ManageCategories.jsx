import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Edit2, Plus, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createNewCategory, deleteCategoryById, fetchCategories, updateCategoryDetails } from '../../redux/slices/categorySlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';

const ManageCategories = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { categories, isLoading, error } = useSelector((state) => state.categories);
  const [categoryModal, setCategoryModal] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);

  const openCreate = () => { setCategoryModal('create'); setName(''); setIcon('📦'); setDescription(''); };
  const openEdit = (category) => { setCategoryModal(category); setName(category.name); setIcon(category.icon || '📦'); setDescription(category.description || ''); };
  const closeModal = () => { setCategoryModal(null); setName(''); setIcon('📦'); setDescription(''); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return toast.error(t('categories.nameRequired'));
    setIsSubmitting(true);
    try {
      if (categoryModal === 'create') {
        await dispatch(createNewCategory({ name: cleanName, icon, description })).unwrap();
        toast.success(t('categories.createdSuccess', { name: cleanName }));
      } else {
        await dispatch(updateCategoryDetails({ id: categoryModal._id, categoryData: { name: cleanName, icon, description } })).unwrap();
        toast.success(t('categories.updatedSuccess', { name: cleanName }));
      }
      closeModal();
      dispatch(fetchCategories());
    } catch (err) {
      toast.error(err || t('categories.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;
    try {
      const result = await dispatch(deleteCategoryById(deleteId)).unwrap();
      toast.success(result.category?.isActive === false ? t('categories.deactivatedSuccess') : t('categories.deletedSuccess'));
      dispatch(fetchCategories());
    } catch (err) {
      toast.error(err || t('categories.deleteError'));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white"><Tag aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />{t('categories.adminTitle')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('categories.adminSubtitle')}</p>
        </div>
        <Button variant="primary" onClick={openCreate} className="flex items-center gap-2 self-start sm:self-auto"><Plus aria-hidden="true" className="h-4 w-4" />{t('categories.add')}</Button>
      </header>

      {isLoading && categories.length === 0 ? <Loader /> : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{t('categories.loadError', { error })}</div>
      ) : categories.length === 0 ? (
        <EmptyState title={t('categories.emptyTitle')} message={t('categories.emptyMessage')} action={{ label: t('categories.create'), onClick: openCreate }} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <article key={category._id} className="card flex flex-col justify-between border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-3"><span aria-hidden="true" className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-3xl dark:border-slate-800 dark:bg-slate-800/80">{category.icon}</span><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">{category.name}</h2><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800">{t('categories.items', { count: category.itemCount || 0 })}</span></div></div>
                <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{category.description || t('categories.noDescription')}</p>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => openEdit(category)}><Edit2 aria-hidden="true" className="h-3.5 w-3.5" />{t('categories.edit')}</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteId(category._id)}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" />{t('categories.remove')}</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {categoryModal && <Modal isOpen onClose={closeModal} title={categoryModal === 'create' ? t('categories.createTitle') : t('categories.editTitle')} size="md">
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-4 gap-4"><div><Input label={t('categories.iconLabel')} placeholder="📦" value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={4} required /></div><div className="col-span-3"><Input label={t('categories.nameLabel')} placeholder={t('categories.namePlaceholder')} value={name} onChange={(event) => setName(event.target.value)} required /></div></div>
          <Textarea label={t('categories.descriptionLabel')} placeholder={t('categories.descriptionPlaceholder')} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>{t('common.cancel')}</Button><Button variant="primary" type="submit" loading={isSubmitting}>{categoryModal === 'create' ? t('categories.create') : t('categories.saveChanges')}</Button></div>
        </form>
      </Modal>}

      {deleteId && <ConfirmDialog isOpen onClose={() => setDeleteId(null)} onConfirm={handleDeleteCategory} title={t('categories.confirmTitle')} message={t('categories.confirmMessage')} confirmText={t('categories.confirmAction')} variant="danger" />}
    </div>
  );
};

export default ManageCategories;
