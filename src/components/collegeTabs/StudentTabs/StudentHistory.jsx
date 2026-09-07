import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
import { getStudentBorrowHistory } from '../../../utils/api';

function StudentHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const userStr = localStorage.getItem('currentUser') || localStorage.getItem('currentUserId');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const userId = currentUser?.id || currentUser?.sub || userStr;

        if (userId) {
          const { data, error } = await getStudentBorrowHistory(userId);
          if (!error && data) {
            setHistory(data);
          }
        }
      } catch (err) {
        console.error('Error fetching borrow history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const isReturned = (item) => Boolean(item.return_date || item.returned_at || item.status === 'returned');
  const filteredHistory = history.filter((item) => {
    if (activeTab === 'returned') return isReturned(item);
    if (activeTab === 'borrowed') return !isReturned(item);
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All', count: history.length },
    { id: 'borrowed', label: 'Borrowed', count: history.filter((item) => !isReturned(item)).length },
    { id: 'returned', label: 'Returned', count: history.filter(isReturned).length },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 overflow-x-hidden text-sm">
      <header className="mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Reading activity</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Borrow history</h1>
          <p className="mt-1 text-sm text-slate-500">Review the books you have borrowed and returned.</p>
        </div>
      </header>

      <div className="mb-3 flex gap-5 overflow-x-auto border-b border-slate-200 px-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-1 pb-2 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label} <span className="text-[10px] text-slate-400">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-500">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-12 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 sm:h-20 sm:w-20">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
            </div>
            <h3 className="mb-1.5 text-base font-semibold text-[#0f172a] sm:text-lg">
              {history.length === 0 ? 'No borrowing history' : `No ${activeTab} books`}
            </h3>
            <p className="text-xs text-slate-600 sm:text-sm">Your borrowing history will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredHistory.map((item) => (
              <div
                key={item.id || item.borrow_id}
                className="py-3 transition hover:bg-slate-50 sm:py-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isReturned(item) ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <CheckCircle className={`h-4 w-4 ${isReturned(item) ? 'text-green-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate text-sm font-semibold text-[#0f172a]">{item.book_title || item.title || 'Book'}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Borrowed: {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{isReturned(item) ? `Returned: ${new Date(item.return_date || item.returned_at).toLocaleDateString()}` : 'Not returned'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentHistory;
