import { useState, useEffect, useRef } from 'react';
import {
  FiMaximize2,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiBook,
  FiUser,
  FiClock,
  FiSearch,
  FiArrowRight,
  FiPrinter,
  FiShield,
  FiRefreshCw,
  FiZoomIn,
  FiCreditCard,
  FiBookOpen,
  FiClipboard,
  FiXCircle,
  FiSlash,
  FiCheck
} from 'react-icons/fi';
import { Sparkles, QrCode, ScanLine } from 'lucide-react';
import api, { scanQRToken, releaseBookItem, returnBookItem, returnBook, getBackendAssetUrl } from '../../utils/api';
import { formatPhilippineDate, getDueStatusDetails } from '../../utils/timeUtils';

export default function GlobalCirculationScanner({ schoolId, libraryId, darkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null); // borrow request or active loan
  const [actionProcessing, setActionProcessing] = useState(false);
  const [successAction, setSuccessAction] = useState(null); // 'released' | 'returned'
  
  // Library scoping & multi-library validation
  const [libraries, setLibraries] = useState([]);
  const [adminOverridden, setAdminOverridden] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [profileImgError, setProfileImgError] = useState(false);
  const [idCardImgError, setIdCardImgError] = useState(false);

  // Return inspection states
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [fineAmount, setFineAmount] = useState('0');
  const [isFinePaid, setIsFinePaid] = useState(true);
  const [fineDecision, setFineDecision] = useState('paid'); // 'paid' | 'unpaid' | 'waived'

  // Fetch school libraries on mount for accurate desk name matching
  useEffect(() => {
    const sId = schoolId || localStorage.getItem('schoolId');
    if (sId) {
      api.get(`/libraries/school/${sId}`).then(res => {
        if (res.data?.data) setLibraries(res.data.data);
      }).catch(() => {});
    }
  }, [schoolId]);
  
  // Hardware scanner wedge buffer
  const keyBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // -----------------------------------------------------------------
  // 1. HARDWARE BARCODE / QR SCANNER KEYBOARD LISTENER
  // -----------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shortcut to open manual scanner: F2 or Ctrl+Shift+S
      if (e.key === 'F2' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Check if user is typing into an active text input or textarea
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
      
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Hardware scanners type extremely fast (< 45ms per character)
      if (e.key === 'Enter') {
        const buffered = keyBufferRef.current.trim();
        keyBufferRef.current = '';

        // If we captured a rapid string of 4+ characters, it's a barcode scanner!
        if (buffered.length >= 4) {
          e.preventDefault();
          processScanToken(buffered);
        }
      } else if (e.key.length === 1) {
        // If not in input, or if typing speed is scanner-fast (< 45ms)
        if (!isInput || timeDiff < 45) {
          keyBufferRef.current += e.key;
        } else {
          // Regular human typing in an input field - reset buffer
          keyBufferRef.current = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to normalize hardware barcode/QR scanner artifacts (Caps Lock / Shift / AZERTY swaps)
  const normalizeScannedToken = (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    const shiftedMap = {
      '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
      '^': '6', '&': '7', '*': '8', '(': '9', ')': '0'
    };
    let unshifted = '';
    for (const ch of raw.trim()) {
      unshifted += shiftedMap[ch] !== undefined ? shiftedMap[ch] : ch;
    }
    unshifted = unshifted.replace(/^LL[6_]/i, 'LL-');
    unshifted = unshifted.replace(/(\d{10,14})[6_]([A-Za-z0-9])/i, (m, p1, p2) => `${p1}-${p2}`);
    if (unshifted.includes('Z') && !unshifted.includes('W')) {
      unshifted = unshifted.replace(/Z/g, 'W');
    }
    return unshifted;
  };

  // -----------------------------------------------------------------
  // 2. PROCESS SCANNED TOKEN (Auto-Fetch Request or Loan)
  // -----------------------------------------------------------------
  const processScanToken = async (rawToken) => {
    if (!rawToken || !rawToken.trim()) return;
    const cleanToken = normalizeScannedToken(rawToken);
    setTokenInput(cleanToken);
    setLoading(true);
    setError(null);
    setScanResult(null);
    setSuccessAction(null);
    setIsOpen(true);

    try {
      // Try scanning via the QR token endpoint
      const { data, error: scanErr } = await scanQRToken(cleanToken);
      if (data && !scanErr) {
        setupScanResult(data);
        return;
      }

      // Fallback: Check if it's an Accession number or Borrow ID
      const activeSchool = schoolId || localStorage.getItem('schoolId');
      const activeRes = await api.get('/borrow/active/school', {
        params: { school_id: activeSchool, search: cleanToken }
      }).catch(() => null);

      const loans = Array.isArray(activeRes?.data?.data) ? activeRes.data.data : (Array.isArray(activeRes?.data) ? activeRes.data : []);
      const matched = loans.find(l => 
        String(l.borrow_id) === cleanToken ||
        l.book_copies?.accession_number?.toLowerCase() === cleanToken.toLowerCase() ||
        String(l.student_id) === cleanToken ||
        l.student?.student_number?.toLowerCase() === cleanToken.toLowerCase()
      );

      if (matched) {
        setupLoanResult(matched);
      } else {
        throw new Error(scanErr?.response?.data?.message || 'No active circulation or request found for this code.');
      }
    } catch (err) {
      console.error('[GLOBAL SCANNER] Scan error:', err);
      setError(err?.response?.data?.message || err.message || 'Scanned QR code not recognized.');
    } finally {
      setLoading(false);
    }
  };

  const setupScanResult = (reqData) => {
    const rawDue = reqData.due_date || reqData.items?.[0]?.due_date;
    const dueStatus = rawDue ? getDueStatusDetails(rawDue) : { isOverdue: false, daysOverdue: 0 };
    
    // Check if items are already completed / returned
    const isAlreadyReturned = 
      reqData.status === 'returned' || 
      (reqData.items?.length > 0 && reqData.items.every(i => i.status === 'returned' || i.item_status === 'returned'));

    // Check if items are currently released / borrowed (lifecycle status 'borrowed' or 'released')
    const hasReleasedItem = !isAlreadyReturned && (
      reqData.status === 'borrowed' || 
      reqData.status === 'released' ||
      reqData.items?.some(i => 
        i.status === 'borrowed' || 
        i.status === 'released' || 
        i.item_status === 'borrowed' || 
        Boolean(i.released_at)
      )
    );

    const isOverdue = dueStatus.isOverdue && hasReleasedItem;
    const fine = isOverdue ? (dueStatus.daysOverdue * 5) : 0;

    const targetLibrary = reqData.target_library || 
      reqData.items?.[0]?.target_library || 
      reqData.items?.[0]?.book?.library || 
      null;
    const targetLibraryId = targetLibrary?.library_id || 
      reqData.source_library_id || 
      reqData.items?.[0]?.book?.library_id || 
      null;

    const profilePic = reqData.student?.profile_image || null;
    const idCardPic = reqData.student?.id_card_picture || reqData.id_picture_url || null;

    setFineAmount(String(fine));
    setIsFinePaid(true);
    setFineDecision('paid');
    setReturnCondition('good');
    setReturnRemarks('');
    setAdminOverridden(false);
    setProfileImgError(false);
    setIdCardImgError(false);
    setZoomImage(null);

    let suggestedAction = 'release';
    if (isAlreadyReturned) {
      suggestedAction = 'completed';
    } else if (hasReleasedItem) {
      suggestedAction = 'return';
    }

    setScanResult({
      type: 'request',
      raw: reqData,
      requestId: reqData.request_id,
      student: reqData.student || {},
      items: reqData.items || [],
      borrowType: reqData.borrow_type || 'REGULAR',
      status: reqData.status,
      dueStatus,
      isOverdue,
      targetLibrary,
      targetLibraryId,
      profilePic,
      idCardPic,
      suggestedAction
    });
  };

  const setupLoanResult = (loanData) => {
    const dueStatus = getDueStatusDetails(loanData.due_date);
    const isInterSchool = loanData.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' || 
      (loanData.student?.school_id && loanData.school_id && Number(loanData.student.school_id) !== Number(loanData.school_id));
    
    const isOverdue = !isInterSchool && dueStatus.isOverdue;
    const fine = isOverdue ? (dueStatus.daysOverdue * 5) : 0;

    const targetLibraryId = loanData.book_copies?.library_id || 
      loanData.book_copies?.books?.library_id || 
      loanData.book?.library_id || 
      loanData.library_id || 
      null;

    const profilePic = loanData.student?.profile_image || null;
    const idCardPic = loanData.student?.id_card_picture || null;

    setFineAmount(String(fine));
    setIsFinePaid(true);
    setFineDecision('paid');
    setAdminOverridden(false);
    setProfileImgError(false);
    setIdCardImgError(false);
    setZoomImage(null);

    setScanResult({
      type: 'loan',
      raw: loanData,
      borrowId: loanData.borrow_id,
      student: loanData.student || {},
      items: [{
        item_id: loanData.borrow_id,
        book: loanData.book_copies?.books || loanData.book || {},
        book_copies: loanData.book_copies || {},
        due_date: loanData.due_date,
        status: 'released'
      }],
      borrowType: isInterSchool ? 'INTER_SCHOOL_LIBRARY_USE' : 'REGULAR',
      status: 'active',
      dueStatus,
      isOverdue,
      targetLibraryId,
      profilePic,
      idCardPic,
      suggestedAction: 'return'
    });
  };

  // -----------------------------------------------------------------
  // 3. EXECUTE RELEASE OR RETURN IN 1 CLICK
  // -----------------------------------------------------------------
  const handleExecuteAction = async () => {
    if (!scanResult) return;
    setActionProcessing(true);
    setError(null);

    try {
      if (scanResult.suggestedAction === 'release') {
        // Release pending approved items
        const itemToRelease = scanResult.items?.[0];
        if (itemToRelease) {
          const { error: relErr } = await releaseBookItem(itemToRelease.item_id, itemToRelease.copy_id || null);
          if (relErr) throw relErr;
        }
        setSuccessAction('released');
      } else if (scanResult.suggestedAction === 'return') {
        // Return item
        if (scanResult.type === 'request') {
          const itemToReturn = scanResult.items?.[0];
          if (!itemToReturn?.item_id) throw new Error('Item ID missing for return');
          
          const returnPayload = {
            condition: returnCondition,
            remarks: returnRemarks.trim() || undefined,
            fine_amount: scanResult.isOverdue ? (parseFloat(fineAmount) || 0) : 0,
            is_paid: fineDecision === 'paid'
          };
          
          const { error: retErr } = await returnBookItem(itemToReturn.item_id, returnPayload);
          if (retErr) throw retErr;
        } else {
          // Direct borrow transaction
          const borrowId = scanResult.borrowId || scanResult.items?.[0]?.item_id || scanResult.raw?.borrow_id;
          const { error: retErr } = await returnBook(borrowId);
          if (retErr) throw retErr;
        }
        setSuccessAction('returned');
      }

      // Notify parent components / dashboard to refresh
      window.dispatchEvent(new CustomEvent('refreshStats'));
      window.dispatchEvent(new CustomEvent('circulationUpdated'));
    } catch (err) {
      console.error('[GLOBAL SCANNER ACTION ERROR]:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to complete transaction.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setScanResult(null);
    setError(null);
    setSuccessAction(null);
    setTokenInput('');
    setReturnRemarks('');
    setReturnCondition('good');
    setAdminOverridden(false);
    setZoomImage(null);
    setProfileImgError(false);
    setIdCardImgError(false);
  };

  // Resolve libraries & mismatch
  const collegeLib = libraries.find(l => l.library_type === 'college' || /college/i.test(l.name)) || libraries[0] || { library_id: 1, name: 'College Library' };
  
  const currentDeskId = libraryId ? Number(libraryId) : Number(collegeLib.library_id || 1);
  const currentDeskLib = libraries.find(l => Number(l.library_id) === currentDeskId) || { name: 'Main Library Desk', library_id: currentDeskId };

  const targetLibId = scanResult?.targetLibraryId ? Number(scanResult.targetLibraryId) : Number(collegeLib.library_id || 1);
  const targetLib = libraries.find(l => Number(l.library_id) === targetLibId) || scanResult?.targetLibrary || { name: 'College Library', library_id: targetLibId };

  const isWrongLibrary = Boolean(scanResult && currentDeskId !== targetLibId);

  // Check admin role
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRoleId = Number(storedUser.role_id || localStorage.getItem('roleId') || 0);
  const isLibrarianAdmin = userRoleId === 2 || userRoleId === 1;

  return (
    <>
      {/* PERSISTENT FLOATING TRIGGER PILL (Accessible Anywhere) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Quick Scan QR Code (Shortcut: F2)"
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 backdrop-blur-md"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
        </span>
        <ScanLine className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-200" />
        <span className="text-xs font-bold tracking-tight">Quick Scan</span>
        <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded text-white/90">F2</kbd>
      </button>

      {/* GLASSMORPHIC SCANNER MODAL WITH SMOOTH SCALE-UP ANIMATION */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget && !actionProcessing) handleClose(); }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Circulation Scan Anywhere</h3>
                  <p className="text-[11px] text-slate-300">Instant borrower verification & book handover</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={actionProcessing}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Scanner Form */}
              {!scanResult && (
                <div className="space-y-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      processScanToken(tokenInput);
                    }}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <ScanLine className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Scan QR code or type token / request ID..."
                        className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                      <button
                        type="submit"
                        disabled={!tokenInput.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition cursor-pointer"
                      >
                        <FiArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-2.5 text-[11px] text-blue-900">
                      <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        <strong>Hardware Scanner Active:</strong> Simply point and pull the trigger on the student's or book's QR code anytime.
                      </span>
                    </div>
                  </form>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-700">Verifying circulation code...</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <FiAlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scan Notice</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* BEAUTIFUL VERIFIED BORROWER & BOOK CARD */}
              {scanResult && !loading && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  
                  {/* Status Banner OR Wrong Library Desk Amber Alert */}
                  {isWrongLibrary && !adminOverridden ? (
                    <div className="p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 space-y-2.5 shadow-xs animate-in zoom-in-95">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <FiAlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                              Wrong Library Circulation Desk
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                              Owner Unit: {targetLib?.name || 'College Library'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-amber-950 mt-1 leading-snug">
                            Ang aklat na ito ay nakatalaga sa <u>{targetLib?.name || 'College Library'}</u>.
                          </p>
                          <p className="text-[11.5px] text-amber-800 mt-1 leading-relaxed">
                            Kasalukuyan kang naka-log in sa desk ng <strong>{currentDeskLib?.name || 'Ibang Library'}</strong>. Mangyaring sabihan ang estudyante na magtungo sa <strong>{targetLib?.name || 'College Library'} Desk</strong> upang doon i-release o isauli ang aklat.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Status Banner */
                    <div className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold ${
                      scanResult.suggestedAction === 'completed'
                        ? 'bg-slate-100 text-slate-800 border border-slate-200'
                        : scanResult.suggestedAction === 'release' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : scanResult.isOverdue
                            ? 'bg-rose-50 text-rose-900 border border-rose-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {scanResult.suggestedAction === 'completed' ? (
                          <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="h-2 w-2 rounded-full animate-ping bg-current" />
                        )}
                        <span>
                          {scanResult.suggestedAction === 'completed'
                            ? '✓ Already Returned & Restocked (Transaction Closed)'
                            : scanResult.suggestedAction === 'release'
                              ? '✓ Ready for Physical Handover / Release'
                              : scanResult.isOverdue ? (
                                <span className="inline-flex items-center gap-1 text-rose-700">
                                  <FiAlertTriangle className="w-4 h-4 text-rose-600 animate-pulse shrink-0" />
                                  Overdue Return ({scanResult.dueStatus.daysOverdue} Days Late)
                                </span>
                              ) : (
                                'Active Loan · Check-In Return'
                              )}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/70 shadow-2xs">
                        {scanResult.suggestedAction === 'completed' 
                          ? 'Closed'
                          : scanResult.borrowType === 'INTER_SCHOOL_LIBRARY_USE' 
                            ? 'Library Use Only' 
                            : 'Regular Loan'}
                      </span>
                    </div>
                  )}

                  {/* COMPACT BORROWER + BOOK CARD (ID photo only) */}
                  {(() => {
                    const validIdCardPic = scanResult?.idCardPic && !idCardImgError ? scanResult.idCardPic : null;
                    const isPartner = scanResult.borrowType === 'INTER_SCHOOL_LIBRARY_USE';

                    return (
                      <div className="space-y-3">
                        {/* Borrower */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center gap-3">
                          {validIdCardPic ? (
                            <button
                              type="button"
                              onClick={() => setZoomImage({ url: validIdCardPic, title: 'School ID Card' })}
                              className="relative group w-16 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 cursor-pointer"
                              title="Click to zoom School ID"
                            >
                              <img
                                src={getBackendAssetUrl(validIdCardPic)}
                                alt="School ID Card"
                                onError={() => setIdCardImgError(true)}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                <FiZoomIn className="w-4 h-4" />
                              </span>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {scanResult.student?.firstname?.[0] || 'S'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-extrabold text-slate-900 truncate">
                              {scanResult.student?.firstname} {scanResult.student?.lastname}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              ID: <span className="font-mono font-bold text-slate-700">{scanResult.student?.student_number || 'N/A'}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0 border ${
                            isPartner ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isPartner ? 'Partner Student' : 'Home Student'}
                          </span>
                        </div>

                        {/* Book(s) */}
                        {scanResult.items?.map((item, idx) => {
                          const book = item.book || {};
                          return (
                            <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                              <h5 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                                {book.title || 'Book Title'}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Author: <span className="font-bold text-slate-700">{book.author || 'Not indicated'}</span>
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1 font-semibold">
                                  {isPartner && <FiBookOpen className="w-3.5 h-3.5 text-purple-600" />}
                                  {isPartner ? 'Library Use Only' : 'Standard Loan'} · {targetLib?.name || 'College Library'}
                                </span>
                                <span className="font-bold text-slate-700">
                                  {scanResult.dueStatus?.isOverdue ? (
                                    <span className="text-rose-600">Due Expired</span>
                                  ) : (
                                    <>Due: {formatPhilippineDate(item.due_date || scanResult.raw?.due_date)}</>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Book Condition Grading + Remarks (Active Return Mode) */}
                  {scanResult.suggestedAction === 'return' && !successAction && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          Book Condition Grading:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'good', label: 'Good / Intact', badge: 'No Damage', badgeCls: 'bg-emerald-100 text-emerald-800' },
                            { id: 'minor', label: 'Minor Wear', badge: 'Acceptable', badgeCls: 'bg-slate-100 text-slate-700' },
                            { id: 'damaged', label: 'Damaged', badge: 'Penalty', badgeCls: 'bg-rose-100 text-rose-800' },
                          ].map((cond) => (
                            <button
                              key={cond.id}
                              type="button"
                              onClick={() => setReturnCondition(cond.id)}
                              className={`rounded-2xl border p-2.5 text-center text-xs font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
                                returnCondition === cond.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-500'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span>{cond.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${cond.badgeCls}`}>{cond.badge}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Librarian Inspection Remarks <span className="text-slate-400 font-normal normal-case">(Optional)</span>:
                        </label>
                        <input
                          type="text"
                          value={returnRemarks}
                          onChange={(e) => setReturnRemarks(e.target.value)}
                          placeholder="e.g. Returned in good condition, pages intact..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Overdue Fine Decision Options (If Overdue Return) */}
                  {scanResult.isOverdue && scanResult.suggestedAction === 'return' && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <FiAlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                          Accrued Fine: {scanResult.dueStatus.daysOverdue} Days × ₱5.00
                        </span>
                        <span className="text-sm font-black font-mono text-rose-800">
                          ₱{(scanResult.dueStatus.daysOverdue * 5).toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setFineDecision('paid');
                            setIsFinePaid(true);
                            setFineAmount(String(scanResult.dueStatus.daysOverdue * 5));
                          }}
                          className={`py-1.5 px-1 rounded-xl border text-center transition cursor-pointer ${
                            fineDecision === 'paid' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            <FiCheck className="w-3.5 h-3.5" /> Paid Now
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFineDecision('unpaid');
                            setIsFinePaid(false);
                            setFineAmount(String(scanResult.dueStatus.daysOverdue * 5));
                          }}
                          className={`py-1.5 px-1 rounded-xl border text-center transition cursor-pointer ${
                            fineDecision === 'unpaid' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            <FiClock className="w-3.5 h-3.5" /> Pay Later
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFineDecision('waived');
                            setIsFinePaid(true);
                            setFineAmount('0');
                          }}
                          className={`py-1.5 px-1 rounded-xl border text-center transition cursor-pointer ${
                            fineDecision === 'waived' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            <FiSlash className="w-3.5 h-3.5" /> Waive Fine
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Success State Slip */}
                  {successAction && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-center animate-in zoom-in-95">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                        <FiCheckCircle className="w-6 h-6" />
                      </div>
                      <h4 className="font-extrabold text-sm">
                        {successAction === 'released' ? 'Book Handover Completed!' : 'Book Checked In & Cleared!'}
                      </h4>
                      <p className="text-[11px] text-emerald-700">Inventory synchronized across all desks in real-time.</p>
                      
                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                        >
                          <FiPrinter className="w-3.5 h-3.5" />
                          Print Slip
                        </button>
                        <button
                          type="button"
                          onClick={handleClose}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          Done / Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary 1-Click Action Buttons */}
                  {!successAction && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={actionProcessing}
                        className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {isWrongLibrary && !adminOverridden ? 'Close Notice' : 'Cancel'}
                      </button>

                      {isWrongLibrary && !adminOverridden ? (
                        isLibrarianAdmin ? (
                          <button
                            type="button"
                            onClick={() => setAdminOverridden(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                          >
                            <FiShield className="w-4 h-4" />
                            Admin Override: Process Here
                          </button>
                        ) : null
                      ) : scanResult.suggestedAction === 'completed' ? (
                        <button
                          type="button"
                          onClick={handleClose}
                          className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Done / Close
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleExecuteAction}
                          disabled={actionProcessing}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                            scanResult.suggestedAction === 'release'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          }`}
                        >
                          {actionProcessing ? (
                            <>
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                              Processing Circulation...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle className="w-4 h-4" />
                              {scanResult.suggestedAction === 'release' ? 'Authorize Handover / Release' : 'Confirm Return & Check In'}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR ZOOMING STUDENT PICTURES */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-slate-900 rounded-3xl p-3.5 border border-slate-700 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 px-2 border-b border-slate-800 text-white">
              <span className="text-xs font-bold tracking-tight">
                {typeof zoomImage === 'object' && zoomImage?.title ? zoomImage.title : 'Student Picture Preview'}
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 w-full flex items-center justify-center">
              <img
                src={getBackendAssetUrl(typeof zoomImage === 'object' && zoomImage?.url ? zoomImage.url : zoomImage)}
                alt="Enlarged Preview"
                className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-lg"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center pb-1">
              {scanResult?.student?.firstname} {scanResult?.student?.lastname} · ID: {scanResult?.student?.student_number}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
