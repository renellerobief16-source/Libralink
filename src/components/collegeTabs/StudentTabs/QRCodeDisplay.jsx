import { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Share2, X, CheckCircle, AlertCircle, Copy, Shield, Lock, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';

function QRCodeDisplay({ request, token, requestId, onClose, onShare }) {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
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

      // Card Container outline
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 700, 960);

      // 2. Header Banner Gradient
      const grad = ctx.createLinearGradient(0, 0, 720, 140);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(1, '#2563eb');
      ctx.fillStyle = grad;
      ctx.fillRect(10, 10, 700, 130);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('LIBRALINK CIRCULATION PASS', 35, 55);

      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#bfdbfe';
      ctx.fillText('OFFICIAL DIGITAL BORROWING & PICKUP TOKEN', 35, 80);

      // Verified Badge on Header
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(510, 35, 175, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('🛡️ VERIFIED PASS', 545, 57);

      // 3. Borrower Detail Card
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(35, 165, 650, 150, 16);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Field labels and values
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('BORROWER NAME', 55, 195);
      ctx.fillText('STUDENT ID / NUMBER', 380, 195);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(studentName, 55, 220);
      ctx.fillText(studentNum, 380, 220);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('HOME CAMPUS', 55, 260);
      ctx.fillText('REQUEST ID & TYPE', 380, 260);

      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(schoolName, 55, 285);
      ctx.fillText(`${currentRequestId} • ${requestType}`, 380, 285);

      // 4. Center QR Code Container
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(170, 335, 380, 380, 20);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw the QR Code image
      const qrImage = new Image();
      qrImage.src = qrCodeUrl;
      await new Promise((res) => {
        qrImage.onload = () => {
          ctx.drawImage(qrImage, 190, 355, 340, 340);
          res(true);
        };
      });

      // Scan instruction
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRESENT THIS QR PASS AT THE CIRCULATION COUNTER', 360, 755);

      // 5. Security & Verification Bottom Box
      ctx.textAlign = 'left';
      ctx.fillStyle = '#eff6ff';
      ctx.beginPath();
      ctx.roundRect(35, 780, 650, 155, 16);
      ctx.fill();
      ctx.strokeStyle = '#bfdbfe';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('🔒 OFFICIAL SECURITY & AUTHENTICATION PROTOCOL', 55, 810);

      ctx.fillStyle = '#334155';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('• This pass contains a cryptographically verified token for ' + itemsCount + ' book item(s).', 55, 835);
      ctx.fillText('• STRICTLY NON-TRANSFERABLE: Present with physical Student ID card for identity match.', 55, 855);
      ctx.fillText('• Valid for 1 counter handover transaction upon librarian scan & inspection.', 55, 875);

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
      console.error('Failed to copy QR code:', err);
    }
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl || !navigator.share) return;

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const currentRequestId = requestId || request?.request_id || 'libralink-qr';
      const file = new File([blob], `libralink-qr-${currentRequestId}.png`, { type: 'image/png' });

      await navigator.share({
        title: 'LibraLink Circulation Pass',
        text: `My borrowing request pass: ${currentRequestId}`,
        files: [file],
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approved':
      case 'ready_for_pickup':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'permission_ready':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'borrowed':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'returned':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
        return 'Approved - Ready for Pickup';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'rejected':
        return 'Rejected';
      case 'permission_ready':
        return 'Permission Ready';
      case 'borrowed':
        return 'Active Loan (Borrowed)';
      case 'returned':
        return 'Returned';
      default:
        return status;
    }
  };

  return (
    <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden bg-transparent p-0 relative">
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

      {/* Header */}
      <div className="mb-5 flex min-w-0 items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Official Circulation Pass</span>
          </div>
          <h2 className="mb-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">
            Your Digital Access QR Pass
          </h2>
          <p className="break-words text-xs sm:text-sm text-slate-500">
            Show this branded QR pass to the circulation desk librarian for book release and counter verification.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Request Info Banner */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-blue-200 block mb-0.5">Request ID</span>
            <span className="font-mono font-bold text-sm tracking-wide text-white truncate block">
              {request?.request_id || requestId}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-blue-200 block mb-0.5">Status</span>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {getStatusText(request?.status)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-blue-200 block mb-0.5">Lending Scope</span>
            <span className="font-semibold text-blue-100">
              {request?.request_type === 'INTER_SCHOOL' ? 'Inter-School' : 'Home Library'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-blue-200 block mb-0.5">Books Included</span>
            <span className="font-bold text-white">
              {request?.items?.length || 1} Item(s)
            </span>
          </div>
        </div>
      </div>

      {/* QR Code Display with Center L.png Logo */}
      <div className="mb-5 flex min-w-0 justify-center">
        <div className="relative flex flex-col items-center">
          {loading && (
            <div className="w-64 h-64 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-200 shadow-xs">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500 font-medium">Generating branded pass...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="w-64 h-64 bg-rose-50 rounded-3xl flex items-center justify-center border border-rose-200 p-4 shadow-xs">
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && qrCodeUrl && (
            <div className="flex flex-col items-center rounded-3xl bg-white p-4 sm:p-5 border-2 border-blue-100 shadow-md">
              <div className="relative p-2 bg-white rounded-2xl border border-slate-100">
                <img
                  src={qrCodeUrl}
                  alt="Official LibraLink QR Pass"
                  className="h-56 w-56 sm:h-64 sm:w-64 object-contain rounded-xl"
                />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                <Shield className="h-3 w-3 text-blue-600" />
                <span>LibraLink Verified Digital Security Pass</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:flex gap-2.5 sm:gap-3 mb-5">
        <button
          onClick={downloadQRCode}
          disabled={loading || !qrCodeUrl}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
        >
          <Download className="w-4 h-4 text-white" />
          <span>Download Pass Card</span>
        </button>
        <button
          onClick={copyQRCode}
          disabled={loading || !qrCodeUrl}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              <span>Copy Image</span>
            </>
          )}
        </button>
        {navigator.share && (
          <button
            onClick={shareQRCode}
            disabled={loading || !qrCodeUrl}
            className="col-span-2 sm:flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Share Pass</span>
          </button>
        )}
      </div>

      {/* Security & Verification Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-700 space-y-2 mb-4">
        <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-blue-600" />
          Security & Identity Verification Protocol
        </h4>
        <ul className="space-y-1.5 text-[11px] text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Physical ID Match:</strong> Librarians will cross-check this QR pass token with your registered student number and physical school ID card.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Single-Use Handover:</strong> This token securely expires and switches to "Active Loan" status upon physical book release.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Confidentiality:</strong> Do not forward or send this token to other students. You are accountable for all items released under this pass.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default QRCodeDisplay;

