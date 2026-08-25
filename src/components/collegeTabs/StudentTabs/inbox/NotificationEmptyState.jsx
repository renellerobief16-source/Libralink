import { Bell } from "lucide-react";

/**
 * NotificationEmptyState component
 * Displays empty state when no notifications exist
 */
function NotificationEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-slate-100">
        <Bell className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-[#0f172a]">No notifications</h3>
      <p className="text-sm text-slate-600">You're all caught up!</p>
    </div>
  );
}

export default NotificationEmptyState;
