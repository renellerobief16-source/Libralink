import { FiRefreshCw } from 'react-icons/fi';

function DashboardRefreshButton({ onRefresh, isRefreshing }) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
    >
      <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>Refresh</span>
    </button>
  );
}

export default DashboardRefreshButton;
