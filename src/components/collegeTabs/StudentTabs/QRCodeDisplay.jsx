import { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Share2, X, CheckCircle, AlertCircle, Copy, Shield, Lock, Sparkles, Building2, CheckCircle2, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

function QRCodeDisplay({ request, token, requestId, onClose, onShare }) {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    generateQRCode();
  }, [request, token, requestId]);

  const generateQRCode = async () => {
    const qrToken = token || request?.qr_token;
    const reqId = requestId || request?.request_id;
    const reqStatus = request?.status || 'pending';

    if (!qrToken) {
      if (reqStatus === 'pending') {
        setError('Your request is pending approval. QR code will be available after librarian approval.');
      } else if (reqStatus === 'rejected') {
        setError('Your request has been rejected. QR code is not available.');
      } else {
        setError('QR token not available');
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qrData = qrToken || reqId;

      // 1. Generate base QR Code on off-screen canvas with high error correction ('H')
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, qrData, {
        width: 380,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1e3a8a', // LibraLink Deep Royal Navy
          light: '#ffffff',
        },
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 2. Load center L.png logo
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = '/L.png';

        await new Promise((resolve) => {
          logoImg.onload = () => {
            const size = canvas.width;
            const badgeSize = Math.floor(size * 0.22);
            const badgeX = (size - badgeSize) / 2;
            const badgeY = (size - badgeSize) / 2;
            const radius = 14;

            // Draw white rounded background badge for logo
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 3;

            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, radius);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Subtle border around logo badge
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#bfdbfe'; // subtle blue-200 ring
            ctx.stroke();

            // Clip and draw L.png logo
            ctx.beginPath();
            ctx.roundRect(badgeX + 3, badgeY + 3, badgeSize - 6, badgeSize - 6, radius - 2);
            ctx.clip();
            ctx.drawImage(logoImg, badgeX + 3, badgeY + 3, badgeSize - 6, badgeSize - 6);
            ctx.restore();

            resolve(true);
          };

          logoImg.onerror = () => {
            console.warn('L.png logo not loaded, rendering standard branded QR');
            resolve(false);
          };
        });
      }

      setQrCodeUrl(canvas.toDataURL('image/png'));
      setLoading(false);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // GENERATE OFFICIAL CIRCULATION PASS CARD ON DOWNLOAD
  // -------------------------------------------------------------
  const downloadQRCode = async () => {
    if (!qrCodeUrl) return;

    const currentRequestId = requestId || request?.request_id || 'LL-PASS';
    const studentName = request?.student?.firstname
      ? `${request.student.firstname} ${request.student.lastname || ''}`
      : 'Student Borrower';
    const studentNum = request?.student?.student_number || request?.student_number || 'N/A';
    const schoolName = request?.home_school?.school_name || request?.home_school_name || 'LibraLink Partner Library';
    const requestType = request?.request_type === 'INTER_SCHOOL' ? 'Inter-School Cross Borrowing' : 'Home Campus Lending';
    const itemsCount = request?.items?.length || 1;
    const nowStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = 720;
      cardCanvas.height = 980;
      const ctx = cardCanvas.getContext('2d');

      if (!ctx) {
        // Fallback to solo QR download
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = `libralink-pass-${currentRequestId}.png`;
        link.click();
        return;
      }

      // 1. Background Card with Rounded Border
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 720, 980);

      // Card border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, 688, 948);

      // 2. Header Banner
      const headerGrad = ctx.createLinearGradient(16, 16, 704, 16);
      headerGrad.addColorStop(0, '#1e3a8a');
      headerGrad.addColorStop(1, '#312e81');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(16, 16, 688, 140);

      // Header text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('LibraLink Digital Circulation Pass', 45, 62);

      ctx.fillStyle = '#bfdbfe';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Official Library Borrower Access & Counter Release Token', 45, 92);

      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`TOKEN ID: ${currentRequestId}`, 45, 128);

      // 3. Borrower Detail Badges
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.fillRect(40, 180, 640, 110);
      ctx.strokeRect(40, 180, 640, 110);

      // Column 1: Borrower Info
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('STUDENT BORROWER', 60, 208);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(studentName, 60, 233);

      ctx.fillStyle = '#475569';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`ID: ${studentNum} • ${schoolName}`, 60, 260);

      // Column 2: Scope & Status
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('LENDING TYPE', 450, 208);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(requestType, 450, 233);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('STATUS: READY FOR PICKUP', 450, 260);

      // 4. QR Code Container Box
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.fillRect(150, 315, 420, 420);
      ctx.strokeRect(150, 315, 420, 420);

      // Draw QR Image onto canvas
      const qrImg = new Image();
      qrImg.src = qrCodeUrl;
      await new Promise((resolve) => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 170, 335, 380, 380);
          resolve(true);
        };
        qrImg.onerror = () => resolve(false);
      });

      // 5. Instruction & Security Box at bottom
      ctx.fillStyle = '#eff6ff';
      ctx.strokeStyle = '#bfdbfe';
      ctx.lineWidth = 1;
      ctx.fillRect(40, 755, 640, 175);
      ctx.strokeRect(40, 755, 640, 175);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('SECURITY & VERIFICATION PROTOCOL', 55, 785);

      ctx.fillStyle = '#1d4ed8';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Scan this pass at the circulation desk counter for automated checkout.', 55, 808);

      ctx.fillStyle = '#334155';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('• This pass contains a cryptographically verified token for ' + itemsCount + ' book item(s).', 55, 835);
      ctx.fillText('• STRICTLY NON-TRANSFERABLE: Present with physical Student ID card for identity match.', 55, 855);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 10px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Issued on: ${nowStr} • System ID: ${currentRequestId} • LibraLink Inter-Library Consortium`, 55, 912);

      // Trigger Download
      const link = document.createElement('a');
      link.href = cardCanvas.toDataURL('image/png');
      link.download = `LibraLink-Pass-${currentRequestId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show security feedback toast
      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 5000);
    } catch (err) {
      console.error('Error generating pass card:', err);
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `libralink-qr-${currentRequestId}.png`;
      link.click();
      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 5000);
    }
  };

  const copyQRCode = async () => {
    if (!qrCodeUrl) return;

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy QR code image:', err);
      // Fallback to token text copy
      try {
        const qrToken = token || request?.qr_token || requestId || request?.request_id;
        if (qrToken) {
          await navigator.clipboard.writeText(qrToken);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (clipErr) {
        console.error('Failed fallback clipboard write:', clipErr);
      }
    }
  };

  const copyRequestId = async () => {
    const currentReqId = request?.request_id || requestId || 'LL-PASS';
    try {
      await navigator.clipboard.writeText(currentReqId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy request ID:', err);
    }
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl) return;

    const currentRequestId = requestId || request?.request_id || 'LL-PASS';

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], `LibraLink-Pass-${currentRequestId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'LibraLink Digital Pass',
          text: `My LibraLink borrowing pass for request ${currentRequestId}`,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'LibraLink Digital Pass',
          text: `My LibraLink borrowing pass for request: ${currentRequestId}`,
        });
      } else {
        await navigator.clipboard.writeText(`LibraLink Pass ID: ${currentRequestId}`);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to share:', err);
      }
    }
  };

  const getDisplayStatus = () => {
    const rawStatus = request?.status;
    if (rawStatus === 'approved' || rawStatus === 'ready_for_pickup') {
      return 'Ready for Counter Pickup';
    }
    if (rawStatus === 'borrowed') {
      return 'Active Loan (Borrowed)';
    }
    if (rawStatus === 'returned') {
      return 'Returned';
    }
    if (rawStatus === 'rejected') {
      return 'Rejected';
    }
    if (rawStatus === 'pending') {
      return 'Pending Approval';
    }
    if (rawStatus === 'permission_ready') {
      return 'Permission Ready';
    }
    // If a token exists, it's ready for counter pickup
    if (token || request?.qr_token) {
      return 'Ready for Counter Pickup';
    }
    return rawStatus || 'Ready for Counter Pickup';
  };

  const currentRequestId = request?.request_id || requestId || 'LL-PASS';
  const displayStatus = getDisplayStatus();

  const passCardContent = (
    <div className="box-border w-full max-w-md mx-auto rounded-3xl bg-white p-5 sm:p-7 shadow-xl border border-slate-200/80 relative my-2 sm:my-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mb-1.5">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span>Official Circulation Pass</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Your Digital Access Pass
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
            Show this branded pass to the circulation desk librarian for book release and counter verification.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pass"
            className="shrink-0 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Ticket / Request Info Header Card */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 text-white shadow-md border border-blue-900/50 relative">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top row: Request ID with 1-tap copy & Lending Scope */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block mb-0.5">
              Request ID
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm sm:text-base text-white tracking-wide break-all">
                {currentRequestId}
              </span>
              <button
                type="button"
                onClick={copyRequestId}
                title="Copy Request ID"
                className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                {copiedId ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              {copiedId && (
                <span className="text-[10px] font-bold text-emerald-400 animate-fade-in">Copied!</span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block mb-0.5">
              Lending Scope
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-200 border border-blue-400/30">
              <Building2 className="w-3 h-3 text-blue-300" />
              {request?.request_type === 'INTER_SCHOOL' ? 'Inter-School Access' : 'Home Library'}
            </span>
          </div>
        </div>

        {/* Bottom row: Status badge & Books included */}
        <div className="grid grid-cols-2 gap-3 text-xs items-center">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block mb-1">
              Status
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{displayStatus}</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block mb-1">
              Books Included
            </span>
            <span className="font-bold text-white text-xs sm:text-sm">
              {request?.items?.length || 1} Item(s)
            </span>
          </div>
        </div>
      </div>

      {/* Branded QR Pass Display with Center L.png Logo */}
      <div className="mb-4 flex flex-col items-center">
        {loading && (
          <div className="w-60 h-60 sm:w-64 sm:h-64 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 shadow-xs">
            <div className="text-center">
              <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Generating verified pass...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="w-60 h-60 sm:w-64 sm:h-64 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-200 p-4 shadow-xs">
            <div className="text-center">
              <AlertCircle className="w-9 h-9 text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && qrCodeUrl && (
          <div className="flex flex-col items-center rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200 shadow-sm w-full max-w-[280px]">
            <div className="relative p-2 bg-white rounded-xl border border-slate-100">
              <img
                src={qrCodeUrl}
                alt="Official LibraLink QR Pass"
                className="h-48 w-48 sm:h-56 sm:w-56 object-contain rounded-lg"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/70 text-center">
              <Shield className="h-3 w-3 text-blue-600 shrink-0" />
              <span>LibraLink Verified Digital Pass</span>
            </div>
          </div>
        )}
      </div>

      {/* Stacked Action Buttons */}
      <div className="flex flex-col gap-2.5 mb-4">
        {/* Primary Action Button (Full Width) */}
        <button
          type="button"
          onClick={downloadQRCode}
          disabled={loading || !qrCodeUrl}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4 text-white" />
          <span>Download Official Pass Card</span>
        </button>

        {/* Secondary Row (Side by side) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copyQRCode}
            disabled={loading || !qrCodeUrl}
            className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Image</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={shareQRCode}
            disabled={loading || !qrCodeUrl}
            className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Share Pass</span>
          </button>
        </div>
      </div>

      {/* Security & Verification Protocol */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 sm:p-4 text-xs text-slate-700 space-y-2">
        <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span>Security & Identity Verification Protocol</span>
        </h4>
        <ul className="space-y-1.5 text-[11px] text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold leading-none mt-0.5">•</span>
            <span><strong>Physical ID Match:</strong> Librarians will cross-check this QR pass token with your registered student number and physical school ID card.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold leading-none mt-0.5">•</span>
            <span><strong>Single-Use Handover:</strong> This token securely expires and switches to "Active Loan" status upon physical book release.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold leading-none mt-0.5">•</span>
            <span><strong>Confidentiality:</strong> Do not forward or send this token to others. You are accountable for all items released under this pass.</span>
          </li>
        </ul>
      </div>
    </div>
  );

  // When rendered with onClose, display as a dedicated edge-to-edge full-screen screen (no floating overlay)
  if (onClose) {
    return (
      <div className="fixed inset-0 z-[150] w-full h-[100dvh] bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Floating Download Security Toast */}
        {downloadSuccessToast && (
          <div className="fixed top-6 right-6 z-50 flex items-start gap-3 rounded-2xl bg-slate-900 text-white p-4 shadow-2xl border border-slate-700 max-w-md animate-slide-up">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Official Circulation Pass Downloaded</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-300 font-bold">Secure</span>
              </h5>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Please present this pass along with your <strong>Physical Student ID Card</strong> at the library counter. Do not share your private pass token.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDownloadSuccessToast(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Sticky Top Navigation Bar */}
        <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Library</span>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Digital Circulation Pass</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadQRCode}
              disabled={loading || !qrCodeUrl}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Pass</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95 cursor-pointer shadow-2xs"
              aria-label="Close pass"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Viewport Body */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 flex flex-col items-center">
          {passCardContent}
        </main>
      </div>
    );
  }

  // Inline card fallback (used when embedded in receipts without modal container)
  return passCardContent;
}

export default QRCodeDisplay;
