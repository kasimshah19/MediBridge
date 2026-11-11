// Implemented in Phase 1 & 2: Dynamic Status Badge
import Badge from '../ui/Badge';
import { STATUS_LABELS } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const item = STATUS_LABELS[status] || { label: status, color: 'neutral' };
  return <Badge color={item.color}>{item.label}</Badge>;
}

