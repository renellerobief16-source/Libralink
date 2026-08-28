import { useState, useEffect } from 'react';
import { Clock, Book, Calendar, CheckCircle } from 'lucide-react';
import { getStudentBorrowHistory } from '../../../utils/api';
import { NotificationSkeleton } from '../../ui/Skeleton';

function StudentHistory() {
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
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0077B6]">Reading activity</p>
        <h1 className="mt-1 text-xl font-bold text-[#0f172a] sm:text-2xl">Borrow History</h1>
        <p className="mt-1 text-sm text-slate-500">Review the books you have borrowed and returned.</p>
      </div>
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
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
                className="p-3 sm:p-4 rounded-lg border bg-slate-50 border-slate-200"
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
