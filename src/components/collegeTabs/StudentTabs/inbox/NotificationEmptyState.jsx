import { MessageCircle } from "lucide-react";

/**
 * NotificationEmptyState component
 * Displays empty state when no notifications exist
 */
function NotificationEmptyState() {
  return (
    <div className="px-3 py-8 text-center sm:py-10">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#dceeff]">
        <div className="flex h-10 w-10 rotate-[-8deg] items-center justify-center rounded-xl bg-white">
          <MessageCircle className="h-6 w-6 text-[#2774c6]" strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-900">Start a conversation</h3>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-600">
        Updates from your library will appear here.
      </p>
    </div>
  );
}

export default NotificationEmptyState;
