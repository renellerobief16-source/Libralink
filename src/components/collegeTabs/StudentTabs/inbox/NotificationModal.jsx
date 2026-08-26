import { X, Book, Calendar, QrCode, User, Copy, CheckCircle, MapPin } from "lucide-react";
import QRCodeDisplay from "../QRCodeDisplay";

/**
 * NotificationModal component
 * Displays detailed notification information in a modal
 */
function NotificationModal({ notification, requestDetails, loading, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-[#0f172a]">{notification.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm leading-relaxed text-slate-700 mb-4">
            {notification.message}
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {requestDetails && !loading && (
            <RequestDetails requestDetails={requestDetails} />
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
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
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RequestDetails component
 * Displays detailed information about a borrow request
 */
function RequestDetails({ requestDetails }) {
  const hasOtherSchoolItems = requestDetails.items?.some(
    (item) => item.owner_school_id !== requestDetails.home_school_id
  );

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <h4 className="font-semibold text-sm text-[#0f172a] mb-3 flex items-center gap-2">
        <Book className="w-4 h-4 text-blue-600" />
        Request Details
      </h4>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Request ID</p>
            <p className="text-sm font-medium text-slate-800">
              {requestDetails.request_id}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <QrCode className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-slate-500">QR Token</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800 font-mono">
                {requestDetails.qr_token || "N/A"}
              </p>
              {requestDetails.qr_token && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(requestDetails.qr_token);
                    alert("QR Token copied to clipboard!");
                  }}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  title="Copy QR Token"
                  aria-label="Copy QR Token"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
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

      <div className="bg-gray-50 rounded-xl p-6 mb-4 border border-gray-200">
        <div className="bg-white rounded-lg p-4 flex items-center justify-center">
          {requestDetails.qr_token ? (
            <QRCodeDisplay
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
