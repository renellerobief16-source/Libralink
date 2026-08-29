import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Book, Calendar, CheckCircle, User, Settings } from 'lucide-react';
import { getStudentBorrowHistory } from '../../../utils/api';
import { NotificationSkeleton } from '../../ui/Skeleton';

function StudentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-slide-up mx-auto w-full max-w-4xl min-w-0 overflow-x-hidden text-sm">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Reading activity</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Borrow history</h1>
          <p className="mt-1 text-sm text-slate-500">Review the books you have borrowed and returned.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/studentpage/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
            title="Profile"
          >
            <User className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => navigate('/studentpage/settings')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 sm:h-20 sm:w-20">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[#0f172a] mb-1.5 sm:mb-2">No borrowing history</h3>
            <p className="text-xs sm:text-sm text-slate-600">Your borrowing history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {history.map((item) => (
              <div
                key={item.id || item.borrow_id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-white sm:p-4"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-[#0f172a] mb-1 truncate">{item.book_title || item.title || 'Book'}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Borrowed: {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Returned: {item.return_date ? new Date(item.return_date).toLocaleDateString() : 'N/A'}</span>
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
