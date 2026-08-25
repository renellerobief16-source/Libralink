import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, MapPin, User, Book, Filter, Search, Eye, Printer, AlertCircle } from 'lucide-react';
import { getSchoolBorrowRequests, approveBorrowRequest, rejectBorrowRequest, generatePermissionLetter } from '../../../utils/api';

function LibrarianRequestManagement({ schoolId, librarianId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [schoolId, selectedStatus]);

  const loadRequests = async () => {
    if (!schoolId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getSchoolBorrowRequests(schoolId, selectedStatus);
      if (response.error) {
        setError(response.error.message || 'Failed to load requests');
        setRequests([]);
      } else {
        setRequests(response.data || []);
      }
    } catch (err) {
      setError('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request =>
    request.request_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.student?.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.student?.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.student?.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = async (requestId) => {
    if (!confirm('Are you sure you want to approve this request?')) return;

    setActionLoading(true);
    try {
      const response = await approveBorrowRequest(requestId);
      if (response.error) {
        alert('Failed to approve request: ' + response.error.message);
      } else {
        alert('Request approved successfully!');
        loadRequests();
      }
    } catch (err) {
      alert('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const remarks = prompt('Enter reason for rejection (optional):');
    if (remarks === null) return; // User cancelled

    setActionLoading(true);
    try {
      const response = await rejectBorrowRequest(requestId, remarks);
      if (response.error) {
        alert('Failed to reject request: ' + response.error.message);
      } else {
        alert('Request rejected successfully!');
        loadRequests();
      }
    } catch (err) {
      alert('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePermissionLetter = async (requestId) => {
    if (!confirm('Generate permission letter for this inter-school request?')) return;

    setActionLoading(true);
    try {
      // In a real implementation, this would generate a PDF and upload it
      const letterUrl = `/uploads/permission-letters/${requestId}.pdf`;
      const response = await generatePermissionLetter(requestId, letterUrl);
      if (response.error) {
        alert('Failed to generate permission letter: ' + response.error.message);
      } else {
        alert('Permission letter generated successfully!');
        loadRequests();
      }
    } catch (err) {
      alert('Failed to generate permission letter');
    } finally {
      setActionLoading(false);
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
      default:
        return status;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'permission_ready', label: 'Permission Ready' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
    { value: 'borrowed', label: 'Borrowed' },
    { value: 'returned', label: 'Returned' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Borrowing Requests</h2>
          <p className="text-gray-600 text-sm">Manage student borrowing requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by request ID, student name, or student number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              onClick={loadRequests}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
          <p className="text-sm text-gray-600">
            {searchQuery ? 'Try adjusting your search' : `No ${selectedStatus} requests`}
          </p>
        </div>
      )}

      {/* Request List */}
      {!loading && !error && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.request_id}
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">{request.request_id}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {request.request_type === 'INTER_SCHOOL' ? 'Inter-School' : 'Home Library'}
                    </span>
                  </div>
                  
                  {/* Student Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      {request.student?.firstname} {request.student?.lastname}
                    </span>
                    <span className="text-sm text-gray-500">({request.student?.student_number})</span>
                  </div>

                  {/* Request Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Book className="w-4 h-4" />
                      <span>{request.items?.length || 0} books</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRequest(request)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Action Buttons */}
              {request.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(request.request_id)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.request_id)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {request.status === 'approved' && request.request_type === 'INTER_SCHOOL' && !request.permission_letter_generated && (
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleGeneratePermissionLetter(request.request_id)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Generate Permission Letter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mx-auto my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedRequest.request_id}</h2>
                  <p className="text-blue-100 text-sm">
                    {selectedRequest.request_type === 'INTER_SCHOOL' ? 'Inter-School' : 'Home Library'} Request
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                >
                  <XCircle className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Student Information */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600 mb-1">Name</p>
                    <p className="font-medium text-blue-900">
                      {selectedRequest.student?.firstname} {selectedRequest.student?.lastname}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 mb-1">Student Number</p>
                    <p className="font-medium text-blue-900">{selectedRequest.student?.student_number}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 mb-1">Email</p>
                    <p className="font-medium text-blue-900">{selectedRequest.student?.email}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 mb-1">Contact</p>
                    <p className="font-medium text-blue-900">{selectedRequest.contact_number}</p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Request Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Purpose</p>
                    <p className="font-medium text-gray-900">{selectedRequest.purpose}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Address</p>
                    <p className="font-medium text-gray-900">{selectedRequest.address}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Request Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                      {getStatusText(selectedRequest.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Books List */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Book className="w-5 h-5" />
                  Requested Books ({selectedRequest.items?.length || 0})
                </h3>
                <div className="space-y-3">
                  {selectedRequest.items?.map((item) => (
                    <div key={item.item_id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{item.book?.title}</p>
                          <p className="text-sm text-gray-500">{item.book?.author}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-600">{item.owner_school?.school_name}</span>
                            {item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                Library Use Only
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'released' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ID Picture */}
              {selectedRequest.id_picture_url && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">ID Picture</h3>
                  <img
                    src={selectedRequest.id_picture_url}
                    alt="Student ID"
                    className="max-w-xs rounded-lg border border-gray-300"
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedRequest.request_id);
                        setSelectedRequest(null);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedRequest.request_id);
                        setSelectedRequest(null);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianRequestManagement;
