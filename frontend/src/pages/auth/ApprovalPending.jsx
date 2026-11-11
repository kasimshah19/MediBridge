import { useAuth } from '../../context/AuthContext';
import { Clock, ShieldAlert, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Logo from '../../components/common/Logo';
import { Link } from 'react-router-dom';

export default function ApprovalPending() {
  const { user, logout, refreshUser } = useAuth();

  const isRejected = user?.approvalStatus === 'rejected';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF]">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Logo size="lg" to="/" />
        </div>

        <Card className="text-center p-8 bg-white/90 backdrop-blur-xl shadow-hover border border-teal-900/10">
          {/* Status Illustration */}
          <div className="mb-6 flex justify-center">
            {isRejected ? (
              <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-soft">
                <ShieldAlert size={40} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-soft">
                <Clock size={40} className="animate-pulse" />
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="mb-3">
            <Badge color={isRejected ? 'danger' : 'warning'}>
              {isRejected ? 'Application Rejected' : 'Administrative Verification Pending'}
            </Badge>
          </div>

          <h2 className="text-2xl font-heading font-extrabold text-text-heading mb-2">
            {isRejected ? 'Verification Not Approved' : 'Account Under Review'}
          </h2>

          <p className="text-sm text-text-body leading-relaxed max-w-md mx-auto mb-6">
            {isRejected ? (
              <>
                Your application as a registered{' '}
                <strong className="capitalize">{user?.role}</strong> was not approved by our compliance team.
              </>
            ) : (
              <>
                Hello <strong className="text-teal-800">{user?.name}</strong>. In compliance with pharmaceutical safety regulations, all{' '}
                <strong className="capitalize">{user?.role}</strong> accounts must be verified by a system administrator before accessing active donation matching.
              </>
            )}
          </p>

          {/* Rejection Note if exists */}
          {isRejected && user?.approvalNote && (
            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-left text-xs text-rose-800 mb-6">
              <p className="font-bold mb-1">Administrative Compliance Note:</p>
              <p className="leading-relaxed">{user.approvalNote}</p>
            </div>
          )}

          {/* Details summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-text-muted">Account Role:</span>
              <span className="font-semibold text-text-heading capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-text-muted">Registered Email:</span>
              <span className="font-semibold text-text-heading">{user?.email}</span>
            </div>
            {user?.pharmacistProfile?.licenseNumber && (
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-text-muted">Pharmacy License:</span>
                <span className="font-semibold text-text-heading">{user.pharmacistProfile.licenseNumber}</span>
              </div>
            )}
            {user?.ngoContact?.organizationName && (
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-text-muted">Organization:</span>
                <span className="font-semibold text-text-heading">{user.ngoContact.organizationName}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={refreshUser}
              className="w-full sm:w-auto text-xs"
            >
              <RefreshCw size={14} className="mr-1.5" />
              <span>Check Verification Status</span>
            </Button>

            <Link to="/profile" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full text-xs">
                <UserIcon size={14} className="mr-1.5" />
                <span>View Profile</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="md"
              onClick={logout}
              className="w-full sm:w-auto text-xs text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={14} className="mr-1.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
