import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  HeartHandshake,
  Truck,
} from 'lucide-react';
import notificationApi from '../../api/notification.api';
import { formatDateTimeIST } from '../../utils/format';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({
        page,
        limit: 15,
        unreadOnly,
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [page, unreadOnly]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(c - 1, 0));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotal((t) => Math.max(t - 1, 0));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationApi.clearReadNotifications();
      loadNotifications();
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-teal-600" />
            <span>Notifications Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Stay informed on clinical verifications, match requests, expiry alerts, and handovers
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Mark all as read
            </button>
          )}

          <button
            onClick={handleClearRead}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
          >
            Clear read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <button
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition ${
            !unreadOnly ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          All ({total})
        </button>
        <button
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            unreadOnly ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-teal-500 text-white text-[10px] rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={unreadOnly ? 'No unread notifications' : 'Your inbox is clear'}
              description="Notifications will automatically appear as donations and requests advance."
            />
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item._id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition ${
                !item.isRead ? 'bg-teal-50/30' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !item.isRead ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{item.title}</span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTimeIST(item.createdAt)}
                    </span>

                    {item.link && (
                      <Link
                        to={item.link}
                        onClick={() => !item.isRead && handleMarkAsRead(item._id)}
                        className="text-teal-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Item actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item._id)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item._id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-slate-500 px-2">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
