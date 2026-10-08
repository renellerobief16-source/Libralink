import { useEffect, useState, useMemo } from "react";
import {
  X,
  Book,
  Calendar,
  QrCode,
  User,
  Copy,
  CheckCircle,
  MapPin,
  ArrowLeft,
  Clock,
  BookOpen,
  Check,
  AlertTriangle,
  Shield,
  Sparkles,
  Package,
  Download,
} from "lucide-react";
import QRCode from "qrcode";
import QRCodeDisplay from "../QRCodeDisplay";
import { formatPhilippineDate, formatPhilippineDateTime } from "../../../../utils/timeUtils";

/**
 * NotificationModal component
 * Displays detailed notification information in an edge-to-edge full-screen fill view
 */
function NotificationModal({ notification, requestDetails, loading, onClose, onViewHistory }) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [returnQrDataUrl, setReturnQrDataUrl] = useState(null);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const notifType = String(notification?.type || "").toLowerCase();
  const notifTitle = String(notification?.title || "").toLowerCase();
  const notifMsg = String(notification?.message || "").toLowerCase();

  const isDueOrOverdue =
    notifType.includes("due") ||
    notifType.includes("overdue") ||
    notifTitle.includes("due") ||
    notifTitle.includes("overdue");

  // A notification is a Return QR pass if it represents a borrowed / released book or explicit return alert
  const isReturnQr =
    notifType === "return_qr_ready" ||
    notifType === "book_borrowed" ||
    notifType === "book_released" ||
    notifType === "borrowed" ||
    requestDetails?.status === "borrowed" ||
    notifTitle.includes("borrowed") ||
    notifMsg.includes("released at the counter") ||
    notifMsg.includes("return due date");

  const isApproved =
    !isReturnQr &&
    (requestDetails?.status === "approved" ||
      notifTitle.includes("approved") ||
      notifType.includes("approved"));

  // Resolve QR token for return pass
  const returnToken = useMemo(() => {
    return (
      requestDetails?.qr_token ||
      requestDetails?.items?.find((it) => it.qr_token)?.qr_token ||
      (notification?.message?.match(/LL-[\w-]+/) || [])[0] ||
      requestDetails?.request_id ||
      (notification?.related_id ? `LL-${notification.related_id}` : null)
    );
  }, [requestDetails, notification]);

  // Resolve Due Date Display
  const dueDateDisplay = useMemo(() => {
    if (requestDetails?.due_date) {
      return formatPhilippineDate(requestDetails.due_date);
    }
    const itemDue = requestDetails?.items?.find((it) => it.due_date)?.due_date;
    if (itemDue) {
      return formatPhilippineDate(itemDue);
    }
    const match = notification?.message?.match(/Return Due Date:\s*([^.\n]+)/i);
    if (match) {
      return match[1].trim();
    }
    return null;
  }, [requestDetails, notification]);

  // Resolve Book Title Display
  const bookTitleDisplay = useMemo(() => {
    if (requestDetails?.items?.length) {
      const titles = requestDetails.items
        .map((it) => it.book?.title || it.book_title || it.title)
        .filter(Boolean);
      if (titles.length > 0) return [...new Set(titles)].join(", ");
    }
    const match = notification?.message?.match(/"([^"]+)"/);
    if (match) {
      return match[1];
    }
    return null;
  }, [requestDetails, notification]);

  // Generate QR image for Return Pass
  useEffect(() => {
    if (!isReturnQr) return;
    const token = returnToken;
    if (token) {
      QRCode.toDataURL(token, {
        width: 260,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "H",
      })
        .then(setReturnQrDataUrl)
        .catch(() => setReturnQrDataUrl(null));
    }
  }, [isReturnQr, returnToken]);

  const handleCopyQRToken = (token) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!returnQrDataUrl) return;
    const link = document.createElement("a");
    link.href = returnQrDataUrl;
    link.download = `Return_Pass_${returnToken || "Book"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-white overflow-hidden select-text">
      {/* ─── Sticky Top Header ─── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/90 px-3 sm:px-4 bg-white/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-2xs cursor-pointer shrink-0"
            aria-label="Back to Notifications"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Back to Inbox</span>
          </button>

          {isApproved && (
            <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>Approved Pass</span>
            </span>
          )}

          {isReturnQr && (
            <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <QrCode className="w-3 h-3 text-blue-600" />
              <span>Return Pass</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* ─── Scrollable Body ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/70 p-3.5 sm:p-5 scrollbar-thin">
        <div className="max-w-xl mx-auto w-full space-y-3.5">
          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-xs text-slate-500 font-medium">Loading borrow request details…</p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* APPROVED DIGITAL PASS LAYOUT (Clean, No Nested Clutter)       */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {isApproved && requestDetails && !loading && (
            <>
              {/* Status & Request ID Hero Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Ready for Counter Pickup</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>{requestDetails?.request_type === "INTER_SCHOOL" ? "Inter-School" : "Home Library"}</span>
                  </span>
                </div>

                {/* Request ID Display - Clean Single Line (No Wrapping) */}
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      Request ID
                    </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-slate-900 tracking-wide select-all whitespace-nowrap">
                      {requestDetails.request_id || "LL-PASS"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyQRToken(requestDetails.request_id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 active:scale-95 transition shadow-2xs cursor-pointer shrink-0"
                    title="Copy Request ID"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Show this branded digital pass to the circulation desk librarian for book release and counter verification.
                </p>
              </div>

              {/* Centered QR Pass Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <QRCodeDisplay
                  request={requestDetails}
                  token={requestDetails.qr_token}
                  requestId={requestDetails.request_id || "LL-PASS"}
                  compact={true}
                />
              </div>

              {/* Books Included & Due Date Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Books Included ({requestDetails.items?.length || 1})</span>
                  </h4>
                  {requestDetails.due_date && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      Due: {formatPhilippineDate(requestDetails.due_date)}
                    </span>
                  )}
                </div>

                {/* Book Items List */}
                <div className="space-y-2">
                  {requestDetails.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <Book className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {item.book?.title || item.book_title || item.title || "Unknown Book"}
                        </p>
                        {(item.owner_school?.school_name || item.owner_school_name || item.partner_school?.school_name || item.partner_school_name) && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{item.owner_school?.school_name || item.owner_school_name || item.partner_school?.school_name || item.partner_school_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {requestDetails.created_at && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Date Submitted</span>
                    <span className="font-medium text-slate-600">{formatPhilippineDate(requestDetails.created_at)}</span>
                  </div>
                )}
              </div>

              {/* Security & Verification Reminder */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs">
                  <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Verification Protocol</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                  <li>Please present your <strong>Physical Student ID Card</strong> at the counter.</li>
                  <li>This pass securely switches to <em>Active Loan</em> status upon physical book release.</li>
                </ul>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RETURN QR CODE LAYOUT (Official Book Return Pass)             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {isReturnQr && (
            <>
              {/* Notification Message Card (matches inbox notification details) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(notification.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(notification.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <span className="rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">
                    {notification.type?.replace(/_/g, " ") || "BOOK BORROWED"}
                  </span>
                </div>

                <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-medium break-words">
                  {notification.message}
                </p>
              </div>

              {/* Official Book Return QR Pass Card */}
              <div className="rounded-2xl border border-blue-200/90 bg-white p-4 sm:p-5 shadow-2xs flex flex-col items-center gap-4">
                {/* Header Row */}
                <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                      <QrCode className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 truncate">
                        Official Book Return Pass
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        Scan at circulation counter when returning
                      </p>
                    </div>
                  </div>

                  {dueDateDisplay && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg shrink-0">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Due: {dueDateDisplay}</span>
                    </span>
                  )}
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs w-full max-w-xs">
                  {returnQrDataUrl ? (
                    <img
                      src={returnQrDataUrl}
                      alt="Official Book Return QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl border border-slate-200 bg-white p-2 shadow-2xs object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-white p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-xs text-slate-400 font-medium text-center">Generating Return QR…</p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2 font-medium text-center">
                    Present this scannable QR pass to the librarian
                  </p>
                </div>

                {/* Return Token Row */}
                {returnToken && (
                  <div className="w-full flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                        Return Token / Pass ID
                      </span>
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 tracking-wide select-all truncate block">
                        {returnToken}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyQRToken(returnToken)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 active:scale-95 transition shadow-2xs cursor-pointer"
                        title="Copy Return Token"
                      >
                        {copiedToken ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {returnQrDataUrl && (
                        <button
                          type="button"
                          onClick={handleDownloadQR}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 active:scale-95 transition shadow-2xs cursor-pointer"
                          title="Download QR Image"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden xs:inline">Save</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Borrowed Book Summary Card */}
              {bookTitleDisplay && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Borrowed Book</span>
                  </h4>
                  <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Book className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-snug break-words">
                        {bookTitleDisplay}
                      </p>
                      {requestDetails?.request_id && (
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Request ID: {requestDetails.request_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Library Return Guidelines */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs">
                  <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Library Return Guidelines</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Visit the library circulation desk counter on or before the due date.</li>
                  <li>Show this <strong>Return QR Code</strong> to the librarian for instant check-in.</li>
                  <li>Please bring your physical Student ID for verification.</li>
                  <li>Ensure the book is in good physical condition with intact spine and accession tags.</li>
                </ul>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STANDARD NOTIFICATION / NON-APPROVED LAYOUT                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {!isApproved && !isReturnQr && (
            <>
              {/* Notification Message Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(notification.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(notification.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {notification.type && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-600">
                      {notification.type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-medium break-words">
                  {notification.message}
                </p>
              </div>

              {/* Dedicated Alert Card for Due Reminders & Overdue */}
              {isDueOrOverdue && (
                <div className="p-4 rounded-2xl border bg-amber-50/90 border-amber-200 text-amber-950 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Circulation Reminder Guidelines
                    </h4>
                  </div>
                  <ul className="text-xs space-y-1.5 text-amber-900 list-disc list-inside">
                    <li>Visit the circulation desk at your campus library counter before the closing hours.</li>
                    <li>Bring your physical Student ID / Library Card when returning or requesting an extension/renewal.</li>
                    <li>Ensure the book is in good physical condition with intact barcode/accession tags.</li>
                  </ul>
                </div>
              )}

              {/* Request Details Card for Non-Approved */}
              {requestDetails && !loading && (
                <RequestDetails
                  requestDetails={requestDetails}
                  onCopyToken={handleCopyQRToken}
                  copiedToken={copiedToken}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Sticky Bottom Action Bar ─── */}
      <div className="flex items-center justify-between gap-2.5 border-t border-slate-200 px-4 py-3 bg-white z-20 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition text-center cursor-pointer shadow-2xs"
        >
          Close
        </button>

        {(requestDetails?.request_id || returnToken) && (
          <button
            type="button"
            onClick={onViewHistory}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">View in Borrow History</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * RequestDetails component
 * Displays detailed information about a borrow request
 */
function RequestDetails({ requestDetails, onCopyToken, copiedToken }) {
  const hasOtherSchoolItems = requestDetails.items?.some(
    (item) => item.owner_school_id !== requestDetails.home_school_id
  );

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      <h4 className="font-bold text-sm text-[#0f172a] flex items-center gap-2 pb-2 border-b border-slate-100">
        <Book className="w-4 h-4 text-indigo-600" />
        <span>Request Details</span>
      </h4>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Request ID</p>
            <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
              {requestDetails.request_id}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <QrCode className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">QR Token</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="min-w-0 break-all text-sm font-bold text-slate-800 font-mono">
                {requestDetails.qr_token || "N/A"}
              </p>
              {requestDetails.qr_token && (
                <button
                  type="button"
                  onClick={() => onCopyToken && onCopyToken(requestDetails.qr_token)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 active:scale-95 transition"
                  title="Copy QR Token"
                  aria-label="Copy QR Token"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {requestDetails.due_date && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Due Date</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatPhilippineDate(requestDetails.due_date)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Date Submitted</p>
            <p className="text-sm font-medium text-slate-800">
              {formatPhilippineDate(requestDetails.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                requestDetails.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : requestDetails.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : requestDetails.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
              }`}
            >
              {requestDetails.status.charAt(0).toUpperCase() +
                requestDetails.status.slice(1)}
            </span>
          </div>
        </div>

        {requestDetails.items && requestDetails.items.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">Books Requested</p>
            <div className="space-y-2">
              {requestDetails.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg"
                >
                  <Book className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.book?.title || item.book_title || item.title || "Unknown Book"}
                    </p>
                    {(item.owner_school?.school_name || item.owner_school_name || item.partner_school?.school_name || item.partner_school_name) && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.owner_school?.school_name || item.owner_school_name || item.partner_school?.school_name || item.partner_school_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requestDetails.status === "approved" && (
          <BorrowingRequirements requestDetails={requestDetails} hasOtherSchoolItems={hasOtherSchoolItems} />
        )}
      </div>
    </div>
  );
}

/**
 * BorrowingRequirements component
 * Displays QR code and borrowing requirements
 */
function BorrowingRequirements({ requestDetails, hasOtherSchoolItems }) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <h4 className="font-semibold text-sm text-[#0f172a] mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Your QR Code
      </h4>

      <div className="mb-4 bg-transparent p-0">
        <div className="flex items-center justify-center bg-transparent p-0">
          {requestDetails.qr_token ? (
            <QRCodeDisplay
              request={requestDetails}
              token={requestDetails.qr_token}
              requestId={requestDetails.request_id || "LL-2026-000001"}
              compact={true}
            />
          ) : (
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                <Book className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                QR Code will be generated by librarian
              </p>
            </div>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-sm text-[#0f172a] mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Borrowing Requirements
      </h4>

      {hasOtherSchoolItems ? (
        <PartnerSchoolRequirements />
      ) : (
        <HomeSchoolRequirements />
      )}
    </div>
  );
}

/**
 * PartnerSchoolRequirements component
 * Requirements for borrowing from partner schools
 */
function PartnerSchoolRequirements() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <span className="text-orange-600 font-bold text-sm">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Library Use Only
          </p>
          <p className="text-xs text-slate-600">
            Books from partner schools must be used within the library
            premises only. Cannot be taken out.
          </p>
        </div>
      </div>

      {[
        { num: 1, title: "QR Code", desc: "Present your generated QR code at the partner school library" },
        { num: 2, title: "School ID", desc: "Bring your valid school identification card" },
        { num: 3, title: "Permission Letter", desc: "Present the signed permission letter from your home school librarian" },
        { num: 4, title: "Follow Instructions", desc: "Complete the step-by-step borrowing process at the partner school" },
      ].map((step) => (
        <div key={step.num} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-bold text-sm">{step.num}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{step.title}</p>
            <p className="text-xs text-slate-600">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * HomeSchoolRequirements component
 * Requirements for borrowing from home school
 */
function HomeSchoolRequirements() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <span className="text-green-600 font-bold text-sm">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Borrowing Period
          </p>
          <p className="text-xs text-slate-600">
            Books must be returned within the specified borrowing period.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <User className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-800">
            School ID Required
          </p>
          <p className="text-xs text-slate-600">
            Please bring your valid school identification card to the
            library to pick up your books.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;
