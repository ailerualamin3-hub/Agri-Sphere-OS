import React, { useEffect, useCallback } from "react";
import { Bell, X, Check, CheckCheck, Trash2, AlertTriangle, Info, Leaf, Heart, CloudRain, ShoppingCart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TOKEN_KEY = "frege_auth_token";

export interface AppNotification {
  id: number;
  farmerId: number;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  isRead: boolean;
  smsSent: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "crop": return <Leaf className="w-4 h-4" />;
    case "livestock": return <Heart className="w-4 h-4" />;
    case "weather": return <CloudRain className="w-4 h-4" />;
    case "market": return <ShoppingCart className="w-4 h-4" />;
    default: return <Info className="w-4 h-4" />;
  }
}

function getPriorityColor(priority: string, type: string) {
  if (type === "alert" || priority === "high") return { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", dot: "bg-red-500" };
  if (type === "warning" || priority === "medium") return { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", dot: "bg-amber-500" };
  return { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500", dot: "bg-blue-400" };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-gray-50 relative" onClick={onClick}>
      <Bell className="w-4 h-4 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: NotificationState;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDelete: (id: number) => void;
}

export function NotificationPanel({ isOpen, onClose, state, onMarkRead, onMarkAllRead, onDelete }: NotificationPanelProps) {
  if (!isOpen) return null;
  const { notifications, unreadCount } = state;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#16A34A]" />
            <h2 className="text-base font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-600 border-red-200 text-xs px-1.5 py-0">{unreadCount} new</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-[#16A34A] h-7 px-2" onClick={onMarkAllRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
              <X className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Bell className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs">We'll alert you when something needs attention</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => {
                const colors = getPriorityColor(n.priority, n.type);
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 transition-colors ${!n.isRead ? "bg-green-50/40" : "bg-white"}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.icon} mt-0.5`}>
                      {n.type === "alert" ? <AlertTriangle className="w-4 h-4" /> : getCategoryIcon(n.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {!n.isRead && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />}
                          <p className={`text-sm leading-tight ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>{n.title}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                      {n.smsSent && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-green-600 font-medium">
                          <Check className="w-2.5 h-2.5" /> SMS sent
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {!n.isRead && (
                          <button onClick={() => onMarkRead(n.id)} className="text-[11px] text-[#16A34A] font-medium flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                        <button onClick={() => onDelete(n.id)} className="text-[11px] text-gray-400 flex items-center gap-0.5 hover:text-red-400">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function useNotifications() {
  const [state, setState] = React.useState<NotificationState>({ notifications: [], unreadCount: 0 });
  const [panelOpen, setPanelOpen] = React.useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch("/notifications");
      setState(data);
    } catch {
    }
  }, []);

  const generateNotifications = useCallback(async () => {
    try {
      await apiFetch("/notifications/generate", { method: "POST" });
      await fetchNotifications();
    } catch {
    }
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setState((prev) => ({
        notifications: prev.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch {
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setState((prev) => ({
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
    }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      setState((prev) => {
        const removed = prev.notifications.find((n) => n.id === id);
        return {
          notifications: prev.notifications.filter((n) => n.id !== id),
          unreadCount: removed && !removed.isRead ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        };
      });
    } catch {
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    generateNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [generateNotifications, fetchNotifications]);

  return { state, panelOpen, setPanelOpen, markRead, markAllRead, deleteNotification };
}
