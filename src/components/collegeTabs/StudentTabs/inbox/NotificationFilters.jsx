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
    <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onFilterChange(filter)}
          className={`px-2.5 py-1.5 min-h-8 rounded-lg text-xs font-medium whitespace-nowrap transition-all shadow-sm ${
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
