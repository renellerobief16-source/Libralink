import { useState, useEffect } from "react";
import {
  Book,
  User,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  ChevronLeft,
  ShieldCheck,
  Building2,
  Calendar,
  UploadCloud,
  Maximize2,
  Edit2,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  GraduationCap,
  BadgeCheck,
  Eye,
} from "lucide-react";
import { useNotifications } from "../../../context/NotificationContext";
import api, { getBackendAssetUrl, getBookById } from "../../../utils/api";
import CartBookCover from "./CartBookCover";
import BookDetailsModal from "../../common/BookDetailsModal";

const PURPOSE_PRESETS = [
  "Academic Study & Research",
  "Thesis & Capstone Project",
  "Coursework & Class Assignment",
  "Exam & Licensure Review",
  "General Reading",
];

function getSafeImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return getBackendAssetUrl(path);
}

function StudentBorrowingForm({
  borrowingList = [],
  onSubmit,
  onCancel,
  onClose,
  userData: propUserData,
  compact = false,
}) {
  const { addNotification } = useNotifications();
  const handleCancelClick = onCancel || onClose;

  // 1. Resolve student patron profile
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      const parsed = stored ? JSON.parse(stored) : null;
      return { ...(parsed || {}), ...(propUserData || {}) };
    } catch {
      return propUserData || {};
    }
  });

  // 2. Resolve scanned ID card picture
  const [idCardUrl, setIdCardUrl] = useState(() => {
    const uId = profile?.user_id || profile?.id || localStorage.getItem("currentUserId");
    const cachedIdCard = uId ? localStorage.getItem(`libralink_id_card_${uId}`) : null;
    const raw = profile?.id_card_picture || cachedIdCard || "";
    return raw ? getSafeImageUrl(raw) : "";
  });

  const [zoomIdModal, setZoomIdModal] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Form Fields
  const [contactNumber, setContactNumber] = useState(
    profile?.contact_number || profile?.contactNumber || profile?.cellphone || ""
  );
  const [address, setAddress] = useState(
    profile?.address || localStorage.getItem("studentAddress") || ""
  );
  const [selectedPurpose, setSelectedPurpose] = useState("Academic Study & Research");
  const [customPurposeNote, setCustomPurposeNote] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Fallback manual upload if no ID card is on file
  const [fallbackFile, setFallbackFile] = useState(null);
  const [fallbackPreview, setFallbackPreview] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Live profile synchronization on mount
  useEffect(() => {
    let isMounted = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (!isMounted || !res?.data?.user) return;
        const liveUser = res.data.user;
        setProfile((prev) => ({ ...prev, ...liveUser }));

        if (liveUser.contact_number && !contactNumber) {
          setContactNumber(liveUser.contact_number);
        }
        if (liveUser.address && !address) {
          setAddress(liveUser.address);
        }

        const liveCard = liveUser.id_card_picture;
        if (liveCard) {
          const formatted = getSafeImageUrl(liveCard);
          setIdCardUrl(formatted);
          const uId = liveUser.user_id || liveUser.id;
          if (uId) {
            try {
              localStorage.setItem(`libralink_id_card_${uId}`, formatted);
            } catch (_) {}
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const studentFullName =
    profile?.name ||
    `${profile?.first_name || profile?.firstname || ""} ${
      profile?.last_name || profile?.lastname || ""
    }`.trim() ||
    "Student Borrower";

  const studentNumber =
    profile?.student_number || profile?.studentNumber || profile?.user_id || "N/A";
  const studentCourse =
    profile?.course || profile?.program || profile?.department || "Undergraduate Studies";
  const studentCampus =
    profile?.school_name || profile?.schoolName || profile?.school_code || "Main Campus Library";

  const handleOpenBookDetails = async (bookItem) => {
    if (!bookItem) return;
    const resolvedId = Number(bookItem.book_id || bookItem.id);
    setSelectedBookForDetails(bookItem);

    if (resolvedId && !isNaN(resolvedId)) {
      try {
        const { data } = await getBookById(resolvedId);
        if (data) {
          setSelectedBookForDetails((prev) => ({ ...(prev || {}), ...data }));
        }
      } catch (err) {
        console.warn("Could not load full book details for preview:", err);
      }
    }
  };

  const handleManualImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file (PNG, JPG, WebP).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image must be smaller than 5MB.");
        return;
      }
      setFallbackFile(file);
      setFallbackPreview(URL.createObjectURL(file));
      setErrorMessage("");
    }
  };

  const handleSubmitCheckout = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    if (!agreedToTerms) {
      setErrorMessage("Please confirm and accept the library borrowing policy.");
      return;
    }

    if (!borrowingList || borrowingList.length === 0) {
      setErrorMessage("Your checkout list is empty. Please select at least one book.");
      return;
    }

    // Resolve book items
    const items = borrowingList.map((item) => {
      const rawId = item.book_id ?? item.id ?? item.book?.id ?? item.book?.book_id;
      return {
        book_id: Number(rawId),
        owner_school_id: Number(item.owner_school_id || item.school_id),
        partner_school_id: item.partner_school_id ? Number(item.partner_school_id) : null,
        borrow_type: item.borrow_type || "HOME",
      };
    });

    const hasInvalid = items.some(
      (it) => !it.book_id || isNaN(it.book_id) || it.book_id <= 0
    );
    if (hasInvalid) {
      setErrorMessage("One or more selected books have invalid ID data. Please refresh and try again.");
      return;
    }

    const hasInterSchoolItems = items.some(
      (item) => item.borrow_type === "INTER_SCHOOL_LIBRARY_USE"
    );
    const requestType = hasInterSchoolItems ? "INTER_SCHOOL" : "HOME";

    setIsSubmitting(true);

    try {
      let resolvedIdPicUrl = profile?.id_card_picture || "";

      // If user uploaded a new manual file fallback
      if (fallbackFile instanceof File) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append("id_picture", fallbackFile);
          const uploadRes = await api.post("/users/borrowing-id", formDataUpload, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          resolvedIdPicUrl = uploadRes.id_picture_url || uploadRes.data?.id_picture_url || "";
        } catch (uploadErr) {
          console.warn("Manual ID upload failed, falling back to profile ID card:", uploadErr);
        }
      }

      // Combine purpose preset with any custom note
      const finalPurpose = customPurposeNote.trim()
        ? `${selectedPurpose}: ${customPurposeNote.trim()}`
        : selectedPurpose;

      const requestPayload = {
        request_type: requestType,
        purpose: finalPurpose,
        contact_number: contactNumber || profile?.contact_number || null,
        address: address || profile?.address || null,
        id_picture_url: resolvedIdPicUrl || null,
        items,
      };

      const response = await api.post("/borrow-requests", requestPayload);

      addNotification({
        type: "BORROW_REQUEST_SUBMITTED",
        title: "Borrow Request Placed! 📚",
        message: `Your borrowing request for ${borrowingList.length} book(s) has been submitted for librarian review.`,
        related_request_id: response.data?.data?.request_id || response.data?.request_id,
      });

      const responseEnvelope = {
        success: response?.success ?? true,
        data: response?.data || response,
        message: response?.message || "Borrowing request submitted successfully",
        request_id: response?.data?.request_id || response?.request_id,
        ...response,
      };

      if (onSubmit) {
        onSubmit(responseEnvelope);
      }
    } catch (err) {
      console.error("Error submitting borrow request:", err);
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Unable to submit borrowing request. Please try again.";
      setErrorMessage(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const homeCount = borrowingList.filter((b) => b.borrow_type !== "INTER_SCHOOL_LIBRARY_USE").length;
  const interSchoolCount = borrowingList.filter((b) => b.borrow_type === "INTER_SCHOOL_LIBRARY_USE").length;

  return (
    <div
      className={`${
        compact
          ? "min-w-0 text-sm"
          : "mx-auto max-w-4xl rounded-3xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-6 shadow-sm"
      }`}
    >
      {/* Shopee-style Decorative Top Border Ribbon */}
      <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 mb-4" />

      {/* Header Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Borrowing Checkout
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                {borrowingList.length} {borrowingList.length === 1 ? "Book" : "Books"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Review your patron details and selected items before sending to library circulation.
            </p>
          </div>
        </div>

        {handleCancelClick && (
          <button
            type="button"
            onClick={handleCancelClick}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Books</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmitCheckout} className="space-y-4">
        {/* ================= 1. PATRON / BORROWER INFO CARD (Shopee Delivery Address Banner) ================= */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/90 bg-white p-4 sm:p-5 shadow-xs">
          {/* Subtle Shopee-style diagonal pattern header banner */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>Borrower & Circulation Records</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingContact(!isEditingContact)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>{isEditingContact ? "Done Editing" : "Change Contact / Address"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Student Identity Meta */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{studentFullName}</span>
                <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3 text-emerald-600" />
                  Verified
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-[11px]">
                <span className="flex items-center gap-1 font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                  ID: <strong>{studentNumber}</strong>
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                  {studentCourse}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{studentCampus}</span>
              </div>
            </div>

            {/* Contact & Address (Live or Editable) */}
            <div className="space-y-2 border-t sm:border-t-0 sm:border-l sm:border-slate-100 sm:pl-4 pt-2 sm:pt-0">
              {isEditingContact ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Phone</label>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="e.g. 09123456789"
                      className="mt-0.5 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Delivery / Residential Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Guagua, Pampanga"
                      className="mt-0.5 w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900">{contactNumber || "No phone number set"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{address || "No address on record (using campus library desk)"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= 2. ORDER ITEMS / BOOKS SUMMARY (Shopee Cart Items) ================= */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Selected Books for Borrowing ({borrowingList.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {homeCount > 0 && (
                <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-2 py-0.5 text-[10px] font-bold">
                  {homeCount} Home Loan
                </span>
              )}
              {interSchoolCount > 0 && (
                <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200/70 px-2 py-0.5 text-[10px] font-bold">
                  {interSchoolCount} Partner Library
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100/80">
            {borrowingList.map((item, idx) => {
              const isInterSchool = item.borrow_type === "INTER_SCHOOL_LIBRARY_USE";
              return (
                <div
                  key={item.book_id || idx}
                  className="pt-2.5 first:pt-0 flex items-start gap-3.5 group"
                >
                  <div className="h-16 w-12 sm:h-20 sm:w-14 shrink-0 rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100">
                    <CartBookCover book={item} className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 
                          onClick={() => handleOpenBookDetails(item)}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer"
                          title="Click to view full details"
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.author}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenBookDetails(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/60 transition shadow-2xs shrink-0 cursor-pointer"
                        title="View complete book information & library record"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/70">
                        <Building2 className="h-3 w-3 text-blue-600" />
                        <span className="truncate max-w-[140px]">
                          {item.owner_school_name || item.school_name || "Home Campus Library"}
                        </span>
                      </span>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isInterSchool
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {isInterSchool ? "Inter-School Reading Room" : "Home Loan (Take-Home)"}
                      </span>

                      {isInterSchool && Number(item.visiting_fee) > 0 && (
                        <span className="rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9px] font-extrabold border border-amber-300">
                          Fee: ₱{Number(item.visiting_fee).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 3. INSTITUTIONAL ID CARD (Auto-Attached Verification) ================= */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Official Institutional ID Attached
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              Auto-verified with Librarian Scanner
            </span>
          </div>

          {idCardUrl || fallbackPreview ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3">
              <div
                onClick={() => setZoomIdModal(true)}
                className="relative h-28 w-44 shrink-0 rounded-xl overflow-hidden border border-slate-300 bg-slate-200 shadow-xs cursor-pointer group"
                title="Click to zoom ID card picture"
              >
                <img
                  src={fallbackPreview || idCardUrl}
                  alt="Scanned Institutional Student ID"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Click to zoom</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Official Scanned ID on File</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  This physical ID was scanned during library registration. Librarians will match this photo at the circulation counter when approving and releasing your book.
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Linked to Student ID: {studentNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold">No Librarian-Scanned ID Card on Record Yet</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    You can still submit your borrow request! The librarian will verify your student ID card physically at the counter upon book release. You may also attach a clear photo of your school ID below:
                  </p>
                </div>
              </div>

              <div className="relative rounded-xl border-2 border-dashed border-amber-300 bg-white/80 p-3 text-center hover:border-amber-400 transition cursor-pointer">
                <UploadCloud className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">
                  {fallbackFile ? fallbackFile.name : "Optional: Click or drag student ID photo here"}
                </p>
                <p className="text-[10px] text-slate-400">PNG, JPG up to 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleManualImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* ================= 4. BORROWING PURPOSE / NOTES (Shopee Quick Tag Selector) ================= */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Borrowing Purpose / Note
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">1-click quick tags</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PURPOSE_PRESETS.map((preset) => {
              const isSelected = selectedPurpose === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelectedPurpose(preset)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-2xs shadow-blue-600/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={customPurposeNote}
            onChange={(e) => setCustomPurposeNote(e.target.value)}
            placeholder="Add optional notes for the librarian (e.g. Chapter 4 reference, Assignment #2)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ================= 5. RULES & SUBMIT (Shopee Sticky Bottom Action) ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
          <label className="flex items-start gap-2.5 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to the <strong>Libralink Circulation Policy</strong>. I understand that I am responsible for returning all borrowed materials on or before the due date in good condition.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Request</span>
              <span className="text-sm font-extrabold text-slate-900">
                {borrowingList.length} Book{borrowingList.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {handleCancelClick && (
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Placing Request...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Place Borrow Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Zoom Modal for Student ID Card */}
      {zoomIdModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setZoomIdModal(false)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl bg-white p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-900">
                Student Institutional ID ({studentNumber})
              </h4>
              <button
                type="button"
                onClick={() => setZoomIdModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center max-h-[70vh]">
              <img
                src={fallbackPreview || idCardUrl}
                alt="Institutional ID Zoom"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Verified Student Institutional ID on file for {studentFullName}
            </p>
          </div>
        </div>
      )}

      {/* Full Book Details Quick-View Modal */}
      {selectedBookForDetails && (
        <BookDetailsModal
          book={selectedBookForDetails}
          onClose={() => setSelectedBookForDetails(null)}
        />
      )}
    </div>
  );
}

export default StudentBorrowingForm;
