import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Shield,
  Activity,
  Lock,
  Phone,
  Mail,
  MapPin,
  FileBadge,
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { updateMe, changePassword, getMyAuditLogs } from '../../api/user.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().optional(),
  address: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  pharmacyName: z.string().trim().optional(),
  registrationState: z.string().trim().optional(),
  organizationName: z.string().trim().optional(),
  designation: z.string().trim().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'security' | 'activity'
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      city: user?.city || '',
      state: user?.state || '',
      address: user?.address || '',
      licenseNumber: user?.pharmacistProfile?.licenseNumber || '',
      pharmacyName: user?.pharmacistProfile?.pharmacyName || '',
      registrationState: user?.pharmacistProfile?.registrationState || '',
      organizationName: user?.ngoContact?.organizationName || '',
      designation: user?.ngoContact?.designation || '',
    },
  });

  // Keep form in sync when user loads
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || '',
        state: user.state || '',
        address: user.address || '',
        licenseNumber: user.pharmacistProfile?.licenseNumber || '',
        pharmacyName: user.pharmacistProfile?.pharmacyName || '',
        registrationState: user.pharmacistProfile?.registrationState || '',
        organizationName: user.ngoContact?.organizationName || '',
        designation: user.ngoContact?.designation || '',
      });
    }
  }, [user, resetProfile]);

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: pwdErrors },
    reset: resetPassword,
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Fetch real audit logs when Activity tab selected
  useEffect(() => {
    if (activeTab === 'activity') {
      setLogsLoading(true);
      getMyAuditLogs()
        .then((res) => {
          setLogs(res.data?.logs || []);
        })
        .catch(() => {
          toast.error('Unable to load activity history');
        })
        .finally(() => {
          setLogsLoading(false);
        });
    }
  }, [activeTab]);

  const onSaveProfile = async (values) => {
    setSaveLoading(true);
    try {
      const payload = {
        name: values.name,
        phone: values.phone,
        city: values.city,
        state: values.state,
        address: values.address,
      };

      if (user?.role === 'pharmacist') {
        payload.pharmacistProfile = {
          licenseNumber: values.licenseNumber,
          pharmacyName: values.pharmacyName,
          registrationState: values.registrationState,
        };
      }

      if (user?.role === 'ngo') {
        payload.ngoContact = {
          organizationName: values.organizationName,
          designation: values.designation,
        };
      }

      await updateMe(payload);
      await refreshUser();
      toast.success('Profile details updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  const onChangePassword = async (values) => {
    setPwdLoading(true);
    try {
      await changePassword(values);
      toast.success('Password updated successfully');
      resetPassword();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <LogIn size={14} className="text-emerald-600" />;
      case 'LOGIN_FAILED':
        return <Shield size={14} className="text-rose-600" />;
      case 'LOGOUT':
        return <LogOut size={14} className="text-slate-500" />;
      case 'PASSWORD_CHANGED':
      case 'PASSWORD_RESET_DONE':
        return <KeyRound size={14} className="text-sky-600" />;
      case 'PROFILE_UPDATED':
        return <UserCheck size={14} className="text-teal-600" />;
      default:
        return <Activity size={14} className="text-primary-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* User Identity Header Card */}
      <Card className="p-6 bg-white/90 backdrop-blur-md shadow-soft border-teal-900/10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Gradient Initial Circle Avatar */}
          <div className="w-20 h-20 rounded-3xl gradient-primary text-white text-3xl font-extrabold flex items-center justify-center shadow-soft flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-heading font-extrabold text-text-heading">
                {user?.name}
              </h2>
              <Badge color="info" className="capitalize">
                {user?.role}
              </Badge>
              <Badge
                color={
                  user?.accountStatus === 'active'
                    ? 'success'
                    : user?.accountStatus === 'suspended'
                    ? 'warning'
                    : 'danger'
                }
                className="capitalize"
              >
                {user?.accountStatus}
              </Badge>
              {user?.approvalStatus && user?.approvalStatus !== 'not_required' && (
                <Badge
                  color={user?.approvalStatus === 'approved' ? 'success' : 'warning'}
                  className="capitalize"
                >
                  Verification: {user?.approvalStatus}
                </Badge>
              )}
            </div>

            <p className="text-xs text-text-muted flex items-center justify-center sm:justify-start gap-1.5">
              <Mail size={13} />
              <span>{user?.email}</span>
              <span className="text-slate-300">•</span>
              <Phone size={13} />
              <span>{user?.phone || 'No phone recorded'}</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'details'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/70 shadow-soft'
                : 'text-text-muted hover:text-text-heading hover:bg-slate-50'
            }`}
          >
            <User size={15} />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/70 shadow-soft'
                : 'text-text-muted hover:text-text-heading hover:bg-slate-50'
            }`}
          >
            <Lock size={15} />
            <span>Security & Password</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'activity'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/70 shadow-soft'
                : 'text-text-muted hover:text-text-heading hover:bg-slate-50'
            }`}
          >
            <Activity size={15} />
            <span>Audit & Login Activity</span>
          </button>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* TAB 1: PROFILE DETAILS                                          */}
      {/* ============================================================== */}
      {activeTab === 'details' && (
        <Card className="p-6 bg-white/90 shadow-soft">
          <h3 className="text-base font-heading font-bold text-text-heading mb-4">
            Personal Information
          </h3>

          <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  {...registerProfile('name')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
                {profileErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{profileErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                  Email (Immutable)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  {...registerProfile('phone')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
                {profileErrors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1">{profileErrors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  {...registerProfile('city')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
                {profileErrors.city && (
                  <p className="text-[11px] text-rose-600 mt-1">{profileErrors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  {...registerProfile('state')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                Physical / Street Address
              </label>
              <textarea
                rows={2}
                {...registerProfile('address')}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              />
            </div>

            {/* Role Specific Extra Details */}
            {user?.role === 'pharmacist' && (
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <FileBadge size={16} className="text-sky-600" />
                  <span>Pharmacist License Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pharmacy License No.
                    </label>
                    <input
                      type="text"
                      {...registerProfile('licenseNumber')}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pharmacy Establishment
                    </label>
                    <input
                      type="text"
                      {...registerProfile('pharmacyName')}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {user?.role === 'ngo' && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Building2 size={16} className="text-indigo-600" />
                  <span>NGO Organization Contact Profile</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      {...registerProfile('organizationName')}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Your Designation
                    </label>
                    <input
                      type="text"
                      {...registerProfile('designation')}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={saveLoading}>
                <CheckCircle2 size={16} className="mr-1.5" />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SECURITY & PASSWORD CHANGE                              */}
      {/* ============================================================== */}
      {activeTab === 'security' && (
        <Card className="p-6 bg-white/90 shadow-soft">
          <h3 className="text-base font-heading font-bold text-text-heading mb-1">
            Change Account Password
          </h3>
          <p className="text-xs text-text-muted mb-6">
            Ensure your account is using a strong password with letters and numbers.
          </p>

          <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                {...registerPassword('currentPassword')}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              />
              {pwdErrors.currentPassword && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {pwdErrors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                New Password
              </label>
              <input
                type="password"
                {...registerPassword('newPassword')}
                placeholder="Min 8 characters, 1 uppercase, 1 number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              />
              {pwdErrors.newPassword && (
                <p className="text-[11px] text-rose-600 mt-1">{pwdErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                {...registerPassword('confirmPassword')}
                placeholder="Re-enter new password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              />
              {pwdErrors.confirmPassword && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {pwdErrors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="md" loading={pwdLoading}>
                <KeyRound size={16} className="mr-1.5" />
                <span>Update Password</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 3: REAL AUDIT LOG ACTIVITY                                 */}
      {/* ============================================================== */}
      {activeTab === 'activity' && (
        <Card className="p-6 bg-white/90 shadow-soft">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-heading font-bold text-text-heading">
                Security & Activity Log
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Real immutable audit trail of your last 20 actions on MediBridge
              </p>
            </div>
            <Badge color="info">Immutable Audit Trail</Badge>
          </div>

          {logsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Spinner size="md" />
              <p className="text-xs text-text-muted mt-2">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Activity Logged Yet"
              description="Actions like signing in, updating your password, and submitting donations will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log._id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 mt-0.5 flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-heading font-mono">
                        {log.action}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        IP: {log.ip || 'Local / Loopback'} • Agent:{' '}
                        {log.userAgent ? log.userAgent.split(' ')[0] : 'System'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-text-muted flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
