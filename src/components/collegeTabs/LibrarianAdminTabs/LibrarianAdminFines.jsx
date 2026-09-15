import { useState, useEffect, useMemo } from "react";
import { 
  FiDollarSign, FiCheck, FiClock, FiSearch, FiRefreshCw, 
  FiUser, FiBook, FiAlertCircle, FiX, FiCheckCircle, FiShield, FiTag 
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";
import { AnimatedCounter } from "../../common";

function LibrarianAdminFines({ darkMode }) {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFine, setSelectedFine] = useState(null);
  const [settlementAction, setSettlementAction] = useState('paid');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      setFines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/fines/school/${schoolId}`);
      const finesData = response.data?.data || response.data || [];
      setFines(Array.isArray(finesData) ? finesData : []);
    } catch (error) {
      console.error('Error fetching fines:', error);
      setFines([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFines();
  };

  // Financial Stats
  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let waived = 0;

    fines.forEach(f => {
      const amt = Number(f.amount) || 0;
      total += amt;
      const st = (f.status || 'pending').toLowerCase();
      if (st === 'paid') paid += amt;
      else if (st === 'waived') waived += amt;
      else pending += amt;
    });

    return { total, paid, pending, waived, count: fines.length };
  }, [fines]);

  // Filtered fines
  const filteredFines = useMemo(() => {
    return fines.filter(fine => {
      const st = (fine.status || 'pending').toLowerCase();
      if (filter === 'pending' && st !== 'pending') return false;
      if (filter === 'paid' && st !== 'paid') return false;
      if (filter === 'waived' && st !== 'waived') return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const studentName = `${fine.user?.firstname || fine.firstname || ''} ${fine.user?.lastname || fine.lastname || ''}`.toLowerCase();
      const studentNumber = (fine.user?.student_number || fine.student_number || '').toLowerCase();
      const bookTitle = (fine.book?.title || fine.book_title || fine.borrow_transactions?.book_copies?.books?.title || '').toLowerCase();
      const reason = (fine.reason || fine.description || '').toLowerCase();

      return studentName.includes(q) || studentNumber.includes(q) || bookTitle.includes(q) || reason.includes(q);
    });
  }, [fines, filter, searchTerm]);

  const handleStatusUpdate = async (fineId, newStatus) => {
    setProcessing(true);
    setErrorMessage('');
    try {
      const response = await api.put(`/fines/${fineId}/status`, { 
        status: newStatus,
        notes: paymentNotes.trim()
      });
      if (response.data?.success || response.success || response.status === 200) {
        setActionSuccess(true);
        setTimeout(() => {
          setActionSuccess(false);
          setSelectedFine(null);
          setPaymentNotes('');
          fetchFines();
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating fine status:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to update fine status.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-lg">
              ₱
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Fines & Penalties Management</h2>
              <p className="text-xs text-slate-500">Track student overdue assessments, collections, and fee waivers</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
        </button>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assessed</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">₱</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ₱<AnimatedCounter value={stats.total} decimals={2} />
          </p>
          <span className="text-[11px] text-slate-400">
            <AnimatedCounter value={stats.count} suffix=" total records" />
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Collected / Paid</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100"><FiCheck className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            ₱<AnimatedCounter value={stats.paid} decimals={2} />
          </p>
          <span className="text-[11px] text-slate-400">Settled payments</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Outstanding Balance</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100"><FiClock className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-rose-700">
            ₱<AnimatedCounter value={stats.pending} decimals={2} />
          </p>
          <span className="text-[11px] text-slate-400">Pending collections</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Waived Amount</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100"><FiShield className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-purple-700">
            ₱<AnimatedCounter value={stats.waived} decimals={2} />
          </p>
          <span className="text-[11px] text-slate-400">Excused penalties</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, ID number, book title..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'All Fines' },
              { id: 'pending', label: 'Pending Settlement' },
              { id: 'paid', label: 'Paid & Cleared' },
              { id: 'waived', label: 'Waived' },
            ].map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fines Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Fines Registry ({filteredFines.length})
          </h3>
          <span className="text-[11px] text-slate-400">Institutional records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading fine records...</p>
          </div>
        ) : filteredFines.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FiCheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Fines Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm ? `No records matched "${searchTerm}". Try another search term.` : 'There are no library fines recorded for this category.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFines.map((fine) => {
              const studentName = [fine.user?.firstname || fine.firstname, fine.user?.lastname || fine.lastname].filter(Boolean).join(' ') || 'Campus Student';
              const studentId = fine.user?.student_number || fine.student_number;
              const profileImg = fine.user?.profile_image || fine.profile_image;
              const bookTitle = fine.book?.title || fine.book_title || fine.borrow_transactions?.book_copies?.books?.title || 'Library Publication';
              const amount = Number(fine.amount || 0).toFixed(2);
              const status = (fine.status || 'pending').toLowerCase();
              const isPaid = status === 'paid';
              const isWaived = status === 'waived';
              const isPending = !isPaid && !isWaived;

              return (
                <div
                  key={fine.fine_id || fine.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Student Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                      {profileImg ? (
                        <img
                          src={getBackendAssetUrl(profileImg)}
                          alt={studentName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML = `<span class="text-xs font-bold text-slate-600">${studentName.charAt(0).toUpperCase()}</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">
                          {studentName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {studentName}
                        </span>
                        {studentId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {studentId}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isWaived
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : isWaived ? 'bg-purple-500' : 'bg-rose-500'}`}></span>
                          {isPaid ? 'Paid' : isWaived ? 'Waived' : 'Pending'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium line-clamp-1 mb-1">
                        <span className="text-slate-400">Book:</span> {bookTitle}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        {fine.reason && <span>Reason: <strong className="text-slate-600">{fine.reason}</strong></span>}
                        {fine.created_at && (
                          <span>Assessed: {new Date(fine.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Amount & Action Button */}
                  <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">₱{amount}</span>
                      <span className="text-[10px] text-slate-400 block">{status}</span>
                    </div>

                    {isPending && (
                      <button
                        onClick={() => setSelectedFine(fine)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
                      >
                        Settle Fee →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settle Fine Modal */}
      {selectedFine && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full animate-scale-up overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  ₱
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Settle Library Fine</h3>
                  <p className="text-xs text-slate-500">Fine Assessment #{selectedFine.fine_id || selectedFine.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFine(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Fine status updated successfully!</span>
                </div>
              )}

              {/* Assessment Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
                <p className="text-3xl font-black text-slate-900">₱{Number(selectedFine.amount || 0).toFixed(2)}</p>
                <p className="text-xs text-slate-600 font-semibold">
                  {selectedFine.user?.firstname || selectedFine.firstname} {selectedFine.user?.lastname || selectedFine.lastname}
                </p>
              </div>

              {/* Action Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementAction('paid')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      settlementAction === 'paid'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FiCheck className="w-4 h-4 text-emerald-600" />
                    <span>Mark as Paid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementAction('waived')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      settlementAction === 'waived'
                        ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FiShield className="w-4 h-4 text-purple-600" />
                    <span>Waive Fine</span>
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Receipt / Settlement Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid in cash at counter / Receipt #4829"
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFine(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate(selectedFine.fine_id || selectedFine.id, settlementAction)}
                disabled={processing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {processing ? 'Processing...' : `Confirm ${settlementAction === 'paid' ? 'Payment' : 'Waiver'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminFines;
