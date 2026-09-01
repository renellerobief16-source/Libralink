import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, X, CheckCircle, AlertCircle, Book, User, MapPin, Loader2, Phone, Mail, IdCard, RefreshCw, Scan } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { scanQRToken, releaseBookItem, returnBookItem } from '../../../utils/api';
import { getBackendAssetUrl } from '../../../utils/api';

function LibrarianQRScanner({ darkMode }) {
  const [scanning, setScanning] = useState(false);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [itemToRelease, setItemToRelease] = useState(null);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    if (!scanning || !videoRef.current) return undefined;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        console.log('[QR SCANNER] Scan result:', result);
        const decodedText = typeof result === 'string' ? result : result.data;
        console.log('[QR SCANNER] Decoded text:', decodedText);
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
      console.log('[QR SCANNER] Camera started successfully');
    }).catch((err) => {
      console.error('[QR SCANNER] Camera start error:', err);
      setScanning(false);
      setError('Unable to access the camera. Please allow camera access or enter the token manually.');
    });

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [scanning]);

  const handleScan = async (token) => {
    setLoading(true);
    setError(null);

    try {
      const response = await scanQRToken(token.trim());
      if (response.error) {
        setError(response.error.message || 'Invalid QR token');
        setRequest(null);
      } else {
        const scannedRequest = response.data;
        if (scannedRequest.status === 'pending') {
          setError('This request is still pending approval. Please approve it first in Borrow Requests.');
          setRequest(null);
        } else if (scannedRequest.status === 'rejected') {
          setError('This request has been rejected.');
          setRequest(null);
        } else {
          setRequest(scannedRequest);
          setError(null);
        }
      }
    } catch (err) {
      setError('Failed to scan QR code');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      setError('Please enter a QR token');
      return;
    }

    await handleScan(manualToken.trim());
  };

  const handleReleaseBook = async (itemId) => {
    setItemToRelease(itemId);
    setShowReleaseConfirm(true);
  };

  const confirmReleaseBook = async () => {
    setLoading(true);
    try {
      const response = await releaseBookItem(itemToRelease);
      console.log('[QR SCANNER] Release response:', response);
      if (response.error) {
        const serverMessage = response.error?.response?.data?.error || response.error?.response?.data?.message;
        const message = serverMessage || response.error?.message || 'Failed to release book';
        console.error('[QR SCANNER] Release error:', response.error);
        alert(message);
      } else {
        alert('Book released successfully!');
        const updatedResponse = await scanQRToken(request.qr_token);
        if (!updatedResponse.error) {
          setRequest(updatedResponse.data);
        }
      }
    } catch (err) {
      console.error('[QR SCANNER] Release catch error:', err);
      alert('Failed to release book: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setShowReleaseConfirm(false);
      setItemToRelease(null);
    }
  };

  const handleReturnBook = async (itemId) => {
    if (!confirm('Are you sure you want to return this book?')) return;

    setLoading(true);
    try {
      const response = await returnBookItem(itemId);
      if (response.error) {
        const serverMessage = response.error?.response?.data?.error || response.error?.response?.data?.message;
        const message = serverMessage || response.error?.message || 'Failed to return book';
        alert(message);
      } else {
        alert('Book returned successfully!');
        const updatedResponse = await scanQRToken(request.qr_token);
        if (!updatedResponse.error) {
          setRequest(updatedResponse.data);
        }
      }
    } catch (err) {
      alert('Failed to return book: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
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
      case 'released':
        return 'bg-teal-100 text-teal-700 border-teal-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'permission_ready':
        return 'Permission Ready';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'borrowed':
        return 'Borrowed';
      case 'returned':
        return 'Returned';
      case 'released':
        return 'Released';
      default:
        return status;
    }
  };

  const resetScanner = () => {
    setRequest(null);
    setError(null);
    setManualToken('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#172033]">Book Approved - QR Scanner</h1>
                <p className="text-sm text-[#64748B]">Scan student QR code to process approved borrowing requests</p>
              </div>
            </div>
            <button
              onClick={resetScanner}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>

          {!request ? (
            <>
              {/* Manual Token Input */}
              <div className="bg-[#F8FAFC] rounded-xl p-6 mb-6 border border-[#E2E8F0]">
                <video
                  ref={videoRef}
                  className={`${scanning ? 'block' : 'hidden'} w-full max-w-md mx-auto rounded-lg mb-4 bg-black aspect-video object-cover`}
                  muted
                  playsInline
                  autoPlay
                />
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => setScanning(value => !value)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg border border-[#2563EB] text-[#2563EB] font-semibold hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {scanning ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {scanning ? 'Stop Camera' : 'Use Camera'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <QrCode className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Enter QR token manually..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all bg-white text-[#172033] placeholder-[#64748B]"
                    />
                  </div>
                  <button
                    onClick={handleManualScan}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Scan className="w-5 h-5" />
                        Scan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-[#172033]">
                  <QrCode className="w-5 h-5 text-[#2563EB]" />
                  How to Use
                </h4>
                <ul className="space-y-2 text-sm text-[#64748B]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] mt-1">•</span>
                    <span>Ask the student to show their borrowing request QR code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] mt-1">•</span>
                    <span>Enter the QR token manually or use a QR scanner device</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] mt-1">•</span>
                    <span>Review the request details before releasing books</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] mt-1">•</span>
                    <span>For inter-school requests, verify the permission letter</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Request Found Card */}
              <div className="bg-[#F0FDF4] rounded-xl p-4 mb-6 border border-[#16A34A]">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                  <h3 className="font-semibold text-[#172033]">Request Found</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[#64748B] mb-1">Request ID</p>
                    <p className="font-medium text-[#172033]">{request.request_id}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Status</p>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#16A34A] text-white">
                      {request.status === 'approved' ? 'Approved' : getStatusText(request.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Request Type</p>
                    <p className="font-medium text-[#172033]">
                      {request.request_type === 'INTER_SCHOOL' ? 'Inter-School' : 'Home Library'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Books</p>
                    <p className="font-medium text-[#172033]">{request.items?.length || 0} {request.items?.length === 1 ? 'item' : 'items'}</p>
                  </div>
                </div>
              </div>

              {/* Student Information + ID Picture */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Student Information */}
                <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-[#E2E8F0]">
                  <h3 className="font-semibold text-[#172033] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#2563EB]" />
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[#64748B] mb-1">Name</p>
                        <p className="font-medium text-[#172033]">
                          {request.student?.firstname} {request.student?.lastname || 'Not available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <IdCard className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[#64748B] mb-1">Student ID</p>
                        <p className="font-medium text-[#172033]">
                          {request.student?.student_number || 'Not available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[#64748B] mb-1">Contact Number</p>
                        <p className="font-medium text-[#172033]">
                          {request.contact_number || 'Not available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[#64748B] mb-1">Address</p>
                        <p className="font-medium text-[#172033]">
                          {request.address || 'Not available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <Mail className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[#64748B] mb-1">Email</p>
                        <p className="font-medium text-[#172033] break-all">
                          {request.student?.email || 'Not available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ID Picture */}
                <div className="bg-white rounded-xl p-5 border border-[#E2E8F0]">
                  <h3 className="font-semibold text-[#172033] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#2563EB]" />
                    ID Picture
                  </h3>
                  <div className="flex items-center justify-center">
                    {request.id_picture_url ? (
                      <img
                        src={getBackendAssetUrl(request.id_picture_url)}
                        alt="Student ID"
                        className="w-full max-w-[200px] h-auto rounded-lg border border-[#E2E8F0] object-cover"
                        style={{ aspectRatio: '3/4' }}
                      />
                    ) : (
                      <div className="w-full max-w-[200px] aspect-[3/4] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col items-center justify-center">
                        <User className="w-12 h-12 text-[#64748B] mb-2" />
                        <p className="text-sm text-[#64748B] text-center px-2">No ID Picture Available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Permission Letter Warning for Inter-School */}
              {request.request_type === 'INTER_SCHOOL' && !request.permission_letter_generated && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <p className="font-medium mb-1">Permission Letter Required</p>
                      <p className="text-orange-700">
                        This is an inter-school borrowing request. Please verify that the student has a valid permission letter before releasing books.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Requested Books */}
              <div className="bg-white rounded-xl p-5 mb-6 border border-[#E2E8F0]">
                <h3 className="font-semibold text-[#172033] mb-4 flex items-center gap-2">
                  <Book className="w-5 h-5 text-[#2563EB]" />
                  Requested Books ({request.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {request.items?.map((item) => (
                    <div key={item.item_id} className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-[#172033]">{item.book?.title}</p>
                          <p className="text-sm text-[#64748B]">{item.book?.author}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <MapPin className="w-4 h-4 text-[#64748B]" />
                            <span className="text-xs text-[#64748B]">{item.owner_school?.school_name}</span>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#16A34A] text-white">
                          {item.status === 'released' ? 'Released' : item.status || 'Pending'}
                        </span>
                      </div>

                      {/* Action Buttons for Each Item */}
                      {(item.status === 'approved' || request.status === 'approved') && item.status !== 'released' && item.status !== 'returned' && (
                        <button
                          onClick={() => handleReleaseBook(item.item_id)}
                          disabled={loading}
                          className="w-full px-4 py-2 rounded-lg bg-[#16A34A] text-white font-semibold hover:bg-[#15803D] transition-all disabled:opacity-50 text-sm mt-3"
                        >
                          Release Book
                        </button>
                      )}

                      {item.status === 'released' && (
                        <button
                          onClick={() => handleReturnBook(item.item_id)}
                          disabled={loading}
                          className="w-full px-4 py-2 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-all disabled:opacity-50 text-sm mt-3 flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Returning
                        </button>
                      )}

                      {item.status === 'returned' && (
                        <div className="w-full px-4 py-2 rounded-lg text-center text-sm bg-[#F8FAFC] text-[#64748B] mt-3">
                          Book Returned
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3">
                <button
                  onClick={resetScanner}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[#172033] font-semibold hover:bg-[#F8FAFC] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Scan className="w-5 h-5" />
                  Scan Another
                </button>
                <button
                  onClick={resetScanner}
                  className="flex-1 px-6 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Release Confirmation Overlay */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                <Book className="w-6 h-6 text-[#16A34A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#172033]">Release Book</h3>
            </div>
            <p className="text-[#64748B] mb-6">
              Are you sure you want to release this book? The student will be able to borrow it. Please verify the student's identity before proceeding.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReleaseConfirm(false);
                  setItemToRelease(null);
                }}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#172033] font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReleaseBook}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-[#16A34A] text-white font-medium hover:bg-[#15803D] transition-colors disabled:opacity-50"
              >
                {loading ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianQRScanner;
