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
    <div className="mb-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onFilterChange(filter)}
          className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            selectedFilter === filter
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-200 bg-transparent text-slate-600 hover:border-blue-300 hover:bg-slate-50"
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
