import {
  FileText,
  Clock,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  HeartHandshake,
  Package,
  Award,
  Ban,
  AlertTriangle,
  CalendarX,
  Flame,
} from 'lucide-react';
import Badge from '../ui/Badge';

const STATUS_CONFIGS = {
  // Donation Statuses
  draft: {
    label: 'Draft',
    color: 'neutral',
    icon: FileText,
  },
  submitted: {
    label: 'Submitted',
    color: 'info',
    icon: Clock,
  },
  under_verification: {
    label: 'Under Verification',
    color: 'info',
    icon: ShieldAlert,
  },
  more_info_required: {
    label: 'More Info Needed',
    color: 'warning',
    icon: HelpCircle,
  },
  approved: {
    label: 'Approved',
    color: 'success',
    icon: CheckCircle2,
  },
  screening_rejected: {
    label: 'Screening Rejected',
    color: 'danger',
    icon: AlertOctagon,
  },
  rejected: {
    label: 'Rejected',
    color: 'danger',
    icon: XCircle,
  },
  matched: {
    label: 'Matched with NGO',
    color: 'info',
    icon: HeartHandshake,
  },
  handed_over: {
    label: 'Handed Over',
    color: 'info',
    icon: Package,
  },
  completed: {
    label: 'Completed',
    color: 'success',
    icon: Award,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'neutral',
    icon: Ban,
  },

  // Medicine Inventory Statuses
  pending: {
    label: 'Pending',
    color: 'warning',
    icon: Clock,
  },
  expired: {
    label: 'Expired',
    color: 'danger',
    icon: CalendarX,
  },
  reserved: {
    label: 'Reserved',
    color: 'info',
    icon: Package,
  },
  transferred: {
    label: 'Transferred',
    color: 'info',
    icon: Package,
  },
  disposed: {
    label: 'Disposed',
    color: 'neutral',
    icon: Ban,
  },

  // Priority Levels
  normal: {
    label: 'Normal Priority (>180d)',
    color: 'success',
    icon: CheckCircle2,
  },
  medium: {
    label: 'Medium Priority (91-180d)',
    color: 'info',
    icon: Clock,
  },
  high: {
    label: 'High Priority (31-90d)',
    color: 'warning',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical Shelf Life (≤30d)',
    color: 'danger',
    icon: Flame,
  },

  // Screening Statuses
  passed: {
    label: 'Screening Passed',
    color: 'success',
    icon: CheckCircle2,
  },
  not_checked: {
    label: 'Not Screened',
    color: 'neutral',
    icon: Clock,
  },
};

export default function StatusBadge({ status, className, showIcon = true, size = 'sm' }) {
  if (!status) return null;

  const config = STATUS_CONFIGS[status] || {
    label: status.replace(/_/g, ' '),
    color: 'neutral',
    icon: Clock,
  };

  const IconComponent = config.icon;
  const iconSize = size === 'xs' ? 10 : 12;

  return (
    <Badge color={config.color} className={`capitalize gap-1.5 font-medium ${className || ''}`}>
      {showIcon && IconComponent && <IconComponent size={iconSize} className="flex-shrink-0" />}
      <span>{config.label}</span>
    </Badge>
  );
}
