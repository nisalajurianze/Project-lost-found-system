import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Mail, Phone, Search, Shield, ShieldOff, Trash2, User, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteUserAccount, fetchUsersList, toggleUserActivation, updateUserRole } from '../../redux/slices/adminSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getInitials, optimizeImageUrl } from '../../utils/helpers';
import { useLanguage } from '../../i18n/LanguageContext';

const ManageUsers = () => {
  const dispatch = useDispatch();
  const { t, language } = useLanguage();
  const { users, usersPagination, isLoading, error } = useSelector((state) => state.admin);
  const currentUser = useSelector((state) => state.auth.user);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [toggleUser, setToggleUser] = useState(null);
  const [roleToggleUser, setRoleToggleUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';

  useEffect(() => {
    dispatch(fetchUsersList({ search, role, page, limit: 10 }));
  }, [dispatch, search, role, page]);

  const localizeError = (errorValue, fallbackKey) => {
    const message = String(errorValue || '');
    if (/last active administrator/i.test(message)) return t('users.lastAdminError');
    return message || t(fallbackKey);
  };

  const handleToggleStatus = async () => {
    if (!toggleUser) return;
    const nextActive = !toggleUser.isActive;
    try {
      await dispatch(toggleUserActivation({ id: toggleUser.id, isActive: nextActive })).unwrap();
      toast.success(t('users.statusSuccess', {
        name: toggleUser.name,
        status: nextActive ? t('users.statusActive') : t('users.statusInactive'),
      }));
    } catch (err) {
      toast.error(localizeError(err, 'users.statusError'));
    } finally {
      setToggleUser(null);
    }
  };

  const handleRoleToggle = async () => {
    if (!roleToggleUser) return;
    const nextRole = roleToggleUser.currentRole === 'admin' ? 'user' : 'admin';
    try {
      await dispatch(updateUserRole({ id: roleToggleUser.id, role: nextRole })).unwrap();
      toast.success(t('users.roleSuccess', {
        name: roleToggleUser.name,
        role: nextRole === 'admin' ? t('users.roleAdmin') : t('users.roleUser'),
      }));
    } catch (err) {
      toast.error(localizeError(err, 'users.roleError'));
    } finally {
      setRoleToggleUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      await dispatch(deleteUserAccount(deleteUser.id)).unwrap();
      toast.success(t('users.anonymizeSuccess', { name: deleteUser.name }));
    } catch (err) {
      toast.error(localizeError(err, 'users.anonymizeError'));
    } finally {
      setDeleteUser(null);
    }
  };

  const roleOptions = [
    { value: 'user', label: t('users.roleUser') },
    { value: 'admin', label: t('users.roleAdmin') },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <User aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          {t('users.adminTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.adminSubtitle')}</p>
      </header>

      <section className="card border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col items-end gap-4 md:flex-row">
          <div className="w-full flex-1">
            <Input
              icon={<Search aria-hidden="true" className="h-5 w-5 text-slate-400" />}
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <div className="w-full md:w-56">
            <Select
              label={t('users.filterRole')}
              value={role}
              onChange={(event) => { setRole(event.target.value); setPage(1); }}
              options={roleOptions}
              placeholder={t('users.allRoles')}
            />
          </div>
        </div>
      </section>

      {isLoading ? <Loader /> : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {t('users.loadError', { error })}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title={t('users.emptyTitle')} message={t('users.emptyMessage')} />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
            <table className="w-full whitespace-nowrap text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-4 py-3">{t('users.columnUser')}</th>
                  <th scope="col" className="px-4 py-3">{t('users.columnId')}</th>
                  <th scope="col" className="px-4 py-3">{t('users.columnContact')}</th>
                  <th scope="col" className="px-4 py-3">{t('users.columnRole')}</th>
                  <th scope="col" className="px-4 py-3">{t('users.columnStatus')}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t('users.columnActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {users.map((user) => {
                  const isSelf = currentUser?._id === user._id;
                  const actionTitle = isSelf ? t('users.selfActionDisabled') : undefined;
                  return (
                    <tr key={user._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-indigo-200 bg-indigo-100 font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {user.profileImage?.url ? <img src={optimizeImageUrl(user.profileImage.url, 150)} alt={user.fullName} className="h-full w-full object-cover" /> : getInitials(user.fullName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {user.fullName} {isSelf && <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">{t('users.you')}</span>}
                            </p>
                            <p className="text-xs text-slate-400">{t('users.joined', { date: new Date(user.createdAt).toLocaleDateString(locale) })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700 dark:text-slate-300">{user.studentId || '—'}</td>
                      <td className="space-y-1 px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs"><Mail aria-hidden="true" className="h-3.5 w-3.5" />{user.email}</div>
                        <div className="flex items-center gap-1.5 text-xs"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{user.phone || t('users.noPhone')}</div>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">{user.role === 'admin' ? t('users.roleAdmin') : t('users.roleUser')}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />{user.isActive ? t('users.statusActive') : t('users.statusInactive')}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant={user.isActive ? 'danger' : 'success'} size="sm" disabled={isSelf} title={actionTitle || (user.isActive ? t('users.suspend') : t('users.activate'))} onClick={() => setToggleUser({ id: user._id, isActive: user.isActive, name: user.fullName })}>
                            {user.isActive ? <UserX aria-hidden="true" className="h-4 w-4" /> : <UserCheck aria-hidden="true" className="h-4 w-4" />}<span className="hidden xl:inline">{user.isActive ? t('users.suspend') : t('users.activate')}</span>
                          </Button>
                          <Button variant="secondary" size="sm" disabled={isSelf} title={actionTitle || (user.role === 'admin' ? t('users.demoteAdmin') : t('users.makeAdmin'))} onClick={() => setRoleToggleUser({ id: user._id, name: user.fullName, currentRole: user.role })}>
                            {user.role === 'admin' ? <ShieldOff aria-hidden="true" className="h-4 w-4 text-amber-600" /> : <Shield aria-hidden="true" className="h-4 w-4 text-indigo-600" />}<span className="hidden xl:inline">{user.role === 'admin' ? t('users.demoteAdmin') : t('users.makeAdmin')}</span>
                          </Button>
                          <Button variant="danger" size="sm" disabled={isSelf} title={actionTitle || t('users.anonymize')} onClick={() => setDeleteUser({ id: user._id, name: user.fullName })}>
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {usersPagination.totalPages > 1 && <Pagination page={page} totalPages={usersPagination.totalPages} onPageChange={setPage} />}
        </div>
      )}

      {toggleUser && <ConfirmDialog isOpen onClose={() => setToggleUser(null)} onConfirm={handleToggleStatus} title={toggleUser.isActive ? t('users.suspendTitle') : t('users.activateTitle')} message={t(toggleUser.isActive ? 'users.suspendMessage' : 'users.activateMessage', { name: toggleUser.name })} confirmText={toggleUser.isActive ? t('users.suspend') : t('users.activate')} variant={toggleUser.isActive ? 'danger' : 'success'} />}
      {roleToggleUser && <ConfirmDialog isOpen onClose={() => setRoleToggleUser(null)} onConfirm={handleRoleToggle} title={roleToggleUser.currentRole === 'admin' ? t('users.demoteTitle') : t('users.promoteTitle')} message={t(roleToggleUser.currentRole === 'admin' ? 'users.demoteMessage' : 'users.promoteMessage', { name: roleToggleUser.name })} confirmText={roleToggleUser.currentRole === 'admin' ? t('users.demoteAdmin') : t('users.makeAdmin')} variant={roleToggleUser.currentRole === 'admin' ? 'danger' : 'primary'} />}
      {deleteUser && <ConfirmDialog isOpen onClose={() => setDeleteUser(null)} onConfirm={handleDeleteUser} title={t('users.anonymizeTitle')} message={t('users.anonymizeMessage', { name: deleteUser.name })} confirmText={t('users.anonymize')} variant="danger" />}
    </div>
  );
};

export default ManageUsers;
