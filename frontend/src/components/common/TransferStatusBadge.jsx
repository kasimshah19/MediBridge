import React from 'react';
import Badge from '../ui/Badge';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    variant: 'info',
    icon: Clock,
  },
  partially_completed: {
    label: 'Partially Completed',
    variant: 'warning',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completed',
    variant: 'success',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'danger',
    icon: XCircle,
  },
};

export const TransferStatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    variant: 'default',
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{config.label}</span>
    </Badge>
  );
};

export default TransferStatusBadge;
