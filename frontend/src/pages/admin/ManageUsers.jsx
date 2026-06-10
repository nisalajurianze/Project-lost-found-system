import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Trash2, 
  Mail, 
  Phone, 
  User, 
  SlidersHorizontal 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchUsersList, toggleUserActivation } from '../../redux/slices/adminSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getInitials } from '../../utils/helpers';

const ManageUsers = () => {
  const dispatch = useDispatch();
  const { users, usersPagination, isLoading, error } = useSelector((state) => state.admin);
  const currentUser = useSelector((state) => state.auth.user);

  // Filters & State
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [toggleUser, setToggleUser] = useState(null); // { id, isActive, name } for confirm modal

  useEffect(() => {
    dispatch(fetchUsersList({ search, role, page, limit: 10 }));
  }, [dispatch, search, role, page]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset page to 1
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setPage(1); // Reset page to 1
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleToggleStatus = async () => {
    if (!toggleUser) return;
    try {
      const result = await dispatch(toggleUserActivation({ 
        id: toggleUser.id, 
        isActive: !toggleUser.isActive 
      })).unwrap();
      
      toast.success(`User "${toggleUser.name}" account ${!toggleUser.isActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(err || 'Failed to update user status.');
    } finally {
      setToggleUser(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          Manage Users
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View all registered students and staff members. Activate or deactivate access permissions.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input 
              icon={<Search className="h-5 w-5 text-slate-400" />}
              placeholder="Search by name, email, student/staff ID..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-full md:w-48">
            <Select 
              label="Filter by Role"
              value={role}
              onChange={handleRoleChange}
              options={[
                { value: 'user', label: 'Student/Staff (User)' },
                { value: 'admin', label: 'Administrator' }
              ]}
              placeholder="All Roles"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to fetch users: {error}
        </div>
      ) : users.length === 0 ? (
        <EmptyState 
          title="No Users Found" 
          message="We couldn't find any users matching your query parameters." 
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 dark:backdrop-blur-md">
            <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4">User</th>
                  <th scope="col" className="px-6 py-4">ID Number</th>
                  <th scope="col" className="px-6 py-4">Contact Info</th>
                  <th scope="col" className="px-6 py-4">Role</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {users.map((user) => {
                  const isSelf = currentUser?._id === user._id;
                  return (
                    <tr 
                      key={user._id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Name / Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-800 overflow-hidden">
                            {user.profileImage?.url ? (
                              <img src={user.profileImage.url} alt={user.fullName} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(user.fullName)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {user.fullName} {isSelf && <span className="ml-1 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">You</span>}
                            </p>
                            <p className="text-xs text-slate-400">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>

                      {/* ID Number */}
                      <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {user.studentId}
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{user.phone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' 
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant={user.isActive ? 'danger' : 'success'}
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setToggleUser({ 
                              id: user._id, 
                              isActive: user.isActive, 
                              name: user.fullName 
                            })}
                          >
                            {user.isActive ? (
                              <span className="flex items-center gap-1"><UserX className="h-4 w-4" /> Suspend</span>
                            ) : (
                              <span className="flex items-center gap-1"><UserCheck className="h-4 w-4" /> Activate</span>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {usersPagination.totalPages > 1 && (
            <Pagination 
              page={page} 
              totalPages={usersPagination.totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
        </div>
      )}

      {/* Confirm Deactivation/Activation Modal */}
      {toggleUser && (
        <ConfirmDialog 
          isOpen={!!toggleUser}
          onClose={() => setToggleUser(null)}
          onConfirm={handleToggleStatus}
          title={toggleUser.isActive ? 'Suspend User Account?' : 'Activate User Account?'}
          message={`Are you sure you want to ${toggleUser.isActive ? 'suspend' : 'activate'} the account of "${toggleUser.name}"? ${
            toggleUser.isActive ? 'Suspended users will lose access to the system immediately.' : 'Active users will be able to log in and report items.'
          }`}
          confirmText={toggleUser.isActive ? 'Suspend' : 'Activate'}
          variant={toggleUser.isActive ? 'danger' : 'success'}
        />
      )}
    </div>
  );
};

export default ManageUsers;

