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
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, {
  getBackendAssetUrl,
  cancelBorrowRequest,
  requestBorrowCancellation,
} from "../../../utils/api";
import QRCodeDisplay from "./QRCodeDisplay";

function StudentHistory({ isDrawer = false, onClose }) {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'returned' | 'requests'
  const [selectedRequestForQR, setSelectedRequestForQR] = useState(null);

  // Cancellation States (Inline Accordion, No Overlay)
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [selectedReasonPreset, setSelectedReasonPreset] = useState("No longer needed for coursework / study");
  const [cancellationCustomNote, setCancellationCustomNote] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastFeedback, setToastFeedback] = useState(null);

  const showToast = (message, type = "success") => {
    setToastFeedback({ message, type });
    setTimeout(() => setToastFeedback(null), 4500);
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

      // Flatten and normalize request items
      const normalized = requests.flatMap((req) => {
        const rawItems =
          Array.isArray(req.items) && req.items.length > 0
            ? req.items
            : [{}];

        return rawItems.map((item, idx) => {
          const bookTitle =
            item.book?.title || item.title || item.book_title || "Academic Material";
          const bookAuthor =
            item.book?.author || item.author || "Academic Research";
          const coverImage = item.book?.cover_image || null;
          const schoolName =
            item.owner_school?.school_name ||
            item.owner_school_name ||
            req.home_school?.school_name ||
            "Main Library";

          const reqStatus = (req.status || "pending").toLowerCase();
          const itemStatus = (item.status || "").toLowerCase();
          // If parent request is cancelled or cancellation_requested, that takes precedence
          const rawStatus = (reqStatus === "cancelled" || reqStatus === "cancellation_requested" || !itemStatus)
            ? reqStatus
            : itemStatus;

          return {
            id: `${req.request_id}_${item.item_id || idx}`,
            requestId: req.request_id,
            bookId: item.book_id || item.book?.id,
            title: bookTitle,
            author: bookAuthor,
            coverImage: coverImage,
            schoolName: schoolName,
            status: rawStatus,
            cancellationReason: req.cancellation_reason || item.cancellation_reason || null,
            requestType: req.request_type || "HOME",
            requestDate: req.created_at,
            dueDate: req.due_date || item.due_date,
            returnedAt: req.returned_at || item.returned_at,
            qrToken: req.qr_token,
            rawRequest: req,
          };
        });
      });

      setHistoryItems(normalized);
    } catch (err) {
      console.error("Error fetching student borrow history:", err);
      setError("Unable to load borrowing history. Please try again.");
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Helper for due date calculation
  const getDueStatus = (dueDate, status) => {
    if (status === "returned") return null;
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const now = new Date();
    // Normalize to midnight for fair day comparison
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue by ${Math.abs(diffDays)}d`,
        style: "bg-rose-50 text-rose-700 border-rose-200",
        isUrgent: true,
      };
    }
    if (diffDays === 0) {
      return {
        label: "Due Today",
        style: "bg-amber-50 text-amber-700 border-amber-200",
        isUrgent: true,
      };
    }
    if (diffDays === 1) {
      return {
        label: "Due Tomorrow",
        style: "bg-amber-50 text-amber-700 border-amber-200",
        isUrgent: false,
      };
    }
    return {
      label: `Due in ${diffDays}d`,
      style: "bg-blue-50 text-blue-700 border-blue-200",
      isUrgent: false,
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

  // Filter items
  const filteredItems = historyItems.filter((item) => {
    if (activeTab === "active") {
      return item.status === "released" || item.status === "borrowed" || item.status === "approved";
    }
    if (activeTab === "returned") {
      return item.status === "returned";
    }
    if (activeTab === "requests") {
      return (
        item.status === "pending" ||
        item.status === "cancel_requested" ||
        item.status === "cancellation_requested" ||
        item.status === "rejected" ||
        item.status === "cancelled"
      );
    }
    return true;
  });

  const activeCount = historyItems.filter(
    (item) => item.status === "released" || item.status === "borrowed" || item.status === "approved"
  ).length;

  const returnedCount = historyItems.filter((item) => item.status === "returned").length;

  const requestsCount = historyItems.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "cancel_requested" ||
      item.status === "cancellation_requested" ||
      item.status === "rejected" ||
      item.status === "cancelled"
  ).length;

  // Submission of cancellation request for librarian review (applies to both pending and approved)
  const handleSubmitCancellation = async (item) => {
    if (!item) return;

    const combinedReason = cancellationCustomNote.trim()
      ? `${selectedReasonPreset}: ${cancellationCustomNote.trim()}`
      : selectedReasonPreset;

    setActionLoadingId(item.id);
    try {
      const res = await requestBorrowCancellation(item.requestId, combinedReason);
      if (res.error) {
        showToast(res.error?.response?.data?.message || "Failed to submit cancellation request", "error");
      } else {
        showToast("Cancellation request submitted! Library staff has been notified to review and confirm.");
        setCancellingRequestId(null);
        setCancellationCustomNote("");
        await fetchHistory();
      }
    } catch (err) {
      console.error("Error submitting cancellation request:", err);
      showToast("An unexpected error occurred.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBookClick = (title) => {
    onClose?.();
    navigate("/studentpage/search", {
      state: { query: title },
    });
  };

  return (
    <div className={isDrawer ? "w-full pb-6" : "mx-auto w-full max-w-[1280px] px-3 sm:px-5 lg:px-8 py-4 sm:py-6"}>
      {/* Standalone Page Header */}
      {!isDrawer && (
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
                Reading Activity
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Borrow History
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your borrowed books, pickup passes, and completed returns.
            </p>
          </div>

          <button
            onClick={() => navigate("/studentpage/search")}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]"
          >
            <Search className="h-3.5 w-3.5" /> Borrow New Book
          </button>
        </header>
      )}

      {/* Sticky Tab Switcher Bar */}
      <div className={`z-10 flex items-center justify-between gap-1.5 ${
        isDrawer
          ? "sticky -top-2 bg-[#F7FAFC]/95 backdrop-blur-md -mx-3 px-3 py-2 border-b border-slate-200/60 mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
          : "mb-3 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-hide"
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            All ({historyItems.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              activeTab === "active"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            Active ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("returned")}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              activeTab === "returned"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            Returned ({returnedCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              activeTab === "requests"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            Requests ({requestsCount})
          </button>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          title="Refresh History"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Content */}
      {loading && historyItems.length === 0 ? (
        <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          {[1, 2, 3].map((n) => (
            <div key={`hist-skel-${n}`} className="flex items-start gap-3 py-3 animate-pulse">
              <div className="h-[76px] w-[52px] shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">Failed to load history</h3>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {historyItems.length === 0 ? "No borrowing history yet" : `No ${activeTab} records`}
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
            {historyItems.length === 0
              ? "When you request and borrow books from campus libraries, your activity timeline will appear here."
              : "No books match the selected filter."}
          </p>
          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate("/studentpage/search");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            Find Books to Borrow <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Horizon Line History List */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="divide-y divide-slate-200/80">
            {filteredItems.map((item) => {
              const statusCfg = getStatusBadge(item.status);
              const dueStatus = getDueStatus(item.dueDate, item.status);
              const coverUrl = getBackendAssetUrl(item.coverImage);
              const hasQR = Boolean(item.qrToken && (item.status === "approved" || item.status === "released" || item.status === "borrowed"));

              return (
                <div
                  key={`hist-row-${item.id}`}
                  className="group relative flex flex-col transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Left: Real Book Cover or Grey Libralink Fallback */}
                  <div
                    onClick={() => handleBookClick(item.title)}
                    className="relative h-[78px] w-[54px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-100 shadow-2xs transition-transform duration-200 group-hover:scale-105 border border-slate-200/80"
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover z-[1]"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : null}

                    {/* Fallback with Grey L.png */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-slate-100 z-0 select-none"
                    >
                      <img
                        src="/L.png"
                        alt="Libralink"
                        className="h-7 w-7 object-contain grayscale opacity-35"
                      />
                      <span className="mt-1 text-center text-[6px] font-semibold text-slate-400 line-clamp-1">
                        Libralink
                      </span>
                    </div>

                    {/* 3D Spine Crease */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent" />
                  </div>

                  {/* Middle: Details */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
                    <div>
                      {/* Status + Due Alert Row */}
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold border ${statusCfg.color}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>

                        {dueStatus && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] font-bold border ${dueStatus.style}`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {dueStatus.label}
                          </span>
                        )}

                        {item.status === "returned" && item.returnedAt && (
                          <span className="text-[8.5px] font-medium text-slate-400">
                            Returned {new Date(item.returnedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => handleBookClick(item.title)}
                        className="line-clamp-2 cursor-pointer text-xs font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors"
                      >
                        {item.title}
                      </h3>

                      {/* Author */}
                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                        {item.author}
                      </p>
                    </div>

                    {/* Meta Row: Library + Request ID + Actions */}
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1 min-w-0 max-w-[170px]">
                        <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="truncate font-medium text-slate-600">
                          {item.schoolName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Cancel Request Button */}
                        {item.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReasonPreset("No longer needed for coursework / study");
                              setCancellationCustomNote("");
                              setCancellingRequestId(cancellingRequestId === item.requestId ? null : item.requestId);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100 transition active:scale-95"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Cancel Request
                          </button>
                        )}

                        {/* Cancel Hold Button */}
                        {(item.status === "approved" || item.status === "ready") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReasonPreset("No longer needed for coursework / study");
                              setCancellationCustomNote("");
                              setCancellingRequestId(cancellingRequestId === item.requestId ? null : item.requestId);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100 transition active:scale-95"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Cancel Hold
                          </button>
                        )}

                        {/* QR Code Pass */}
                        {hasQR && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRequestForQR({
                                request_id: item.requestId,
                                book_title: item.title,
                                school_name: item.schoolName,
                                pickup_code: item.pickupCode,
                                pickup_deadline: item.pickupDeadline,
                                qr_token: item.qrToken || item.pickupCode || item.requestId,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition active:scale-95"
                          >
                            <QrCode className="h-2.5 w-2.5" />
                            QR Pass
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => handleBookClick(item.title)}
                          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                          View
                          <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Accordion Cancellation Form (No Full-Screen Overlay) */}
                {cancellingRequestId === item.requestId && (
                  <div className="mx-3 mb-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold">Cancel Borrow Request</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({item.requestId})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCancellingRequestId(null)}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-amber-200/80 bg-amber-100/60 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                      <strong>Librarian Confirmation Required:</strong> Submitting this cancellation notifies the librarian to confirm and restock the copy back into available inventory.
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Select Reason for Cancellation:
                      </label>
                      {[
                        "No longer needed for coursework / study",
                        "Found another copy or digital resource",
                        "Schedule conflict / Unable to pick up from library",
                        "Requested by mistake / Duplicate request",
                        "Other reason",
                      ].map((reason) => (
                        <label
                          key={reason}
                          className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium cursor-pointer transition ${
                            selectedReasonPreset === reason
                              ? "border-amber-400 bg-white text-amber-900 shadow-2xs"
                              : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`cancellationReason-${item.requestId}`}
                            value={reason}
                            checked={selectedReasonPreset === reason}
                            onChange={(e) => setSelectedReasonPreset(e.target.value)}
                            className="text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                          />
                          <span>{reason}</span>
                        </label>
                      ))}
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={cancellationCustomNote}
                        onChange={(e) => setCancellationCustomNote(e.target.value)}
                        placeholder="Additional note for library staff (Optional)..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                      <button
                        type="button"
                        onClick={() => setCancellingRequestId(null)}
                        disabled={actionLoadingId === item.id}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Keep Reservation
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitCancellation(item)}
                        disabled={actionLoadingId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition active:scale-95 disabled:opacity-60"
                      >
                        {actionLoadingId === item.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3" />
                            Submit Cancellation Request
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* QR Code Modal for Librarian Counter Pickup */}
      {selectedRequestForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <QRCodeDisplay
              request={selectedRequestForQR}
              token={selectedRequestForQR.qr_token}
              requestId={selectedRequestForQR.request_id}
              onClose={() => setSelectedRequestForQR(null)}
            />
          </div>
        </div>
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
