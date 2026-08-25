/**
 * NotificationFilters component
 * Displays filter buttons for notifications
 */
function NotificationFilters({ selectedFilter, onFilterChange }) {
  const filters = [
    "all",
    "unread",
  ];

  const formatFilterName = (filter) => {
    const filterNames = {
      all: "All",
      unread: "Unread",
    };
    return filterNames[filter] || filter.replace(/_/g, " ").toLowerCase();
  };

  return (
    <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onFilterChange(filter)}
          className={`px-3 sm:px-4 py-2 sm:py-3 min-h-[36px] sm:min-h-[44px] rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-sm ${
            selectedFilter === filter
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-300 border border-slate-200"
          }`}
          aria-label={`Filter by ${formatFilterName(filter)}`}
          aria-pressed={selectedFilter === filter}
        >
          {formatFilterName(filter)}
        </button>
      ))}
    </div>
  );
}

export default NotificationFilters;
