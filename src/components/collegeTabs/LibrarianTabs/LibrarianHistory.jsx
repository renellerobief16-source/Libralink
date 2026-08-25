import { useState, useEffect } from "react";
import { History, AlertTriangle, Clock, User, Book, Calendar, CheckCircle, XCircle, Filter, Search } from "lucide-react";
import api from "../../../utils/api";

function LibrarianHistory({ darkMode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, overdue, active, returned
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/borrow-requests/school/${schoolId}`);
      const requests = response.dataWithItems || response.data || [];
      
      // Flatten items to get individual book history
      const flattenedHistory = [];
      requests.forEach(request => {
        if (request.items && request.items.length > 0) {
          request.items.forEach(item => {
            flattenedHistory.push({
              ...item,
              request_id: request.request_id,
              request_type: request.request_type,
              student: request.student,
              due_date: request.due_date,
              contact_number: request.contact_number,
              address: request.address
            });
          });
        }
      });
      
      setHistory(flattenedHistory);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getStatusBadge = (item) => {
    const status = item.status;
    const overdue = isOverdue(item.due_date) && status === 'released';
    
    if (overdue) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
          Overdue ({getDaysOverdue(item.due_date)} days)
        </span>
      );
    }
    
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">Pending</span>;
      case 'approved':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">Approved</span>;
      case 'released':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">Borrowed</span>;
      case 'returned':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">Returned</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">{status}</span>;
    }
  };

  const filteredHistory = history.filter(item => {
    // Apply status filter
    if (filter === 'overdue') {
      if (!isOverdue(item.due_date) || item.status !== 'released') return false;
    } else if (filter === 'active') {
      if (item.status !== 'released') return false;
    } else if (filter === 'returned') {
      if (item.status !== 'returned') return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const studentName = `${item.student?.firstname || ''} ${item.student?.lastname || ''}`.toLowerCase();
      const bookTitle = item.book?.title?.toLowerCase() || '';
      const requestId = item.request_id?.toLowerCase() || '';
      
      return studentName.includes(searchLower) || 
             bookTitle.includes(searchLower) || 
             requestId.includes(searchLower);
    }
    
    return true;
  });

  const overdueCount = history.filter(item => isOverdue(item.due_date) && item.status === 'released').length;
  const activeCount = history.filter(item => item.status === 'released').length;
  const returnedCount = history.filter(item => item.status === 'returned').length;

  return (
    <div className="animate-slide-up">
      <div className={`rounded-xl shadow-sm border p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172033]">Borrowing History</h1>
            <p className="text-sm text-[#64748B]">Monitor book borrowing and overdue status</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl p-5 border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Overdue</span>
          </div>
          <h3 className="text-2xl font-bold text-[#172033]">{overdueCount}</h3>
        </div>
        <div className={`rounded-xl p-5 border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-[#172033]">{activeCount}</h3>
        </div>
        <div className={`rounded-xl p-5 border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Returned</span>
          </div>
          <h3 className="text-2xl font-bold text-[#172033]">{returnedCount}</h3>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`rounded-xl p-4 mb-6 border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by student, book, or request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
              }`}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'overdue', 'active', 'returned'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className={`rounded-xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {loading ? (
          <div className="p-8 text-center text-[#64748B]">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-[#172033]">No History Found</h3>
            <p className="text-sm text-[#64748B]">No borrowing records match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${
                  darkMode ? 'text-gray-400 border-gray-700' : 'text-[#64748B] border-gray-200'
                } border-b`}>
                  <th className="p-4">Request ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Book</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.item_id} className={`border-t ${
                    darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <td className="p-4">
                      <span className="font-mono text-sm">{item.request_id}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <User className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                            {item.student?.firstname} {item.student?.lastname}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
                            {item.student?.student_number || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <Book className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                            {item.book?.title}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
                            {item.book?.author}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#64748B]'}`}>
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LibrarianHistory;
