import { useState, useEffect, useMemo } from "react";
import {
  FiX, FiUsers, FiClock, FiCheckCircle, FiAlertCircle, FiSearch,
  FiBook, FiBookOpen, FiBookmark, FiHash, FiCalendar, FiMapPin,
  FiPhone, FiMail, FiUser, FiInbox, FiRefreshCw, FiCopy, FiCheck,
  FiCornerDownLeft, FiArrowRight, FiXCircle
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";

function BookBorrowersDrawer({ book, onClose, onBookUpdated }) {
  const [activeTab, setActiveTab] = useState("borrowers"); // 'borrowers', 'requests', 'history'
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [returnConfirmation, setReturnConfirmation] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const bookIdsParam = useMemo(() => {
    if (!book) return "";
    const ids = book.grouped_ids || book.grouped_book_ids || [];
    if (Array.isArray(ids) && ids.length > 0) {
      return ids.join(",");
    }
    return String(book.id || book.book_id || "");
  }, [book]);

  const loadSummary = async () => {
    if (!book) return;
    try {
      setLoading(true);
      const bookId = book.id || book.book_id;
      const res = await api.get(`/books/${bookId}/borrow-summary`, {
        params: { book_ids: bookIdsParam }
      });
      // api interceptor returns response.data directly, so res = { success, data: {...} }
      if (res?.success) {
        const data = res.data;
        setSummaryData(data);
        // If there are no physical active loans but there are pending reservations, auto-focus Requests
        if ((data.current_borrowers || []).length === 0 && (data.requests || []).length > 0) {
          setActiveTab("requests");
        }
      } else {
        console.error("borrow-summary returned non-success:", res);
      }
    } catch (err) {
      console.error("Error fetching book borrow summary:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (book) {
      loadSummary();
      setSearchQuery("");
      setActionSuccess(null);
      setActionError(null);
    }
  }, [book, bookIdsParam]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !returnConfirmation) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, returnConfirmation]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmReturn = async () => {
    if (!returnConfirmation?.borrower) return;
    const borrower = returnConfirmation.borrower;
    
    try {
      setReturnConfirmation((prev) => ({ ...prev, loading: true }));
      setActionError(null);

      let res;
      if (borrower.borrow_id) {
        res = await api.put(`/borrow/${borrower.borrow_id}/return`);
      } else if (borrower.item_id) {
        res = await api.put(`/borrow-requests/items/${borrower.item_id}/return`);
      }

      // api interceptor returns response.data directly: res = { success, message, ... }
      if (res?.success) {
        setActionSuccess(`Book copy #${borrower.accession_number} has been marked as returned.`);
        setReturnConfirmation(null);
        await loadSummary();
        onBookUpdated?.();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        throw new Error(res?.message || "Failed to return book");
      }
    } catch (err) {
      console.error("Error processing return:", err);
      setActionError(err.message || "Failed to process book return");
      setReturnConfirmation(null);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const currentBorrowers = summaryData?.current_borrowers || [];
  const requests = summaryData?.requests || [];
  const borrowHistory = summaryData?.borrow_history || [];
  const stats = summaryData?.stats || {
    active_loans: currentBorrowers.length,
    pending_requests: requests.filter((r) => r.status === "pending").length,
    total_requests: requests.length,
    history_count: borrowHistory.length
  };

  // Filter lists based on search
  const filteredBorrowers = useMemo(() => {
    if (!searchQuery.trim()) return currentBorrowers;
    const q = searchQuery.toLowerCase();
    return currentBorrowers.filter(
      (b) =>
        b.student_name?.toLowerCase().includes(q) ||
        b.student_number?.toLowerCase().includes(q) ||
        b.accession_number?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q)
    );
  }, [currentBorrowers, searchQuery]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.student_number?.toLowerCase().includes(q) ||
        r.request_id?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q) ||
        r.school_name?.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return borrowHistory;
    const q = searchQuery.toLowerCase();
    return borrowHistory.filter(
      (h) =>
        h.student_name?.toLowerCase().includes(q) ||
        h.student_number?.toLowerCase().includes(q) ||
        h.accession_number?.toLowerCase().includes(q) ||
        h.request_id?.toLowerCase().includes(q) ||
        h.status?.toLowerCase().includes(q)
    );
  }, [borrowHistory, searchQuery]);

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col transform transition-all ease-in-out duration-300 animate-in slide-in-from-right">
          
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/20 to-indigo-50/20">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-4 min-w-0">
                {/* Book Thumbnail */}
                <div className="relative w-16 h-22 flex-shrink-0 rounded-xl overflow-hidden shadow-md border border-slate-200 bg-slate-900">
                  {book.cover_image ? (
                    <img
                      src={getBackendAssetUrl(book.cover_image)}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-white">
                      <FiBook className="w-6 h-6 opacity-80" />
                    </div>
                  )}
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-white/20 shadow-inner" />
                </div>

                {/* Book Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <FiBookmark className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[120px]">{book.category || "General"}</span>
                    </span>
                    {book.callNumber && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <FiHash className="w-2.5 h-2.5 text-slate-400" />
                        {book.callNumber}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                    by {book.author || "Unknown Author"}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-center px-2 py-1 border-r border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Loans</span>
                <span className="text-base font-black text-blue-600">{stats.active_loans}</span>
              </div>
              <div className="text-center px-2 py-1 border-r border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Requests</span>
                <span className="text-base font-black text-amber-600">{stats.total_requests}</span>
              </div>
              <div className="text-center px-2 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Circulation Log</span>
                <span className="text-base font-black text-indigo-600">{stats.history_count}</span>
              </div>
            </div>
          </div>

          {/* Success / Error Banners */}
          {actionSuccess && (
            <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
              <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-800 animate-in fade-in">
              <FiAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Navigation Tabs & Search */}
          <div className="px-5 pt-3 pb-3 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("borrowers")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "borrowers"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <FiUsers className="w-3.5 h-3.5" />
                  <span>Current Borrowers</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === "borrowers" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {currentBorrowers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("requests")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "requests"
                      ? "bg-amber-600 text-white shadow-sm shadow-amber-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <FiInbox className="w-3.5 h-3.5" />
                  <span>Requests & Reservations</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === "requests" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {requests.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "history"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <FiClock className="w-3.5 h-3.5" />
                  <span>Borrow History Log</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {borrowHistory.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={loadSummary}
                disabled={loading}
                title="Refresh data"
                className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>

            {/* Internal Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, ID number, request ID, accession copy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Drawer Body / Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 space-y-4">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <FiRefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <div className="text-sm font-bold text-slate-800">Loading Circulation Records...</div>
                <p className="text-xs text-slate-400 mt-0.5">Fetching live borrower & transaction logs</p>
              </div>
            ) : (
              <>
                {/* TAB 1: CURRENT BORROWERS */}
                {activeTab === "borrowers" && (
                  <div>
                    {filteredBorrowers.length === 0 ? (
                      requests.length > 0 ? (
                        /* Informative Reservation Callout when 0 physical loans but active reservation exists */
                        <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl p-6 text-center shadow-xs space-y-3.5 animate-in fade-in">
                          <div className="w-13 h-13 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                            <FiInbox className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 mb-1.5">
                              Pending Borrow Reservation
                            </span>
                            <h4 className="text-base font-bold text-slate-900">Book is Currently Reserved</h4>
                            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                              There are no physically checked-out copies on hand because <strong className="text-slate-900">{requests.length} student reservation(s)</strong> are currently pending approval or pickup.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab("requests")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <span>View Requester & Details ({requests.length})</span>
                            <FiArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80">
                          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <FiUsers className="w-7 h-7" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">No Active Borrowers</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                            {searchQuery
                              ? "No active loans match your search query."
                              : "All copies of this book are currently available on the shelf or not currently checked out."}
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        {filteredBorrowers.map((borrower) => (
                          <div
                            key={borrower.borrow_id || borrower.item_id || borrower.copy_id}
                            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all duration-200 space-y-3"
                          >
                            {/* Student Profile Row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 overflow-hidden">
                                  {borrower.profile_image ? (
                                    <img
                                      src={getBackendAssetUrl(borrower.profile_image)}
                                      alt={borrower.student_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>
                                      {borrower.student_name
                                        ? borrower.student_name.slice(0, 2).toUpperCase()
                                        : "ST"}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900 truncate">
                                      {borrower.student_name}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                    <span>ID: #{borrower.student_number || borrower.student_id}</span>
                                    {borrower.school_code && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="font-sans text-blue-600 font-semibold">{borrower.school_code}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Overdue / Due Status Badge */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                                  borrower.is_overdue
                                    ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    borrower.is_overdue ? "bg-rose-500" : "bg-emerald-500"
                                  }`}
                                />
                                <span>{borrower.days_label}</span>
                              </span>
                            </div>

                            {/* Copy & Timeline Information */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                <FiHash className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="text-slate-400 font-medium">Accession:</span>
                                <span className="font-mono font-bold text-slate-900">
                                  {borrower.accession_number}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(borrower.accession_number, `acc-${borrower.borrow_id || borrower.item_id}`)}
                                  title="Copy Accession #"
                                  className="ml-auto text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  {copiedId === `acc-${borrower.borrow_id || borrower.item_id}` ? (
                                    <FiCheck className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <FiCopy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                <FiCalendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="text-slate-400 font-medium">Borrowed:</span>
                                <span className="font-semibold text-slate-800">
                                  {borrower.borrow_date ? new Date(borrower.borrow_date).toLocaleDateString() : "N/A"}
                                </span>
                              </div>
                            </div>

                            {/* Contact Info */}
                            {(borrower.email || borrower.contact_number) && (
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                                {borrower.email && (
                                  <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                                    <FiMail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{borrower.email}</span>
                                  </span>
                                )}
                                {borrower.contact_number && (
                                  <span className="inline-flex items-center gap-1">
                                    <FiPhone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{borrower.contact_number}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Process Return Action Bar */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <FiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Due: <strong className="text-slate-700">{borrower.due_date ? new Date(borrower.due_date).toLocaleDateString() : 'N/A'}</strong></span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setReturnConfirmation({ borrower, loading: false })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                              >
                                <FiCheckCircle className="w-3.5 h-3.5" />
                                <span>Process Return</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: REQUESTS & RESERVATIONS */}
                {activeTab === "requests" && (
                  <div>
                    {filteredRequests.length === 0 ? (
                      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80">
                        <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <FiInbox className="w-7 h-7" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">No Pending Requests</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                          {searchQuery
                            ? "No reservations match your search query."
                            : "There are currently no active or pending borrow requests for this book."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredRequests.map((reqItem) => {
                          const isPending = reqItem.status === "pending";
                          const isApproved = reqItem.status === "approved" || reqItem.status === "ready_for_pickup";

                          return (
                            <div
                              key={reqItem.item_id || reqItem.request_id}
                              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all duration-200 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 overflow-hidden">
                                    {reqItem.profile_image ? (
                                      <img
                                        src={getBackendAssetUrl(reqItem.profile_image)}
                                        alt={reqItem.student_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>
                                        {reqItem.student_name
                                          ? reqItem.student_name.slice(0, 2).toUpperCase()
                                          : "ST"}
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 truncate">
                                      {reqItem.student_name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                      <span>Req #{reqItem.request_id}</span>
                                      {reqItem.school_name && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="font-sans font-semibold text-blue-600">{reqItem.school_name}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                                    isApproved
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : isPending
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isApproved ? "bg-emerald-500" : isPending ? "bg-amber-500" : "bg-slate-400"
                                    }`}
                                  />
                                  <span className="capitalize">{reqItem.status.replace("_", " ")}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                  <FiCalendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="text-slate-400 font-medium">Requested:</span>
                                  <span className="font-semibold text-slate-800">
                                    {reqItem.created_at ? new Date(reqItem.created_at).toLocaleDateString() : "N/A"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                  <FiBookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="text-slate-400 font-medium">Type:</span>
                                  <span className="font-semibold text-slate-800 uppercase">
                                    {reqItem.request_type || "HOME"}
                                  </span>
                                </div>
                              </div>

                              {/* Student Contact Info */}
                              {(reqItem.email || reqItem.contact_number) && (
                                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                                  {reqItem.email && (
                                    <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                                      <FiMail className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{reqItem.email}</span>
                                    </span>
                                  )}
                                  {reqItem.contact_number && (
                                    <span className="inline-flex items-center gap-1">
                                      <FiPhone className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{reqItem.contact_number}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {reqItem.purpose && (
                                <p className="text-[11px] text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80 italic">
                                  "{reqItem.purpose}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: BORROW HISTORY LOG */}
                {activeTab === "history" && (
                  <div>
                    {filteredHistory.length === 0 ? (
                      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80">
                        <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <FiClock className="w-7 h-7" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">No Past Circulation History</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                          {searchQuery
                            ? "No completed loans match your search query."
                            : "This book has not been previously returned or completed in circulation records yet."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredHistory.map((record) => {
                          const isReturned = record.status === 'returned' || record.status === 'completed';
                          const isCancelled = record.status === 'cancelled' || record.status === 'rejected';

                          return (
                            <div
                              key={record.id || record.borrow_id || record.item_id}
                              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 truncate">
                                    {record.student_name}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                    <span>ID: #{record.student_number || record.student_id}</span>
                                    {record.request_id && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-blue-600 font-semibold font-mono">Req: {record.request_id}</span>
                                      </>
                                    )}
                                    {record.school_name && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="font-sans text-slate-600">{record.school_name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 capitalize ${
                                  isReturned
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isCancelled
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {isReturned ? (
                                    <FiCheckCircle className="w-3 h-3 text-emerald-600" />
                                  ) : isCancelled ? (
                                    <FiXCircle className="w-3 h-3 text-slate-500" />
                                  ) : (
                                    <FiClock className="w-3 h-3 text-amber-600" />
                                  )}
                                  <span>{record.status || "Returned"}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                                <div className="text-slate-600">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Accession Copy</span>
                                  <span className="font-mono font-bold text-slate-900">{record.accession_number || 'N/A'}</span>
                                </div>
                                <div className="text-slate-600">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Borrow / Request Date</span>
                                  <span className="font-semibold text-slate-800">
                                    {record.borrow_date ? new Date(record.borrow_date).toLocaleDateString() : "N/A"}
                                  </span>
                                </div>
                                <div className="text-slate-600">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Completed / Return Date</span>
                                  <span className="font-semibold text-emerald-700">
                                    {record.return_date ? new Date(record.return_date).toLocaleDateString() : "N/A"}
                                  </span>
                                </div>
                              </div>

                              {record.remarks && (
                                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                                  "{record.remarks}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Consolidated Book ID: <span className="font-mono text-slate-700 font-bold">#{book.id || book.book_id}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>

      {/* Process Return Confirmation Modal */}
      {returnConfirmation && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Confirm Book Return</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mark this book copy as returned and restore its shelf availability.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Student:</span>
                <span className="font-bold text-slate-800">{returnConfirmation.borrower.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Accession Copy:</span>
                <span className="font-mono font-bold text-blue-600">{returnConfirmation.borrower.accession_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Borrowed On:</span>
                <span className="font-medium text-slate-700">
                  {returnConfirmation.borrower.borrow_date ? new Date(returnConfirmation.borrower.borrow_date).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Due Date:</span>
                <span className="font-medium text-slate-700">
                  {returnConfirmation.borrower.due_date ? new Date(returnConfirmation.borrower.due_date).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={returnConfirmation.loading}
                onClick={() => setReturnConfirmation(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={returnConfirmation.loading}
                onClick={handleConfirmReturn}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {returnConfirmation.loading ? (
                  <>
                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>Confirm Return</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookBorrowersDrawer;
