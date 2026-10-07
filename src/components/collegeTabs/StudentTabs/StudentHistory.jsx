import { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Book,
  QrCode,
  ArrowUpRight,
  RefreshCw,
  Search,
  Hourglass,
  XCircle,
  X,
  AlertTriangle,
  Send,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import api, {
  getBackendAssetUrl,
  cancelBorrowRequestItem,
  requestBorrowCancellation,
  requestBookRenewal,
} from "../../../utils/api";
import { getBookCoverUrl } from "../../../utils/bookCoverUtils";
import QRCodeDisplay from "./QRCodeDisplay";
import {
  getDueStatusDetails,
  formatPhilippineDate,
  formatSmartTime,
  formatPhilippineFullTooltip,
} from "../../../utils/timeUtils";

function StudentHistory({ isDrawer = false, onClose, initialState = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveState = initialState || location.state;

  const [historySets, setHistorySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    return effectiveState?.tab || new URLSearchParams(location.search).get("tab") || "all";
  }); // 'all' | 'active' | 'returned' | 'requests'

  useEffect(() => {
    const stateObj = initialState || location.state;
    if (stateObj?.tab) {
      setActiveTab(stateObj.tab);
    }
    if (stateObj?.filter) {
      setActiveFilter(stateObj.filter);
    }
    if (stateObj?.highlightRequestId) {
      setHighlightedRequestId(stateObj.highlightRequestId);
      setExpandedSetIds((prev) => new Set([...prev, stateObj.highlightRequestId]));
    }
  }, [location.state, initialState]);
  const [activeFilter, setActiveFilter] = useState(() => effectiveState?.filter || null); // null | 'overdue' | 'dueSoon'
  const [selectedRequestForQR, setSelectedRequestForQR] = useState(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState(() => {
    return effectiveState?.highlightRequestId || new URLSearchParams(location.search).get("requestId") || null;
  });

  // Set Accordion expansion tracking
  const [expandedSetIds, setExpandedSetIds] = useState(new Set());

  // Item-level Cancellation States (Inline per-book)
  const [cancellingItemId, setCancellingItemId] = useState(null);
  const [selectedReasonPreset, setSelectedReasonPreset] = useState("No longer needed for coursework / study");
  const [cancellationCustomNote, setCancellationCustomNote] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastFeedback, setToastFeedback] = useState(null);

  // Renewal States (Inline per-book)
  const [renewingRequestId, setRenewingRequestId] = useState(null);
  const [renewalReason, setRenewalReason] = useState("");
  const [renewalSubmittingId, setRenewalSubmittingId] = useState(null);

  const showToast = (message, type = "success") => {
    setToastFeedback({ message, type });
    setTimeout(() => setToastFeedback(null), 4500);
  };

  const toggleSetExpanded = (requestId) => {
    setExpandedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const handleRequestRenewal = async (requestId) => {
    if (!requestId) return;
    setRenewalSubmittingId(requestId);
    try {
      const { data, error } = await requestBookRenewal(requestId, renewalReason);
      if (error) {
        showToast(typeof error === "string" ? error : "Failed to submit renewal request.", "error");
        return;
      }
      showToast("Renewal request submitted! Awaiting librarian approval.", "success");
      setRenewingRequestId(null);
      setRenewalReason("");
      await fetchHistory();
    } catch (err) {
      showToast(err.message || "Error submitting renewal request.", "error");
    } finally {
      setRenewalSubmittingId(null);
    }
  };

  // Item-level cancellation handler
  const handleCancelSingleItem = async (item, parentSet) => {
    if (!item?.itemId) return;

    const combinedReason = cancellationCustomNote.trim()
      ? `${selectedReasonPreset}: ${cancellationCustomNote.trim()}`
      : selectedReasonPreset;

    setActionLoadingId(item.itemId);
    try {
      const res = await cancelBorrowRequestItem(item.itemId, combinedReason);
      if (res.error) {
        const errorMsg = res.error?.response?.data?.message || res.error?.message || "Failed to cancel book item.";
        showToast(errorMsg, "error");
      } else {
        showToast(`"${item.title}" was cancelled successfully.`);
        setCancellingItemId(null);
        setCancellationCustomNote("");
        await fetchHistory();
      }
    } catch (err) {
      console.error("Error cancelling item:", err);
      showToast("An unexpected error occurred while cancelling book.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // Primary: Get current student's borrowing requests
      const response = await api.get("/borrow-requests/my-requests");
      const requests = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response)
        ? response
        : [];

      // Group into Sets by request_id
      const sets = requests.map((req) => {
        const rawItems = Array.isArray(req.items) && req.items.length > 0 ? req.items : [{}];

        const normalizedItems = rawItems.map((item, idx) => {
          const bookTitle = item.book?.title || item.title || item.book_title || "Academic Material";
          const bookAuthor = item.book?.author || item.author || "Academic Research";
          const coverImage = item.book?.cover_image || null;
          const schoolName =
            item.owner_school?.school_name ||
            item.owner_school_name ||
            req.home_school?.school_name ||
            "Main Library";

          const reqStatus = (req.status || "pending").toLowerCase();
          const itemStatus = (item.status || item.item_status || "").toLowerCase();
          const rawStatus =
            reqStatus === "cancelled" || reqStatus === "cancellation_requested" || !itemStatus
              ? reqStatus
              : itemStatus;

          const renewalCountMatch = (req.rejection_reason || "").match(/RENEWAL_COUNT:(\d+)/i);
          const renewalCount = renewalCountMatch ? parseInt(renewalCountMatch[1], 10) : 0;

          return {
            itemId: item.item_id || `${req.request_id}_${idx}`,
            bookId: item.book_id || item.book?.id,
            title: bookTitle,
            author: bookAuthor,
            coverImage: coverImage,
            schoolName: schoolName,
            status: rawStatus,
            cancellationReason: item.cancellation_reason || null,
            dueDate: item.due_date || req.due_date,
            returnedAt: item.returned_at || req.returned_at,
            borrowType: item.borrow_type || req.request_type || "HOME",
            isHomeLibraryBook: (item.borrow_type || req.request_type || "HOME").toUpperCase() === "HOME",
            renewalCount,
            rawItem: item,
          };
        });

        // Determine primary school name for the set
        const primarySchool =
          req.home_school?.school_name ||
          normalizedItems[0]?.schoolName ||
          "University Library";

        return {
          requestId: req.request_id,
          requestDate: req.created_at,
          requestType: req.request_type || "HOME",
          status: (req.status || "pending").toLowerCase(),
          dueDate: req.due_date,
          returnedAt: req.returned_at,
          qrToken: req.qr_token,
          purpose: req.purpose,
          cancellationReason: req.cancellation_reason,
          schoolName: primarySchool,
          items: normalizedItems,
          booksCount: normalizedItems.length,
          rawRequest: req,
        };
      });

      setHistorySets(sets);

      // Auto-expand the highlighted target request or newest set if only 1 exists
      if (highlightedRequestId) {
        setExpandedSetIds((prev) => new Set([...prev, highlightedRequestId]));
      } else if (sets.length === 1) {
        setExpandedSetIds(new Set([sets[0].requestId]));
      }
    } catch (err) {
      console.error("Error fetching student borrow history:", err);
      setError("Unable to load borrowing history. Please try again.");
      setHistorySets([]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to highlighted request once history sets are rendered
  useEffect(() => {
    if (!highlightedRequestId || loading) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`request-set-${highlightedRequestId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [highlightedRequestId, loading, historySets]);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Helper for due date calculation using standardized Philippine time
  const getDueStatus = (dueDate, status) => {
    if (status === "returned" || status === "cancelled") return null;
    if (!dueDate) return null;

    const details = getDueStatusDetails(dueDate);
    return {
      label: details.label,
      style: details.badgeClass,
      isUrgent: details.isOverdue || details.isDueToday,
    };
  };

  // Status badge config
  const getStatusBadge = (status) => {
    switch (status) {
      case "released":
      case "borrowed":
        return {
          label: "Borrowed",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          dot: "bg-emerald-500 animate-pulse",
          icon: Book,
        };
      case "approved":
        return {
          label: "Ready for Pickup",
          color: "bg-blue-50 text-blue-700 border-blue-200/80",
          dot: "bg-blue-500",
          icon: CheckCircle2,
        };
      case "renewal_requested":
        return {
          label: "Renewal Pending",
          color: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
          dot: "bg-indigo-500 animate-pulse",
          icon: RefreshCw,
        };
      case "cancel_requested":
      case "cancellation_requested":
        return {
          label: "Cancellation Requested",
          color: "bg-amber-50 text-amber-800 border-amber-300/80",
          dot: "bg-amber-500 animate-pulse",
          icon: Clock,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "bg-slate-100 text-slate-500 border-slate-200/80",
          dot: "bg-slate-400",
          icon: XCircle,
        };
      case "returned":
        return {
          label: "Returned",
          color: "bg-slate-100 text-slate-600 border-slate-200/80",
          dot: "bg-slate-400",
          icon: CheckCircle2,
        };
      case "rejected":
        return {
          label: "Declined",
          color: "bg-rose-50 text-rose-700 border-rose-200/80",
          dot: "bg-rose-400",
          icon: XCircle,
        };
      case "pending":
      default:
        return {
          label: "Under Review",
          color: "bg-amber-50 text-amber-700 border-amber-200/80",
          dot: "bg-amber-400",
          icon: Hourglass,
        };
    }
  };

  // Filter Sets by Tab
  const filteredSets = (() => {
    let sets = historySets.filter((set) => {
      const activeStatuses = ["released", "borrowed", "approved", "renewal_requested"];
      const isSetActive = activeStatuses.includes(set.status) || set.items.some((i) => activeStatuses.includes(i.status));

      if (activeTab === "active") {
        return isSetActive;
      }
      if (activeTab === "returned") {
        return set.status === "returned" || (set.items.length > 0 && set.items.every((i) => i.status === "returned"));
      }
      if (activeTab === "requests") {
        return (
          set.status === "pending" ||
          set.status === "cancel_requested" ||
          set.status === "cancellation_requested" ||
          set.status === "rejected" ||
          set.status === "cancelled"
        );
      }
      return true;
    });

    // When arriving from Due Soon / Overdue badge, sort sets with urgent due dates first
    if (activeFilter === "overdue" || activeFilter === "dueSoon") {
      sets = [...sets].sort((a, b) => {
        const aStatus = getDueStatusDetails(a.dueDate);
        const bStatus = getDueStatusDetails(b.dueDate);
        const aUrgent =
          activeFilter === "overdue"
            ? aStatus.isOverdue ? -1 : 1
            : aStatus.isDueSoon || aStatus.isDueToday ? -1 : 1;
        const bUrgent =
          activeFilter === "overdue"
            ? bStatus.isOverdue ? -1 : 1
            : bStatus.isDueSoon || bStatus.isDueToday ? -1 : 1;
        return aUrgent - bUrgent;
      });
    }
    return sets;
  })();

  const activeCount = historySets.filter((set) => {
    const activeStatuses = ["released", "borrowed", "approved", "renewal_requested"];
    return activeStatuses.includes(set.status) || set.items.some((i) => activeStatuses.includes(i.status));
  }).length;

  const returnedCount = historySets.filter(
    (set) => set.status === "returned" || (set.items.length > 0 && set.items.every((i) => i.status === "returned"))
  ).length;

  const requestsCount = historySets.filter(
    (set) =>
      set.status === "pending" ||
      set.status === "cancel_requested" ||
      set.status === "cancellation_requested" ||
      set.status === "rejected" ||
      set.status === "cancelled"
  ).length;

  const handleBookClick = (title) => {
    onClose?.();
    navigate("/studentpage/search", {
      state: { query: title },
    });
  };

  return (
    <div className={isDrawer ? "w-full pb-6" : "mx-auto w-full max-w-[1280px] px-3 sm:px-5 lg:px-8 py-4 sm:py-6"}>
      {/* Compact Page Header (if full page) */}
      {!isDrawer && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Borrow History & Loan Sets
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review transaction sets, view books, and manage item-level cancellations.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
              <span className="font-black">{historySets.length}</span>
              <span className="opacity-70">Sets</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">
              <span className="font-black">{activeCount}</span>
              <span className="opacity-70">Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700">
              <span className="font-black">{returnedCount}</span>
              <span className="opacity-70">Returned</span>
            </div>
            <button
              onClick={() => navigate("/studentpage/search")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Search className="h-3.5 w-3.5" /> Browse Catalog
            </button>
          </div>
        </div>
      )}

      {/* Tab Switcher Bar */}
      <div
        className={`z-10 flex items-center justify-between gap-2 ${
          isDrawer
            ? "sticky -top-2 bg-[#F7FAFC]/95 backdrop-blur-md -mx-3 px-3 py-2 border-b border-slate-200/60 mb-3"
            : "mb-3 border-b border-slate-200 pb-2"
        }`}
      >
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg overflow-x-auto scrollbar-hide">
          {[
            { id: "all", label: "All Sets", count: historySets.length },
            { id: "active", label: "Active", count: activeCount },
            { id: "returned", label: "Returned", count: returnedCount },
            { id: "requests", label: "Requests", count: requestsCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                activeTab === tab.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-slate-100 text-slate-600" : "bg-slate-200/60 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          title="Refresh Borrow History"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Filter Banner — appears when arriving from Overdue / Due Soon badge */}
      {activeFilter && activeTab === "active" && (
        <div
          className={`mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
            activeFilter === "overdue"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {activeFilter === "overdue" ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> Showing overdue loans first
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" /> Showing due-soon loans first
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className="ml-auto p-0.5 rounded opacity-60 hover:opacity-100 transition"
            aria-label="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Content Body */}
      {loading && historySets.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={`hist-skel-${n}`} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="h-4 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-16 w-12 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No records found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
            {activeTab === "active"
              ? "You do not have any active loans or pickup passes."
              : activeTab === "returned"
              ? "No returned transactions recorded yet."
              : activeTab === "requests"
              ? "No pending borrowing requests under review."
              : "You haven't placed any book borrow requests yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate("/studentpage/search");
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
          >
            <Search className="h-3.5 w-3.5" />
            Explore Union Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSets.map((set) => {
            const isExpanded = expandedSetIds.has(set.requestId);
            const statusCfg = getStatusBadge(set.status);
            const dueStatus = getDueStatus(set.dueDate, set.status);
            const hasQR = Boolean(
              set.qrToken && (set.status === "approved" || set.status === "released" || set.status === "borrowed")
            );
            const nonCancelledCount = set.items.filter((i) => i.status !== "cancelled").length;
            const isHighlighted = String(set.requestId) === String(highlightedRequestId);

            return (
              <div
                key={`set-card-${set.requestId}`}
                id={`request-set-${set.requestId}`}
                className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-300 ${
                  isHighlighted
                    ? "border-blue-500 ring-4 ring-blue-500/25 animate-request-highlight"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* ─── SET HEADER / SUMMARY CARD ─── */}
                <div
                  onClick={() => toggleSetExpanded(set.requestId)}
                  className="cursor-pointer p-3 sm:p-4 hover:bg-slate-50/70 transition-colors select-none"
                >
                  {/* Top Bar: Status + Time + Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Set Status Pill */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${statusCfg.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>

                      {/* Due Alert Badge */}
                      {dueStatus && (
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${dueStatus.style}`}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {dueStatus.label}
                        </span>
                      )}

                      {/* Book count badge */}
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 border border-slate-200">
                        <Book className="h-2.5 w-2.5 text-blue-600" />
                        {set.booksCount} {set.booksCount === 1 ? "Book Set" : "Books Set"}
                      </span>

                      {/* Request Type badge */}
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 border border-blue-200/60">
                        {set.requestType === "INTER_SCHOOL" ? "Inter-School" : "Home Campus"}
                      </span>
                    </div>

                    {/* Exact PST Relative Timestamp */}
                    <span
                      className="shrink-0 text-[11px] text-slate-400 font-medium cursor-help"
                      title={formatPhilippineFullTooltip(set.requestDate)}
                    >
                      {formatSmartTime(set.requestDate)}
                    </span>
                  </div>

                  {/* Set Identity & Book Overview */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          Request #{set.requestId}
                        </h3>
                      </div>

                      {/* Books preview list */}
                      <p className="mt-1 text-xs text-slate-600 font-medium line-clamp-1">
                        {set.items.map((i) => i.title).join(" • ")}
                      </p>

                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 min-w-0">
                          <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate font-medium text-slate-600">{set.schoolName}</span>
                        </div>
                        {set.purpose && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[160px] text-slate-500 italic">
                              "{set.purpose}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail Stack Preview */}
                    <div className="flex items-center -space-x-3 shrink-0 pt-0.5">
                      {set.items.slice(0, 3).map((it, idx) => {
                        const coverUrl = getBookCoverUrl({ cover_image: it.coverImage, title: it.title, id: it.bookId });
                        return (
                          <div
                            key={`preview-thumb-${idx}`}
                            className="relative h-12 w-9 rounded-md overflow-hidden border border-white bg-slate-100 shadow-xs ring-1 ring-slate-200"
                          >
                            {coverUrl ? (
                              <img src={coverUrl} alt={it.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-400">
                                📖
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {set.items.length > 3 && (
                        <div className="flex h-12 w-8 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold text-white shadow-xs ring-1 ring-white">
                          +{set.items.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      {hasQR && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequestForQR(set.rawRequest);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
                        >
                          <QrCode className="h-3 w-3" />
                          Pickup QR Pass
                        </button>
                      )}

                      {set.status === "cancelled" && (
                        <span className="text-[10px] text-slate-400 italic">
                          This entire transaction set was cancelled.
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSetExpanded(set.requestId);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      <span>{isExpanded ? "Hide Books" : `View Books (${set.items.length})`}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* ─── EXPANDABLE BOOKS LIST (Collapsible Set Detail) ─── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Books in this Set ({nonCancelledCount} active of {set.items.length})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        You can cancel books individually below
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                      {set.items.map((item, idx) => {
                        const coverUrl = getBookCoverUrl({ cover_image: item.coverImage, title: item.title, id: item.bookId });
                        const itemStatusCfg = getStatusBadge(item.status);
                        const isCancelled = item.status === "cancelled";
                        const isReturned = item.status === "returned";
                        const isBorrowed = item.status === "borrowed" || item.status === "released";
                        const canCancel = !isCancelled && !isReturned && !isBorrowed;

                        return (
                          <div
                            key={`set-item-${item.itemId}-${idx}`}
                            className="p-3 transition-colors hover:bg-slate-50/60"
                          >
                            <div className="flex items-start gap-3">
                              {/* Book Cover Thumbnail */}
                              <div
                                onClick={() => handleBookClick(item.title)}
                                className="relative h-16 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-100 border border-slate-200 shadow-2xs"
                              >
                                {coverUrl ? (
                                  <img
                                    src={coverUrl}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                ) : null}
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                                  📖
                                </div>
                                <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/20 to-transparent" />
                              </div>

                              {/* Book Meta Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4
                                      onClick={() => handleBookClick(item.title)}
                                      className={`text-xs font-bold leading-snug cursor-pointer transition hover:text-blue-600 line-clamp-1 ${
                                        isCancelled ? "text-slate-400 line-through" : "text-slate-900"
                                      }`}
                                    >
                                      {item.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                      {item.author}
                                    </p>
                                  </div>

                                  {/* Item Status Pill */}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-bold border shrink-0 ${itemStatusCfg.color}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${itemStatusCfg.dot}`} />
                                    {itemStatusCfg.label}
                                  </span>
                                </div>

                                <div className="mt-1 flex items-center gap-2 text-[10.5px] text-slate-500">
                                  <span className="truncate">{item.schoolName}</span>
                                  {item.dueDate && isBorrowed && (
                                    <>
                                      <span>•</span>
                                      <span className="font-semibold text-amber-700">
                                        Due: {formatPhilippineDate(item.dueDate)}
                                      </span>
                                    </>
                                  )}
                                  {isReturned && item.returnedAt && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-400">
                                        Returned {formatPhilippineDate(item.returnedAt)}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Cancellation Audit Note if Cancelled */}
                                {isCancelled && (
                                  <div className="mt-1.5 flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] text-rose-700 border border-rose-100">
                                    <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                                    <span className="truncate">
                                      Cancelled item. {item.cancellationReason || "No longer requested."}
                                    </span>
                                  </div>
                                )}

                                {/* Individual Action Bar */}
                                <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => handleBookClick(item.title)}
                                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    View in Catalog →
                                  </button>

                                  <div className="flex items-center gap-2">
                                    {/* Individual Item Cancel Button */}
                                    {canCancel && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedReasonPreset("No longer needed for coursework / study");
                                          setCancellationCustomNote("");
                                          setCancellingItemId(cancellingItemId === item.itemId ? null : item.itemId);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition active:scale-95"
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        Cancel Book
                                      </button>
                                    )}

                                    {/* Renewal Action for Home Library Borrowed Books */}
                                    {isBorrowed && item.isHomeLibraryBook && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRenewalReason("");
                                          setRenewingRequestId(
                                            renewingRequestId === set.requestId ? null : set.requestId
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition active:scale-95"
                                      >
                                        <RefreshCw className="h-2.5 w-2.5" />
                                        Request Renewal
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* ─── INLINE ITEM CANCELLATION ACCORDION FORM ─── */}
                                {cancellingItemId === item.itemId && (
                                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-left space-y-2.5 shadow-xs animate-in slide-in-from-top-1 duration-150">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Cancel "{item.title}"</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setCancellingItemId(null)}
                                        className="rounded-md p-1 text-slate-400 hover:text-slate-600"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <p className="text-[10.5px] text-amber-800 leading-relaxed">
                                      Only this individual book will be cancelled. Any other books in Request #{set.requestId} will remain active.
                                    </p>

                                    <div className="space-y-1">
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                        Reason for cancellation:
                                      </label>
                                      <select
                                        value={selectedReasonPreset}
                                        onChange={(e) => setSelectedReasonPreset(e.target.value)}
                                        className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      >
                                        <option value="No longer needed for coursework / study">
                                          No longer needed for coursework / study
                                        </option>
                                        <option value="Borrowed another book instead">
                                          Borrowed another book instead
                                        </option>
                                        <option value="Schedule conflict / Cannot visit campus">
                                          Schedule conflict / Cannot visit campus
                                        </option>
                                        <option value="Requested by mistake">Requested by mistake</option>
                                        <option value="Found electronic / digital reference">
                                          Found electronic / digital reference
                                        </option>
                                      </select>
                                    </div>

                                    <div>
                                      <textarea
                                        rows={2}
                                        value={cancellationCustomNote}
                                        onChange={(e) => setCancellationCustomNote(e.target.value)}
                                        placeholder="Optional additional note for librarian..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                                      />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60">
                                      <button
                                        type="button"
                                        onClick={() => setCancellingItemId(null)}
                                        disabled={actionLoadingId === item.itemId}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                      >
                                        Keep Book
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelSingleItem(item, set)}
                                        disabled={actionLoadingId === item.itemId}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition active:scale-95 disabled:opacity-60"
                                      >
                                        {actionLoadingId === item.itemId ? (
                                          <>
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                            Cancelling...
                                          </>
                                        ) : (
                                          <>
                                            <Send className="h-3 w-3" />
                                            Confirm Cancel Book
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal for Librarian Counter Pickup */}
      {selectedRequestForQR && (
        <QRCodeDisplay
          request={selectedRequestForQR}
          token={selectedRequestForQR.qr_token}
          requestId={selectedRequestForQR.request_id}
          onClose={() => setSelectedRequestForQR(null)}
        />
      )}

      {/* Toast Notification */}
      {toastFeedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl transition-all duration-300 animate-slide-up border ${
            toastFeedback.type === "error"
              ? "bg-rose-600 text-white border-rose-700 shadow-rose-600/20"
              : "bg-slate-900 text-white border-slate-800 shadow-slate-900/30"
          }`}
        >
          {toastFeedback.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-200" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          )}
          <span>{toastFeedback.message}</span>
          <button
            type="button"
            onClick={() => setToastFeedback(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentHistory;
