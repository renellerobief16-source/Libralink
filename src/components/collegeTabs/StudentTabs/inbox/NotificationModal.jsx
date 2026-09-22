import { useEffect, useState } from "react";
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
} from "lucide-react";
import QRCodeDisplay from "../QRCodeDisplay";

/**
 * NotificationModal component
 * Displays detailed notification information in an edge-to-edge full-screen fill view
 */
function NotificationModal({ notification, requestDetails, loading, onClose, onViewHistory }) {
  const [copiedToken, setCopiedToken] = useState(false);

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

  const handleCopyQRToken = (token) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const isDueOrOverdue =
    String(notification.type || "").toLowerCase().includes("due") ||
    String(notification.type || "").toLowerCase().includes("overdue");

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-white overflow-hidden select-text">
      {/* ─── Sticky Top Header ─── */}
      <div className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-6 bg-white/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-2xs"
            aria-label="Back to Notifications"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Back to Inbox</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="min-w-0">
            <h3 className="truncate text-sm sm:text-base font-bold text-slate-900 leading-tight">
              {notification.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
            <span className="hidden md:inline text-[10px] text-slate-400 font-mono ml-0.5">(Esc)</span>
          </button>
        </div>
      </div>

      {/* ─── Scrollable Body ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 scrollbar-thin">
        <div className="max-w-2xl mx-auto w-full space-y-4">
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

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs text-slate-500 font-medium">Loading borrow request details…</p>
            </div>
          )}

          {/* Request Details Card */}
          {requestDetails && !loading && (
            <RequestDetails
              requestDetails={requestDetails}
              onCopyToken={handleCopyQRToken}
              copiedToken={copiedToken}
            />
          )}
        </div>
      </div>

      {/* ─── Sticky Bottom Action Bar ─── */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 sm:px-6 py-3.5 bg-white z-20 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 truncate">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            Received {new Date(notification.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition text-center"
          >
            Close
          </button>

          {requestDetails?.request_id && (
            <button
              type="button"
              onClick={onViewHistory}
              className="flex-[2] sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">View in Borrow History</span>
            </button>
          )}
        </div>
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
              <p className="text-sm font-medium text-slate-800">
                {new Date(requestDetails.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Date Submitted</p>
            <p className="text-sm font-medium text-slate-800">
              {new Date(requestDetails.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
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
