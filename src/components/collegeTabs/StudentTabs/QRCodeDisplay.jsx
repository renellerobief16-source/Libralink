import { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Share2, X, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import QRCode from 'qrcode';

function QRCodeDisplay({ request, token, requestId, onClose, onShare }) {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    generateQRCode();
  }, [request, token, requestId]);

  const generateQRCode = async () => {
    // Use token/requestId if provided, otherwise use request object
    const qrToken = token || request?.qr_token;
    const reqId = requestId || request?.request_id;
    const reqType = request?.request_type || 'HOME';
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
      // Generate QR code with the token
      const qrData = JSON.stringify({
        request_id: reqId,
        token: qrToken,
        type: reqType,
      });

      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e3a8a',
          light: '#ffffff',
        },
      });

      setQrCodeUrl(url);
      setLoading(false);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const currentRequestId = requestId || request?.request_id || 'libralink-qr';
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `libralink-qr-${currentRequestId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        title: 'LibraLink Borrowing Request',
        text: `My borrowing request ID: ${currentRequestId}`,
        files: [file],
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'permission_ready':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ready_for_pickup':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'borrowed':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'returned':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'permission_ready':
        return 'Permission Letter Ready';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'borrowed':
        return 'Borrowed';
      case 'returned':
        return 'Returned';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your QR Code</h2>
          <p className="text-gray-600 text-sm">Show this QR code to the librarian for book pickup/return</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Request Info */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-blue-600 mb-1">Request ID</p>
            <p className="font-semibold text-blue-900">{request?.request_id}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">Status</p>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request?.status)}`}>
              {getStatusText(request?.status)}
            </span>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">Request Type</p>
            <p className="font-semibold text-blue-900">
              {request?.request_type === 'INTER_SCHOOL' ? 'Inter-School' : 'Home Library'}
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">Books</p>
            <p className="font-semibold text-blue-900">{request?.items?.length || 0} items</p>
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {loading && (
            <div className="w-72 h-72 bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Generating QR code...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="w-72 h-72 bg-red-50 rounded-xl flex items-center justify-center border border-red-200">
              <div className="text-center p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && qrCodeUrl && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
              <img
                src={qrCodeUrl}
                alt="Borrowing Request QR Code"
                className="w-60 h-60"
              />
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">Scan this code at the library</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={downloadQRCode}
          disabled={loading || !qrCodeUrl}
          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Download
        </button>
        <button
          onClick={copyQRCode}
          disabled={loading || !qrCodeUrl}
          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy
            </>
          )}
        </button>
        {navigator.share && (
          <button
            onClick={shareQRCode}
            disabled={loading || !qrCodeUrl}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          How to use this QR code
        </h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Show this QR code to the librarian when picking up your books</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>The librarian will scan it to verify your borrowing request</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Keep this QR code safe until you return all borrowed books</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>For inter-school borrowing, bring your permission letter along with this QR code</span>
          </li>
        </ul>
      </div>

      {/* Warning */}
      {request?.request_type === 'INTER_SCHOOL' && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">Inter-School Borrowing</p>
              <p className="text-orange-700">
                Remember to bring your permission letter when visiting the partner school.
                Books must be used within the partner library premises.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRCodeDisplay;
