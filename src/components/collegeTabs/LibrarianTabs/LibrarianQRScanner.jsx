import { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle,
  AlertCircle,
  Book,
  User,
  MapPin,
  Loader2,
  Phone,
  Mail,
  IdCard,
  RefreshCw,
  Scan,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import api, { scanQRToken, releaseBookItem, returnBookItem, returnBook, getBackendAssetUrl } from '../../../utils/api';

function LibrarianQRScanner({ darkMode }) {
  const [activeMode, setActiveMode] = useState('qr'); // 'qr' | 'desk-return'
  
  // QR Scanner States
  const [scanning, setScanning] = useState(false);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [itemToRelease, setItemToRelease] = useState(null);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Desk Fast Return States
  const [activeLoans, setActiveLoans] = useState([]);
  const [activeLoansLoading, setActiveLoansLoading] = useState(false);
  const [deskSearchQuery, setDeskSearchQuery] = useState('');
  const [deskFilter, setDeskFilter] = useState('all'); // 'all' | 'due-soon' | 'overdue'
  const [loanToReturn, setLoanToReturn] = useState(null);
  const [returnCondition, setReturnCondition] = useState('good'); // 'good' | 'damaged' | 'missing-pages'
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [toastFeedback, setToastFeedback] = useState(null);

  const schoolId = localStorage.getItem('schoolId');

  const showToast = (message, type = 'success') => {
    setToastFeedback({ message, type });
    setTimeout(() => setToastFeedback(null), 4000);
  };

  // -------------------------------------------------------------
  // QR CAMERA LIFECYCLE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!scanning || !videoRef.current) return undefined;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const decodedText = typeof result === 'string' ? result : result.data;
        if (!decodedText) return;
        setManualToken(decodedText);
        setScanning(false);
        handleScan(decodedText);
      },
      { 
        highlightScanRegion: true, 
        highlightCodeOutline: true,
        preferredCamera: 'environment'
      }
    );

    qrScannerRef.current = scanner;
    scanner.start().then(() => {
      console.log('[CIRCULATION COUNTER] Camera started successfully');
    }).catch((err) => {
      console.error('[CIRCULATION COUNTER] Camera start error:', err);
      setScanning(false);
      setError('Unable to access camera. Please allow camera permissions or enter token manually.');
    });

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [scanning]);

  // -------------------------------------------------------------
  // DESK FAST RETURN LOANS FETCHER
  // -------------------------------------------------------------
  const fetchActiveLoans = async () => {
    if (!schoolId) return;
    setActiveLoansLoading(true);
    try {
      const res = await api.get('/borrow/active/school', { params: { school_id: schoolId } });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setActiveLoans(list);
    } catch (err) {
      console.error('[CIRCULATION COUNTER] Error fetching active loans:', err);
    } finally {
      setActiveLoansLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'desk-return') {
      fetchActiveLoans();
    }
  }, [activeMode]);

  // -------------------------------------------------------------
  // QR SCAN HANDLERS
  // -------------------------------------------------------------
  const handleScan = async (token) => {
    setLoading(true);
    setError(null);

    try {
      const response = await scanQRToken(token.trim());
      if (response.error) {
        setError(response.error.message || 'Invalid or expired QR token');
        setRequest(null);
      } else {
        const scannedRequest = response.data;
        if (scannedRequest.status === 'pending') {
          setError('This request is still pending approval. Please review it in Borrow Requests.');
          setRequest(null);
        } else if (scannedRequest.status === 'rejected') {
          setError('This borrow request has been declined.');
          setRequest(null);
        } else {
          setRequest(scannedRequest);
          setError(null);
        }
      }
    } catch (err) {
      setError('Failed to process QR code. Please try again.');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      setError('Please enter a valid QR token or Request ID');
      return;
    }
    await handleScan(manualToken.trim());
  };

  const handleReleaseBook = (itemId) => {
    setItemToRelease(itemId);
    setShowReleaseConfirm(true);
  };

  const confirmReleaseBook = async () => {
    setLoading(true);
    try {
      const response = await releaseBookItem(itemToRelease);
      if (response.error) {
        const serverMessage = response.error?.response?.data?.error || response.error?.response?.data?.message;
        const msg = serverMessage || response.error?.message || 'Failed to release book';
        showToast(msg, 'error');
      } else {
        showToast('Book successfully released to student!');
        const updatedResponse = await scanQRToken(request.qr_token || manualToken);
        if (!updatedResponse.error) {
          setRequest(updatedResponse.data);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to release book', 'error');
    } finally {
      setLoading(false);
      setShowReleaseConfirm(false);
      setItemToRelease(null);
    }
  };

  const handleReturnItemViaQR = async (itemId) => {
    if (!window.confirm('Confirm return of this book item?')) return;

    setLoading(true);
    try {
      const response = await returnBookItem(itemId);
      if (response.error) {
        const msg = response.error?.response?.data?.message || 'Failed to return book';
        showToast(msg, 'error');
      } else {
        showToast('Book returned and inventory updated!');
        const updatedResponse = await scanQRToken(request.qr_token || manualToken);
        if (!updatedResponse.error) {
          setRequest(updatedResponse.data);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to return book', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setRequest(null);
    setError(null);
    setManualToken('');
  };

  // -------------------------------------------------------------
  // FAST DESK RETURN HANDLER
  // -------------------------------------------------------------
  const handleConfirmDeskReturn = async () => {
    if (!loanToReturn) return;
    setReturnSubmitting(true);

    try {
      const { error: retError } = await returnBook(loanToReturn.borrow_id);
      if (retError) {
        showToast(retError?.response?.data?.message || 'Failed to return book', 'error');
      } else {
        showToast(`Book "${loanToReturn.book_copies?.books?.title || 'Book'}" returned successfully!`);
        setLoanToReturn(null);
        setReturnRemarks('');
        setReturnCondition('good');
        await fetchActiveLoans();
      }
    } catch (err) {
      showToast(err.message || 'Error processing return', 'error');
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Filter Active Loans in Desk Return tab
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const filteredActiveLoans = activeLoans.filter((loan) => {
    const dueDate = loan.due_date ? new Date(loan.due_date) : null;
    const isOverdue = dueDate && dueDate < now;
    const isDueSoon = dueDate && !isOverdue && dueDate <= in48Hours;

    if (deskFilter === 'overdue' && !isOverdue) return false;
    if (deskFilter === 'due-soon' && !isDueSoon) return false;

    if (!deskSearchQuery.trim()) return true;

    const query = deskSearchQuery.toLowerCase();
    const title = (loan.book_copies?.books?.title || loan.book_title || '').toLowerCase();
    const author = (loan.book_copies?.books?.author || '').toLowerCase();
    const studentName = `${loan.student?.firstname || ''} ${loan.student?.lastname || ''}`.toLowerCase();
    const studentNumber = (loan.student?.student_number || '').toLowerCase();
    const accession = (loan.book_copies?.accession_number || '').toLowerCase();

    return (
      title.includes(query) ||
      author.includes(query) ||
      studentName.includes(query) ||
      studentNumber.includes(query) ||
      accession.includes(query)
    );
  });

  const dueSoonCount = activeLoans.filter(l => {
    if (!l.due_date) return false;
    const d = new Date(l.due_date);
    return d > now && d <= in48Hours;
  }).length;

  const overdueCount = activeLoans.filter(l => {
    if (!l.due_date) return false;
    return new Date(l.due_date) < now;
  }).length;

  return (
    <div className="animate-slide-up space-y-6">
      {/* Toast Feedback */}
      {toastFeedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-white shadow-xl transition-all ${
            toastFeedback.type === 'error' ? 'bg-rose-600 shadow-rose-600/30' : 'bg-slate-900 shadow-slate-900/30'
          }`}
        >
          {toastFeedback.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-200 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastFeedback.message}</span>
        </div>
      )}

      {/* Main Workspace Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
              <Scan className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 mb-1">
                <Sparkles className="h-3 w-3" />
                <span>Circulation Workstation</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Library Circulation Counter
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Scan access passes to release books or lookup active loans to process quick returns.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setActiveMode('qr')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeMode === 'qr'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Scan QR Pass</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('desk-return')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeMode === 'desk-return'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Desk Quick Return</span>
              {activeLoans.length > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-extrabold text-blue-800">
                  {activeLoans.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: QR CODE ACCESS PASS SCANNER                             */}
      {/* ============================================================== */}
      {activeMode === 'qr' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          {!request ? (
            <div className="space-y-6">
              {/* Camera Stream + Manual Input */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <video
                  ref={videoRef}
                  className={`${scanning ? 'block' : 'hidden'} w-full max-w-md mx-auto rounded-2xl mb-4 bg-black aspect-video object-cover shadow-sm`}
                  muted
                  playsInline
                  autoPlay
                />

                <div className="flex justify-center mb-5">
                  <button
                    type="button"
                    onClick={() => setScanning((v) => !v)}
                    disabled={loading}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 ${
                      scanning
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {scanning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    <span>{scanning ? 'Turn Off Camera' : 'Open Camera Scanner'}</span>
                  </button>
                </div>

                {/* Manual Input Fallback */}
                <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Paste QR pass token or Request ID (e.g. LL-2026-099335)..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleManualScan}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-slate-800 transition active:scale-95 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4" />
                        <span>Lookup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs sm:text-sm font-medium text-rose-800">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Operational Guidance */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-xs text-slate-600 leading-relaxed space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Circulation Desk Verification Protocol:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl border border-blue-200/60 bg-white p-3">
                    <span className="font-bold text-slate-900 block mb-0.5">1. Student QR Pass</span>
                    Ask student to show their active QR Access Token on their student portal home page.
                  </div>
                  <div className="rounded-xl border border-blue-200/60 bg-white p-3">
                    <span className="font-bold text-slate-900 block mb-0.5">2. Physical ID Check</span>
                    Verify student number, school name, and ID picture against the physical student card.
                  </div>
                  <div className="rounded-xl border border-blue-200/60 bg-white p-3">
                    <span className="font-bold text-slate-900 block mb-0.5">3. Release & Stamp Due Date</span>
                    Click "Release Book" to activate the loan and inform the student of the return deadline.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Scanned Request Found View */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Valid Request Token Verified</h3>
                    <p className="text-xs text-slate-500 font-mono">ID: {request.request_id}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetScanner}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  Close / Scan Next
                </button>
              </div>

              {/* Student Identification Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    Borrower Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Full Name</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {request.student?.firstname} {request.student?.lastname}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Student ID / Number</span>
                      <span className="font-bold font-mono text-slate-900">
                        {request.student?.student_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Home Institution</span>
                      <span className="font-semibold text-blue-700">
                        {request.home_school?.school_name || request.home_school_name || 'Home Library'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Contact / Email</span>
                      <span className="text-slate-700">
                        {request.contact_number || request.student?.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Photo Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Physical ID Card Photo
                  </span>
                  {request.id_picture_url ? (
                    <img
                      src={getBackendAssetUrl(request.id_picture_url)}
                      alt="Student ID"
                      className="h-28 w-auto rounded-xl border border-slate-200 object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="flex h-28 w-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                      <IdCard className="h-6 w-6 mb-1 text-slate-300" />
                      <span className="text-[10px]">No Photo on File</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items in this Borrow Request */}
              <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Book className="h-3.5 w-3.5 text-blue-600" />
                  Loan Items ({request.items?.length || 0})
                </h4>

                <div className="divide-y divide-slate-100">
                  {request.items?.map((item) => (
                    <div key={item.item_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">{item.book?.title}</h5>
                        <p className="text-xs text-slate-500">{item.book?.author}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <Building2 className="h-3 w-3 text-blue-500" />
                          <span>{item.owner_school?.school_name}</span>
                          {item.book_copies?.accession_number && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                              Acc: {item.book_copies.accession_number}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(item.status === 'approved' || request.status === 'approved') && item.status !== 'released' && item.status !== 'returned' && (
                          <button
                            type="button"
                            onClick={() => handleReleaseBook(item.item_id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Confirm Release Book
                          </button>
                        )}

                        {item.status === 'released' && (
                          <button
                            type="button"
                            onClick={() => handleReturnItemViaQR(item.item_id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Process Return
                          </button>
                        )}

                        {item.status === 'returned' && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                            Book Returned
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: FAST DESK RETURN & LOAN LOOKUP                          */}
      {/* ============================================================== */}
      {activeMode === 'desk-return' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Desk Return & Active Loans Directory</h2>
              <p className="text-xs text-slate-500">
                Quickly lookup any currently borrowed book by student or accession number and process returns on the spot.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchActiveLoans}
              disabled={activeLoansLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 self-start sm:self-center"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${activeLoansLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Active Loans</span>
            </button>
          </div>

          {/* Search Bar & Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, ID number, book title, author, accession..."
                value={deskSearchQuery}
                onChange={(e) => setDeskSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setDeskFilter('all')}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  deskFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({activeLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setDeskFilter('due-soon')}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition flex items-center gap-1 ${
                  deskFilter === 'due-soon'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Clock className="h-3 w-3" />
                Due Soon ({dueSoonCount})
              </button>
              <button
                type="button"
                onClick={() => setDeskFilter('overdue')}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition flex items-center gap-1 ${
                  deskFilter === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                Overdue ({overdueCount})
              </button>
            </div>
          </div>

          {/* Table of Active Loans */}
          {activeLoansLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
              <span>Loading currently borrowed books...</span>
            </div>
          ) : filteredActiveLoans.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 p-8">
              <Book className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching active loans found</p>
              <p className="text-xs text-slate-400 mt-1">
                {deskSearchQuery ? 'Try adjusting your search keywords' : 'All borrowed books have been returned.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Book Title & Accession</th>
                    <th className="px-4 py-3">Student Borrower</th>
                    <th className="px-4 py-3">Borrowed On</th>
                    <th className="px-4 py-3">Due Date / Status</th>
                    <th className="px-4 py-3 text-right">Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActiveLoans.map((loan) => {
                    const book = loan.book_copies?.books || {};
                    const student = loan.student || {};
                    const dueDate = loan.due_date ? new Date(loan.due_date) : null;
                    const isOverdue = dueDate && dueDate < now;
                    const isDueSoon = dueDate && !isOverdue && dueDate <= in48Hours;
                    const daysOverdue = dueDate && isOverdue ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;

                    return (
                      <tr key={loan.borrow_id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-blue-50 border border-blue-200 text-blue-700">
                              <Book className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-xs">{book.title || 'Unknown Title'}</p>
                              <p className="text-[11px] text-slate-500 truncate">{book.author || 'Unknown Author'}</p>
                              {loan.book_copies?.accession_number && (
                                <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                                  Acc: {loan.book_copies.accession_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {student.firstname ? `${student.firstname} ${student.lastname}` : 'Student'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {student.student_number || `ID: ${loan.student_id}`}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="px-4 py-3">
                          <div>
                            <span className={`font-semibold ${isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-slate-700'}`}>
                              {dueDate ? dueDate.toLocaleDateString() : 'No date'}
                            </span>
                            {isOverdue && (
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5 mt-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                              </p>
                            )}
                            {isDueSoon && (
                              <p className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 mt-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                Due within 48h
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setLoanToReturn(loan)}
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition active:scale-95"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Return
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RELEASE BOOK CONFIRMATION                                */}
      {/* ============================================================== */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Book className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize Book Release</h3>
                <p className="text-xs text-slate-500">Student Pickup Verification</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirming this release will record an <strong>Active Loan</strong> in the circulation ledger and assign the book copy to the student borrower.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReleaseConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReleaseBook}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Confirm & Hand Over Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DESK RETURN CONFIRMATION & CONDITION INSPECTION          */}
      {/* ============================================================== */}
      {loanToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="h-5 w-5" />
                <h3 className="font-bold text-slate-900">Process Book Return</h3>
              </div>
              <button
                type="button"
                onClick={() => setLoanToReturn(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Book & Borrower Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
              <p className="font-bold text-slate-900">
                {loanToReturn.book_copies?.books?.title || loanToReturn.book_title || 'Book Title'}
              </p>
              <p className="text-slate-500">
                Borrower: <span className="font-semibold text-slate-700">{loanToReturn.student?.firstname} {loanToReturn.student?.lastname}</span>
              </p>
              {loanToReturn.book_copies?.accession_number && (
                <p className="text-slate-500 font-mono">
                  Accession: {loanToReturn.book_copies.accession_number}
                </p>
              )}
            </div>

            {/* Condition Check */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Physical Book Condition:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                {[
                  { id: 'good', label: 'Good / Intact' },
                  { id: 'damaged', label: 'Damaged' },
                  { id: 'missing-pages', label: 'Missing Pages' }
                ].map((cond) => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setReturnCondition(cond.id)}
                    className={`rounded-xl border py-2 px-1 text-center transition ${
                      returnCondition === cond.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Remarks */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Librarian Inspection Note <span className="text-slate-400 font-normal">(Optional)</span>:
              </label>
              <input
                type="text"
                placeholder="e.g. Spine fine, late fee settled..."
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLoanToReturn(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeskReturn}
                disabled={returnSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
              >
                {returnSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating Inventory...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete Return
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

export default LibrarianQRScanner;
