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
  Building2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Return Inspection & Fine States
  const [returnInspectionItem, setReturnInspectionItem] = useState(null);
  const [returnDaysOverdue, setReturnDaysOverdue] = useState(0);
  const [computedOverdueFine, setComputedOverdueFine] = useState(0);
  const [manualFineAmount, setManualFineAmount] = useState('0');
  const [damageFee, setDamageFee] = useState('0');
  const [isFinePaid, setIsFinePaid] = useState(true);
  const [clearanceSlipData, setClearanceSlipData] = useState(null);

  // Desk Fast Return States
  const [activeLoans, setActiveLoans] = useState([]);
  const [activeLoansLoading, setActiveLoansLoading] = useState(false);
  const [deskSearchQuery, setDeskSearchQuery] = useState('');
  const [deskFilter, setDeskFilter] = useState('all'); // 'all' | 'due-soon' | 'overdue'
  const [loanToReturn, setLoanToReturn] = useState(null);
  const [returnCondition, setReturnCondition] = useState('good'); // 'good' | 'minor' | 'damaged'
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [toastFeedback, setToastFeedback] = useState(null);

  const schoolId = localStorage.getItem('schoolId');

  const showToast = (message, type = 'success') => {
    setToastFeedback({ message, type });
    setTimeout(() => setToastFeedback(null), 4000);
  };

  // -------------------------------------------------------------
  // QR CAMERA LIFECYCLE (HTML5-QRCODE ENGINE)
  // -------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;

    const stopExistingScanner = async () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {
          console.warn('[CIRCULATION COUNTER] Scanner stop warning:', e);
        }
        try {
          html5QrCodeRef.current.clear();
        } catch (e) {
          // ignore clear error
        }
        html5QrCodeRef.current = null;
      }
    };

    if (!scanning) {
      stopExistingScanner();
      return undefined;
    }

    const startScanner = async () => {
      try {
        const container = document.getElementById('reader-container');
        if (!container) {
          console.warn('[CIRCULATION COUNTER] reader-container element not yet available');
          return;
        }

        await stopExistingScanner();
        if (isCancelled) return;

        const html5QrCode = new Html5Qrcode("reader-container", {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        html5QrCodeRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText) => {
          if (!decodedText || isCancelled) return;
          console.log('[CIRCULATION COUNTER] QR detected:', decodedText);
          setManualToken(decodedText);
          setScanning(false);
          handleScan(decodedText);
        };

        const qrConfig = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.max(220, Math.floor(minEdge * 0.85));
            return { width: qrboxSize, height: qrboxSize };
          },
          aspectRatio: 1.333334
        };

        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            qrConfig,
            qrCodeSuccessCallback,
            () => {}
          );
        } catch (envErr) {
          console.warn('[CIRCULATION COUNTER] Environment camera unavailable, falling back to default:', envErr);
          if (isCancelled) return;
          await html5QrCode.start(
            { facingMode: 'user' },
            qrConfig,
            qrCodeSuccessCallback,
            () => {}
          );
        }
      } catch (err) {
        console.error('[CIRCULATION COUNTER] Camera start failed:', err);
        if (!isCancelled) {
          setScanning(false);
          setError('Unable to access camera. Please allow camera permissions or enter token manually.');
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      stopExistingScanner();
    };
  }, [scanning]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const html5QrCode = new Html5Qrcode("reader-container-hidden", {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      if (decodedText) {
        setManualToken(decodedText);
        await handleScan(decodedText);
      } else {
        setError('No QR code detected in the selected image. Please try a clearer picture.');
      }
    } catch (err) {
      console.error('Error scanning QR image:', err);
      setError('Failed to read QR code from image. Please ensure the QR is clear and well-lit.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // -------------------------------------------------------------
  // HELPER: NORMALIZE ITEM CIRCULATION STATUS
  // -------------------------------------------------------------
  const getItemStatus = (item) => {
    const s = String(item?.item_status || item?.status || '').toLowerCase();
    if (s === 'borrowed' || s === 'released') return 'released';
    if (s === 'returned') return 'returned';
    if (s === 'approved' || s === 'ready') return 'approved';
    if (s === 'rejected' || s === 'declined') return 'rejected';
    if (s === 'cancelled') return 'cancelled';
    return 'pending';
  };

  // -------------------------------------------------------------
  // MULTI-BOOK BATCH ACTIONS & ADVANCED RETURN HANDLERS
  // -------------------------------------------------------------
  const handleBatchReleaseAll = async () => {
    if (!request?.items) return;
    const itemsToRelease = request.items.filter(
      (item) => (getItemStatus(item) === 'approved' || request.status === 'approved') && getItemStatus(item) !== 'released' && getItemStatus(item) !== 'returned'
    );
    if (itemsToRelease.length === 0) return;

    if (!window.confirm(`Authorize handover for all ${itemsToRelease.length} book(s) to ${request.student?.firstname || 'the student'}?`)) return;

    setLoading(true);
    let successCount = 0;
    let errors = [];

    for (const item of itemsToRelease) {
      try {
        const response = await releaseBookItem(item.item_id);
        if (response.error) {
          errors.push(response.error.message || `Failed to release item #${item.item_id}`);
        } else {
          successCount++;
        }
      } catch (err) {
        errors.push(err.message);
      }
    }

    if (errors.length > 0) {
      showToast(`Released ${successCount} item(s). Some errors occurred: ${errors[0]}`, 'error');
    } else {
      showToast(`Successfully released all ${successCount} books to student!`);
    }

    // Refresh request data
    const tokenToUse = request.qr_token || manualToken;
    if (tokenToUse) {
      const updatedResponse = await scanQRToken(tokenToUse);
      if (!updatedResponse.error && updatedResponse.data) {
        const fresh = updatedResponse.data?.data || updatedResponse.data;
        setRequest(fresh);
      }
    }
    setLoading(false);
  };

  const handleBatchReturnAll = async () => {
    if (!request?.items) return;
    const itemsToReturn = request.items.filter((item) => getItemStatus(item) === 'released');
    if (itemsToReturn.length === 0) return;

    if (!window.confirm(`Process check-in return for all ${itemsToReturn.length} borrowed book(s)?`)) return;

    setLoading(true);
    let successCount = 0;
    let errors = [];

    for (const item of itemsToReturn) {
      try {
        const response = await returnBookItem(item.item_id);
        if (response.error) {
          errors.push(response.error.message || `Failed to return item #${item.item_id}`);
        } else {
          successCount++;
        }
      } catch (err) {
        errors.push(err.message);
      }
    }

    if (errors.length > 0) {
      showToast(`Returned ${successCount} item(s). ${errors[0] || ''}`, 'error');
    } else {
      showToast(`All ${successCount} book(s) checked in and returned to library inventory!`);
    }

    const tokenToUse = request.qr_token || manualToken;
    if (tokenToUse) {
      const updatedResponse = await scanQRToken(tokenToUse);
      if (!updatedResponse.error && updatedResponse.data) {
        const fresh = updatedResponse.data?.data || updatedResponse.data;
        setRequest(fresh);
      }
    }
    setLoading(false);
  };

  const handleOpenReturnInspection = (item) => {
    setReturnInspectionItem(item);
    setReturnCondition('good');
    setReturnRemarks('');
    setDamageFee('0');
    setIsFinePaid(true);

    // Calculate overdue metrics
    const rawDueDate = item.due_date || request?.due_date;
    if (rawDueDate) {
      const dueDate = new Date(rawDueDate);
      const now = new Date();
      if (now > dueDate) {
        const diffMs = now.getTime() - dueDate.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        setReturnDaysOverdue(days);
        const fine = days * 5; // Standard default ₱5.00/day
        setComputedOverdueFine(fine);
        setManualFineAmount(String(fine));
        return;
      }
    }
    setReturnDaysOverdue(0);
    setComputedOverdueFine(0);
    setManualFineAmount('0');
  };

  const handleConfirmItemReturn = async () => {
    if (!returnInspectionItem) return;
    setLoading(true);
    try {
      const finalOverdue = parseFloat(manualFineAmount) || 0;
      const finalDamage = parseFloat(damageFee) || 0;
      const totalFine = finalOverdue + finalDamage;

      const response = await returnBookItem(returnInspectionItem.item_id, {
        condition: returnCondition,
        remarks: returnRemarks,
        fine_amount: totalFine,
        is_paid: isFinePaid
      });

      if (response.error) {
        showToast(response.error?.response?.data?.message || response.error?.message || 'Failed to return book', 'error');
      } else {
        showToast(`Book "${returnInspectionItem.book?.title || 'Book'}" checked in successfully!`);
        
        // Prepare Clearance Slip
        setClearanceSlipData({
          studentName: `${request?.student?.firstname || ''} ${request?.student?.lastname || ''}`.trim() || 'Student Borrower',
          studentNumber: request?.student?.student_number || 'N/A',
          schoolName: request?.home_school?.school_name || 'Santa Rita College',
          bookTitle: returnInspectionItem.book?.title || 'Book Title',
          bookAuthor: returnInspectionItem.book?.author || 'N/A',
          accessionNumber: returnInspectionItem.book_copies?.accession_number || 'ACC-STD',
          returnDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          condition: returnCondition,
          fines: totalFine,
          isPaid: isFinePaid,
          requestId: request?.request_id
        });

        setReturnInspectionItem(null);
        const tokenToUse = request.qr_token || manualToken;
        if (tokenToUse) {
          const updatedResponse = await scanQRToken(tokenToUse);
          if (!updatedResponse.error && updatedResponse.data) {
            const fresh = updatedResponse.data?.data || updatedResponse.data;
            setRequest(fresh);
          }
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to return book', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        const scannedRequest = response.data?.data || response.data;
        if (!scannedRequest || !scannedRequest.request_id) {
          setError('No borrow request found for this QR token');
          setRequest(null);
        } else if (scannedRequest.status === 'pending') {
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
    if (!itemToRelease) return;
    setLoading(true);
    try {
      const response = await releaseBookItem(itemToRelease);
      if (response.error) {
        const serverMessage = response.error?.response?.data?.error || response.error?.response?.data?.message;
        const msg = serverMessage || response.error?.message || 'Failed to release book';
        showToast(msg, 'error');
      } else {
        showToast('Book successfully released to student!');
        const tokenToUse = request?.qr_token || manualToken;
        if (tokenToUse) {
          const updatedResponse = await scanQRToken(tokenToUse);
          if (!updatedResponse.error && updatedResponse.data) {
            const fresh = updatedResponse.data?.data || updatedResponse.data;
            setRequest(fresh);
          }
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

  const dueSoonCount = activeLoans.filter((l) => {
    if (!l.due_date) return false;
    const d = new Date(l.due_date);
    return d > now && d <= in48Hours;
  }).length;

  const overdueCount = activeLoans.filter((l) => {
    if (!l.due_date) return false;
    return new Date(l.due_date) < now;
  }).length;

  // Counts for scanned request items
  const totalScannedItems = request?.items?.length || 0;
  const readyToReleaseItems = (request?.items || []).filter(
    (i) => (getItemStatus(i) === 'approved' || request?.status === 'approved') && getItemStatus(i) !== 'released' && getItemStatus(i) !== 'returned'
  );
  const releasedItems = (request?.items || []).filter((i) => getItemStatus(i) === 'released');
  const returnedItems = (request?.items || []).filter((i) => getItemStatus(i) === 'returned');

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
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
          {/* Camera Stream + Manual Input Workstation */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <div
              id="reader-container"
              className={`w-full max-w-md mx-auto rounded-2xl mb-4 overflow-hidden bg-black shadow-md ${
                scanning ? 'block' : 'hidden'
              }`}
              style={{ minHeight: scanning ? '280px' : '0px' }}
            />
            <div id="reader-container-hidden" className="hidden" />

            <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
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

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                <span>Upload QR Image</span>
              </button>
            </div>

            {scanning && (
              <p className="text-center text-xs text-slate-500 mb-4 font-medium">
                💡 I-tapat ang QR Code sa gitna ng camera (10–15 cm ang layo). Huwag galawin habang ini-scan.
              </p>
            )}

            {/* Manual Input Fallback */}
            <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Paste QR pass token or Request ID (e.g. LL-2026-692174)..."
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
                    <span>Lookup Token</span>
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

          {/* Operational Guidance Protocol */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-xs text-slate-600 leading-relaxed space-y-2">
            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              Circulation Desk Verification Protocol:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl border border-blue-200/60 bg-white p-3 shadow-2xs">
                <span className="font-bold text-slate-900 block mb-0.5">1. Student QR Pass</span>
                Ask borrower to present their active QR Access Token on their mobile student portal.
              </div>
              <div className="rounded-xl border border-blue-200/60 bg-white p-3 shadow-2xs">
                <span className="font-bold text-slate-900 block mb-0.5">2. Photo ID Inspection</span>
                Cross-check the borrower name, student ID, and photo card against the physical card.
              </div>
              <div className="rounded-xl border border-blue-200/60 bg-white p-3 shadow-2xs">
                <span className="font-bold text-slate-900 block mb-0.5">3. Release & Due Stamping</span>
                Click "Release Book" or "Batch Release All" to record loans and stamp due dates.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: FAST DESK RETURN & ACTIVE LOANS DIRECTORY              */}
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
      {/* OVERLAY MODAL: CIRCULATION HANDOVER & MULTI-BOOK MANAGER        */}
      {/* ============================================================== */}
      {request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Circulation Pass Verified
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      Active Token
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Request ID: <strong className="text-slate-800">{request.request_id}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  <X className="h-4 w-4 text-slate-400" />
                  <span>Scan Next Student</span>
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Borrower Details & Photo ID Match Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    Borrower Identification Credentials
                  </span>
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
                      <span className="text-slate-400 block text-[10px] uppercase">Home Campus</span>
                      <span className="font-semibold text-blue-700">
                        {request.home_school?.school_name || request.home_school_name || 'Home Library'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Contact & Email</span>
                      <span className="text-slate-700 truncate block">
                        {request.contact_number || request.student?.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ID Photo Preview */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Physical Student ID Photo
                  </span>
                  {request.id_picture_url ? (
                    <img
                      src={getBackendAssetUrl(request.id_picture_url)}
                      alt="Student ID"
                      className="h-28 w-auto rounded-xl border border-slate-200 object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="flex h-28 w-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                      <IdCard className="h-6 w-6 mb-1 text-slate-300" />
                      <span className="text-[10px]">No Photo on File</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Book Overview & Batch Action Toolbar */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Book className="h-4 w-4 text-blue-600" />
                      <span>Borrowed Items Overview ({totalScannedItems})</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitor multiple items, release approved books, or check in returns in batch.
                    </p>
                  </div>

                  {/* Multi-Book Batch Actions */}
                  <div className="flex items-center gap-2">
                    {readyToReleaseItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBatchReleaseAll}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Release All Ready ({readyToReleaseItems.length})</span>
                      </button>
                    )}

                    {releasedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBatchReturnAll}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Return All Books ({releasedItems.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Mini Cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl border border-emerald-200 bg-white p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Ready for Release</span>
                    <span className="text-base font-extrabold text-emerald-600">{readyToReleaseItems.length}</span>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-white p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Active / In Loan</span>
                    <span className="text-base font-extrabold text-blue-600">{releasedItems.length}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Returned to Shelf</span>
                    <span className="text-base font-extrabold text-slate-600">{returnedItems.length}</span>
                  </div>
                </div>
              </div>

              {/* Items Detail Cards List */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Book Items Breakdown
                </span>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {request.items?.map((item, idx) => {
                    const statusKey = getItemStatus(item);
                    const isReady =
                      (statusKey === 'approved' || request.status === 'approved') &&
                      statusKey !== 'released' &&
                      statusKey !== 'returned';
                    const isReleased = statusKey === 'released';
                    const isReturned = statusKey === 'returned';

                    return (
                      <div
                        key={item.item_id || idx}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-bold text-slate-900 leading-snug truncate max-w-md">
                              {item.book?.title || 'Unknown Title'}
                            </h5>
                            <p className="text-xs text-slate-500">{item.book?.author || 'Unknown Author'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Building2 className="h-3 w-3 text-blue-500" />
                                {item.owner_school?.school_name || 'Library'}
                              </span>
                              {item.book_copies?.accession_number && (
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                                  Acc: {item.book_copies.accession_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Chip & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isReady && (
                            <button
                              type="button"
                              onClick={() => handleReleaseBook(item.item_id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Release Book</span>
                            </button>
                          )}

                          {isReleased && (
                            <button
                              type="button"
                              onClick={() => handleOpenReturnInspection(item)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Process Return</span>
                            </button>
                          )}

                          {isReturned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Checked In</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Lending records and copy inventory synchronize automatically upon release or return.
              </span>
              <button
                type="button"
                onClick={resetScanner}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-xs"
              >
                Close Workstation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: RELEASE SINGLE BOOK CONFIRMATION                     */}
      {/* ============================================================== */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
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
      {/* SUB-MODAL: ITEM RETURN INSPECTION & FINE COMPUTATION           */}
      {/* ============================================================== */}
      {returnInspectionItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-blue-700">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-200 text-blue-700">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Check In / Return Book</h3>
                  <p className="text-[11px] text-slate-500">Physical Inspection & Penalty Assessment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnInspectionItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Book Details Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {returnInspectionItem.book?.title || 'Book Title'}
                  </p>
                  <p className="text-slate-500">
                    Author: <span className="font-semibold text-slate-700">{returnInspectionItem.book?.author || 'N/A'}</span>
                  </p>
                </div>
                {returnInspectionItem.book_copies?.accession_number && (
                  <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-semibold shrink-0">
                    {returnInspectionItem.book_copies.accession_number}
                  </span>
                )}
              </div>
            </div>

            {/* Overdue Fine Status Banner */}
            {returnDaysOverdue > 0 ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>⚠️ {returnDaysOverdue} Day{returnDaysOverdue > 1 ? 's' : ''} Overdue Detected</span>
                  </div>
                  <span className="text-amber-700 font-mono text-sm">₱{computedOverdueFine.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  System standard rate: <strong>₱5.00 / day</strong>. You may adjust or waive the fine below if there is an excused school clearance:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-[11px] font-bold text-amber-900 shrink-0">Assessed Overdue Fine (₱):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualFineAmount}
                    onChange={(e) => setManualFineAmount(e.target.value)}
                    className="w-28 rounded-xl border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {parseFloat(manualFineAmount) === 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Waived
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs flex items-center justify-between text-emerald-800 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Returned On Time (No Overdue Fines)</span>
                </div>
                <span className="font-mono font-bold text-emerald-700">₱0.00</span>
              </div>
            )}

            {/* Physical Condition Checklist */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Book Condition Grading:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                {[
                  { id: 'good', label: 'Good / Intact', badge: 'No Damage' },
                  { id: 'minor', label: 'Minor Wear', badge: 'Acceptable' },
                  { id: 'damaged', label: 'Damaged', badge: 'Penalty' },
                ].map((cond) => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => {
                      setReturnCondition(cond.id);
                      if (cond.id === 'damaged' && damageFee === '0') {
                        setDamageFee('50');
                      } else if (cond.id !== 'damaged') {
                        setDamageFee('0');
                      }
                    }}
                    className={`rounded-2xl border p-2.5 text-center transition flex flex-col items-center gap-1 ${
                      returnCondition === cond.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cond.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                      cond.id === 'good' ? 'bg-emerald-100 text-emerald-800' : cond.id === 'minor' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {cond.badge}
                    </span>
                  </button>
                ))}
              </div>

              {returnCondition === 'damaged' && (
                <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-rose-900 font-bold">
                    <span>Damage / Defacement Fee:</span>
                    <div className="flex items-center gap-1">
                      <span>₱</span>
                      <input
                        type="number"
                        min="0"
                        value={damageFee}
                        onChange={(e) => setDamageFee(e.target.value)}
                        className="w-20 rounded-xl border border-rose-300 bg-white px-2 py-0.5 text-xs font-bold text-rose-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-rose-700">
                    Covers torn pages, liquid damage, or book binding repairs.
                  </p>
                </div>
              )}
            </div>

            {/* Total Settlement & Payment Check */}
            {(parseFloat(manualFineAmount) > 0 || parseFloat(damageFee) > 0) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-900 font-extrabold text-sm">
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-blue-700">
                    ₱{((parseFloat(manualFineAmount) || 0) + (parseFloat(damageFee) || 0)).toFixed(2)}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isFinePaid}
                    onChange={(e) => setIsFinePaid(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Fine settled and paid at the counter</span>
                </label>
              </div>
            )}

            {/* Inspection Remarks */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Librarian Inspection Remarks <span className="text-slate-400 font-normal">(Optional)</span>:
              </label>
              <input
                type="text"
                placeholder="e.g. Returned in good condition, pages intact..."
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReturnInspectionItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmItemReturn}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirm Return & Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: OFFICIAL DIGITAL RETURN CLEARANCE SLIP                  */}
      {/* ============================================================== */}
      {clearanceSlipData && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Circulation Return Clearance</h3>
                  <p className="text-[10px] text-slate-500">Official LibraLink Digital Receipt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearanceSlipData(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Clearance Card Slip */}
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/30 p-5 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 block">
                    {clearanceSlipData.schoolName}
                  </span>
                  <span className="text-slate-500 text-[10px]">Library Circulation Department</span>
                </div>
                <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CLEARED
                </span>
              </div>

              <div className="space-y-1 text-slate-700">
                <p>
                  <strong>Borrower:</strong> {clearanceSlipData.studentName} ({clearanceSlipData.studentNumber})
                </p>
                <p>
                  <strong>Returned Book:</strong> {clearanceSlipData.bookTitle}
                </p>
                <p>
                  <strong>Accession No:</strong> <span className="font-mono font-semibold">{clearanceSlipData.accessionNumber}</span>
                </p>
                <p>
                  <strong>Timestamp:</strong> {clearanceSlipData.returnDate}
                </p>
                <p>
                  <strong>Condition:</strong> <span className="uppercase font-bold text-slate-800">{clearanceSlipData.condition}</span>
                </p>
                <p>
                  <strong>Fine Balance:</strong>{' '}
                  <span className="font-bold text-emerald-700 font-mono">
                    ₱{Number(clearanceSlipData.fines || 0).toFixed(2)}{' '}
                    {clearanceSlipData.fines > 0 ? (clearanceSlipData.isPaid ? '(Paid)' : '(Unpaid)') : '(No Fines)'}
                  </span>
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-200 text-center text-[10px] text-emerald-800">
                ✓ Inventory successfully updated & synchronized.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Print Slip
              </button>
              <button
                type="button"
                onClick={() => setClearanceSlipData(null)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DESK RETURN CONFIRMATION                                */}
      {/* ============================================================== */}
      {loanToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="h-5 w-5" />
                <h3 className="font-bold text-slate-900">Process Desk Return</h3>
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
                  { id: 'missing-pages', label: 'Missing Pages' },
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
                placeholder="e.g. Spine fine, copy returned on time..."
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

