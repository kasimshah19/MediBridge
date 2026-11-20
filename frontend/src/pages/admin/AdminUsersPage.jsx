import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ban,
  RotateCcw,
  AlertTriangle,
  Eye,
  Building2,
  Pill,
  Package,
} from 'lucide-react';
import adminUsersApi from '../../api/adminUsers.api';
import { formatDateIST, formatDateTimeIST } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // User Drawer
  const [selectedUser, setSelectedUser] = useState(null);

  // Status Action Modal
  const [statusDialog, setStatusDialog] = useState({
    isOpen: false,
    user: null,
    action: null, // 'suspend', 'reactivate', 'block'
    reason: '',
    error: null,
    loading: false,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
      };

      if (activeTab === 'suspended_blocked') {
        // Will filter accountStatus on backend
      } else if (activeTab !== 'all') {
        params.role = activeTab;
      }

      if (activeTab === 'suspended_blocked') {
        params.accountStatus = 'suspended'; // Or fetch both
      }

      const res = await adminUsersApi.getAllUsers(params);
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalUsers(res.data.total || 0);
      setCounts(res.data.counts || {});
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [activeTab, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const openStatusAction = (user, action) => {
    setStatusDialog({
      isOpen: true,
      user,
      action,
      reason: '',
      error: null,
      loading: false,
    });
  };

  const handleStatusSubmit = async () => {
    const { user, action, reason } = statusDialog;
    if (['suspend', 'block'].includes(action) && reason.trim().length < 10) {
      setStatusDialog((prev) => ({
        ...prev,
        error: 'Please provide a detailed reason (at least 10 characters).',
      }));
      return;
    }

    try {
      setStatusDialog((prev) => ({ ...prev, loading: true, error: null }));
      await adminUsersApi.updateUserStatus(user._id, {
        action,
        reason: reason.trim(),
      });

      setStatusDialog({ isOpen: false, user: null, action: null, reason: '', error: null, loading: false });
      loadUsers();
    } catch (err) {
      setStatusDialog((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to update user status.',
      }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600" />
              <span>Platform User Directory</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage accounts, investigate compliance status, and manage security suspensions
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </form>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: `All Users (${totalUsers})` },
            { id: 'donor', label: `Donors (${counts.donors || 0})` },
            { id: 'pharmacist', label: `Pharmacists (${counts.pharmacists || 0})` },
            { id: 'ngo', label: `NGOs (${counts.ngos || 0})` },
            { id: 'suspended_blocked', label: `Suspended (${counts.suspended || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Activity</th>
                <th className="py-3.5 px-4">Joined / Last Login</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u._id === currentAdmin?._id;
                  const isOtherAdmin = u.role === 'admin' && !isSelf;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.accountStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.accountStatus === 'suspended'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.accountStatus}
                        </span>
                      </td>

                      {/* Role Activity */}
                      <td className="py-3.5 px-4 text-xs">
                        {u.role === 'donor' && (
                          <span className="text-slate-600 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            {u.donationsCount || 0} donations
                          </span>
                        )}
                        {u.role === 'pharmacist' && (
                          <span className="text-slate-600 flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5 text-slate-400" />
                            {u.decisionsCount || 0} decisions
                          </span>
                        )}
                        {u.role === 'ngo' && (
                          <span className="text-slate-600 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {u.organizationName || 'Affiliated Clinic'}
                          </span>
                        )}
                        {u.role === 'admin' && <span className="text-slate-400">System Admin</span>}
                      </td>

                      {/* Joined / Last Login */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div>{formatDateIST(u.createdAt)}</div>
                        <div className="text-[11px] text-slate-400">
                          Login: {u.lastLoginAt ? formatDateIST(u.lastLoginAt) : 'Never'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="View Profile Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Security Actions (Forbidden on Self or Other Admins) */}
                          {!isSelf && !isOtherAdmin && (
                            <>
                              {u.accountStatus === 'active' ? (
                                <button
                                  onClick={() => openStatusAction(u, 'suspend')}
                                  className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => openStatusAction(u, 'reactivate')}
                                  className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                                >
                                  Reactivate
                                </button>
                              )}

                              {u.accountStatus !== 'blocked' && (
                                <button
                                  onClick={() => openStatusAction(u, 'block')}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Permanently Block"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="User Account Details"
      >
        {selectedUser && (
          <div className="space-y-5 text-sm">
            <div>
              <span className="text-xs text-slate-400">Full Name</span>
              <div className="font-bold text-slate-900 text-base">{selectedUser.name}</div>
            </div>

            <div>
              <span className="text-xs text-slate-400">Email Address</span>
              <div className="text-slate-700 font-mono text-xs">{selectedUser.email}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400">Role</span>
                <div className="font-semibold capitalize text-slate-800">{selectedUser.role}</div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Account Status</span>
                <div>
                  <span className="capitalize font-semibold text-slate-800">
                    {selectedUser.accountStatus}
                  </span>
                </div>
              </div>
            </div>

            {selectedUser.statusReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold block mb-1">Status Reason:</span>
                {selectedUser.statusReason}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-500">
              <div>Joined: {formatDateTimeIST(selectedUser.createdAt)}</div>
              <div>Last Active: {selectedUser.lastLoginAt ? formatDateTimeIST(selectedUser.lastLoginAt) : 'Never'}</div>
              <div>User ID: <span className="font-mono text-[10px]">{selectedUser._id}</span></div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Status Confirmation Modal */}
      {statusDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2 capitalize">
              {statusDialog.action} Account Access
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to <strong>{statusDialog.action}</strong> account access for{' '}
              <strong>{statusDialog.user?.name}</strong>?
              {statusDialog.action === 'suspend' &&
                ' This will immediately invalidate their active session and prevent login until reactivated.'}
              {statusDialog.action === 'block' &&
                ' This will revoke all sessions and automatically release any active verification claims.'}
            </p>

            {['suspend', 'block'].includes(statusDialog.action) && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Action (Required, min 10 characters):
                </label>
                <textarea
                  rows={3}
                  value={statusDialog.reason}
                  onChange={(e) =>
                    setStatusDialog((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Explain why this action is being taken for compliance logging..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>
            )}

            {statusDialog.error && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mb-4">
                {statusDialog.error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setStatusDialog({ isOpen: false, user: null, action: null, reason: '', error: null, loading: false })
                }
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusSubmit}
                disabled={statusDialog.loading}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition ${
                  statusDialog.action === 'block'
                    ? 'bg-red-600 hover:bg-red-700'
                    : statusDialog.action === 'suspend'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusDialog.loading ? 'Updating...' : `Confirm ${statusDialog.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
