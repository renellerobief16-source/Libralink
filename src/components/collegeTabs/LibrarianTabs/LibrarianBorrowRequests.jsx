import { useState, useEffect } from "react";
import { FiBook, FiUser, FiCalendar, FiMapPin, FiPhone, FiCheckCircle, FiXCircle, FiClock, FiEye, FiChevronDown, FiChevronUp, FiRefreshCw, FiAlertTriangle, FiGlobe } from "react-icons/fi";
import { getBorrowRequests, updateBorrowRequestStatus, getAllActiveBorrows, getBookById, getBackendAssetUrl, returnBook } from "../../../utils/api";
import api from "../../../utils/api";
import { useNotifications } from "../../../context/NotificationContext";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";

const animationStyles = `
  @keyframes drawCircle {
    to {
      stroke-dashoffset: 0;
    }
  }
  
  @keyframes drawCheck {
    to {
      stroke-dashoffset: 0;
    }
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('approve-animation-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'approve-animation-styles';
  styleSheet.textContent = animationStyles;
  document.head.appendChild(styleSheet);
}

function getStoredUserId() {
  const rawUser = localStorage.getItem('currentUserId') || localStorage.getItem('currentUser');
  if (!rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser);
    return parsedUser?.id || parsedUser?.sub || rawUser;
  } catch {
    return rawUser;
  }
}

function AdminBorrowRequests() {
  const { addNotification } = useNotifications();
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [borrowRequestsLoading, setBorrowRequestsLoading] = useState(false);
  const [interSchoolRequests, setInterSchoolRequests] = useState([]);
  const [interSchoolRequestsLoading, setInterSchoolRequestsLoading] = useState(false);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [activeBorrowsLoading, setActiveBorrowsLoading] = useState(false);
  const [booksData, setBooksData] = useState({});
  const [studentsData, setStudentsData] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState({});
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [requestToProcess, setRequestToProcess] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [approvedRequest, setApprovedRequest] = useState(null);
  const [returningBookId, setReturningBookId] = useState(null);
  const [activeRequestTab, setActiveRequestTab] = useState('home-school'); // 'home-school' or 'inter-school'

  const handleReturnBook = async (borrowId) => {
    try {
      setReturningBookId(borrowId);
      const { error } = await returnBook(borrowId);
      if (error) {
        console.error('Error returning book:', error);
        alert('Failed to return book. Please try again.');
        return;
      }
      // Remove from active borrows list
      setActiveBorrows(prev => prev.filter(b => b.borrow_id !== borrowId));
      // Refresh stats
      window.dispatchEvent(new CustomEvent('refreshStats'));
    } catch (err) {
      console.error('Error returning book:', err);
      alert('Failed to return book. Please try again.');
    } finally {
      setReturningBookId(null);
    }
  };

  const fetchBorrowRequests = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      return;
    }

    setBorrowRequestsLoading(true);
    try {
      console.log('[LIBRARIAN] Fetching home school borrow requests for school:', schoolId);
      const { data, error } = await getBorrowRequests(schoolId);
      console.log('[LIBRARIAN] Home school borrow requests response:', data, error);
      if (error) throw error;
      
      // Keep the home queue limited to requests owned by this library.
      setBorrowRequests((data || []).filter(request => request.request_type !== 'INTER_SCHOOL'));
      
      // Fetch all book details at once (more efficient)
      if (data && data.length > 0) {
        const uniqueBookIds = [...new Set(data.flatMap(r => r.items?.map(item => item.book_id) || [r.book_id]))].filter(id => id && id.length > 0);
        
        console.log('[LIBRARIAN] Unique book IDs:', uniqueBookIds);
        
        // Fetch books using API
        if (uniqueBookIds.length > 0) {
          try {
            const booksMap = {};
            for (const bookId of uniqueBookIds) {
              const bookResponse = await getBookById(bookId);
              if (bookResponse.data) {
                booksMap[bookId] = bookResponse.data;
              }
            }
            setBooksData(booksMap);
          } catch (err) {
            console.error('Error fetching books:', err);
          }
        }
        
        // Note: Student data is already included in the borrowing request response from backend
        // No need to fetch separately
        console.log('[LIBRARIAN] Student data from requests:', data.map(r => r.student));
      }
    } catch (err) {
      console.error('Error fetching borrow requests:', err);
      setBorrowRequests([]); // Set empty array on error to prevent UI issues
    } finally {
      setBorrowRequestsLoading(false);
    }
  };

  const fetchInterSchoolRequests = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      return;
    }

    setInterSchoolRequestsLoading(true);
    try {
      console.log('[LIBRARIAN] Fetching inter-school requests for school (owner school):', schoolId);
      const response = await api.get(`/borrow-requests/partner/${schoolId}`);
      console.log('[LIBRARIAN] Inter-school requests full response:', response);
      console.log('[LIBRARIAN] Inter-school requests data:', response.data);
      console.log('[LIBRARIAN] Inter-school requests error:', response.error);
      if (response.error) throw response.error;
      setInterSchoolRequests(response.data || []);
      
      // Fetch all book details at once
      if (response.data && response.data.length > 0) {
        const uniqueBookIds = [...new Set(response.data.flatMap(r => r.items?.map(item => item.book_id) || [r.book_id]))].filter(id => id && id.length > 0);
        
        if (uniqueBookIds.length > 0) {
          try {
            const booksMap = {};
            for (const bookId of uniqueBookIds) {
              const bookResponse = await getBookById(bookId);
              if (bookResponse.data) {
                booksMap[bookId] = bookResponse.data;
              }
            }
            setBooksData(prev => ({ ...prev, ...booksMap }));
          } catch (err) {
            console.error('Error fetching books:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching inter-school requests:', err);
      setInterSchoolRequests([]);
    } finally {
      setInterSchoolRequestsLoading(false);
    }
  };

  const fetchActiveBorrows = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      return;
    }

    setActiveBorrowsLoading(true);
    try {
      const { data, error } = await getAllActiveBorrows(schoolId);
      if (error) throw error;
      setActiveBorrows(data || []);
      
      // Fetch all book details at once (more efficient)
      if (data && data.length > 0) {
        const uniqueBookIds = [...new Set(data.map(b => b.book_id))].filter(id => id && id.length > 0);
        const uniqueStudentIds = [...new Set(data.map(b => b.student_id))].filter(id => id && id.length > 0);
        
        // Fetch books using API
        if (uniqueBookIds.length > 0) {
          try {
            const booksMap = {};
            for (const bookId of uniqueBookIds) {
              const bookResponse = await getBookById(bookId);
              if (bookResponse.data) {
                booksMap[bookId] = bookResponse.data;
              }
            }
            setBooksData(booksMap);
          } catch (err) {
            console.error('Error fetching books:', err);
          }
        }
        
        // Fetch students using API
        if (uniqueStudentIds.length > 0) {
          try {
            const studentsMap = {};
            for (const studentId of uniqueStudentIds) {
              const studentResponse = await api.get(`/users/${studentId}`);
              if (studentResponse.data) {
                studentsMap[studentId] = studentResponse.data;
              }
            }
            setStudentsData(studentsMap);
          } catch (err) {
            console.error('Error fetching students:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching active borrows:', err);
      setActiveBorrows([]); // Set empty array on error to prevent UI issues
    } finally {
      setActiveBorrowsLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowRequests();
    fetchInterSchoolRequests();
    fetchActiveBorrows();
  }, []);

  useEffect(() => {
    if (activeRequestTab === 'inter-school') {
      console.log('[LIBRARIAN] Switched to inter-school tab, fetching requests');
      fetchInterSchoolRequests();
    }
  }, [activeRequestTab]);

  const getCurrentStaffIdentity = () => {
    try {
      const rawUser = localStorage.getItem('currentUser');
      if (!rawUser) return { name: 'Library Staff', profilePicture: '' };
      const currentUser = JSON.parse(rawUser);
      const name = currentUser?.full_name ||
        [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ') ||
        currentUser?.name ||
        currentUser?.username ||
        'Library Staff';
      const profilePicture = currentUser?.profile_picture || currentUser?.profile_image || '';
      return { name, profilePicture };
    } catch {
      return { name: 'Library Staff', profilePicture: '' };
    }
  };

  const getRequestStudentIdentity = (request) => {
    const student = request?.student || request?.borrow_request?.student || request?.borrower || null;
    if (!student) {
      return { name: 'Student', profilePicture: '' };
    }

    const name = student.full_name ||
      [student.first_name || student.firstname, student.last_name || student.lastname].filter(Boolean).join(' ') ||
      student.name ||
      [student.firstname, student.lastname].filter(Boolean).join(' ') ||
      'Student';

    const profilePicture = student.profile_picture || student.profile_image || student.avatar || student.photo_url || '';
    return { name, profilePicture };
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setProcessingRequest(requestId);
      const adminId = getStoredUserId();
      if (!adminId) {
        throw new Error('Admin session is missing. Please log in again.');
      }

      const { data, error } = await updateBorrowRequestStatus(requestId, 'approved', adminId);
      if (error) throw error;
      
      // Add notification for approval
      const request = borrowRequests.find(r => r.request_id === requestId) || 
                     interSchoolRequests.find(r => r.borrow_request?.request_id === requestId || r.request_id === requestId);
      
      if (request) {
        const studentIdentity = getRequestStudentIdentity(request);
        // Check if request has items from other schools
        const hasOtherSchoolItems = request.items?.some(item => item.owner_school_id !== request.home_school_id) ||
                                   request.borrow_request?.items?.some(item => item.owner_school_id !== request.borrow_request?.home_school_id);
        
        if (hasOtherSchoolItems) {
          // Other school request - include requirements
          const partnerSchools = [...new Set(
            (request.items?.filter(item => item.owner_school_id !== request.home_school_id).map(item => item.partner_school_name) || []).concat(
            request.borrow_request?.items?.filter(item => item.owner_school_id !== request.borrow_request?.home_school_id).map(item => item.partner_school?.school_name) || [])
          )];
          
          addNotification({
            type: 'BORROW_REQUEST_APPROVED',
            title: 'Borrow Request Approved - Partner School',
            message: `Your borrow request ${requestId} has been approved! To borrow books from ${partnerSchools.join(', ')}, you need: School ID, Permission Letter, and follow the step-by-step instructions. The system will provide a QR CODE to navigate your book borrowing. Check your inbox for details.`,
            related_request_id: requestId,
            senderName: studentIdentity.name,
            senderProfilePicture: studentIdentity.profilePicture,
            student_name: studentIdentity.name,
            student_profile_picture: studentIdentity.profilePicture,
          });
        } else {
          // Home school request
          addNotification({
            type: 'BORROW_REQUEST_APPROVED',
            title: 'Borrow Request Approved',
            message: `Your borrow request ${requestId} has been approved! Please bring your School ID to the library to pick up your books. The system will provide a QR CODE to navigate your book borrowing.`,
            related_request_id: requestId,
            senderName: studentIdentity.name,
            senderProfilePicture: studentIdentity.profilePicture,
            student_name: studentIdentity.name,
            student_profile_picture: studentIdentity.profilePicture,
          });
        }
      }
      
      // Show approved checkmark
      setApprovedRequest(requestId);
      setProcessingRequest(null);
      
      // Clear checkmark after 2 seconds and refresh
      setTimeout(() => {
        setApprovedRequest(null);
        fetchBorrowRequests();
        fetchInterSchoolRequests();
      }, 2000);
      
      setShowApproveConfirm(false);
      setRequestToProcess(null);
    } catch (err) {
      console.error('Error approving request:', err);
      setProcessingRequest(null);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setProcessingRequest(requestId);
      const adminId = getStoredUserId();
      if (!adminId) {
        throw new Error('Admin session is missing. Please log in again.');
      }

      const { data, error } = await updateBorrowRequestStatus(requestId, 'rejected', adminId);
      if (error) throw error;
      
      // Add notification for rejection
      const request = borrowRequests.find(r => r.request_id === requestId) || 
                     interSchoolRequests.find(r => r.borrow_request?.request_id === requestId || r.request_id === requestId);
      
      if (request) {
        const studentIdentity = getRequestStudentIdentity(request);
        // Check if request has items from other schools
        const hasOtherSchoolItems = request.items?.some(item => item.owner_school_id !== request.home_school_id) ||
                                   request.borrow_request?.items?.some(item => item.owner_school_id !== request.borrow_request?.home_school_id);
        
        if (hasOtherSchoolItems) {
          // Other school request
          const partnerSchools = [...new Set(
            (request.items?.filter(item => item.owner_school_id !== request.home_school_id).map(item => item.partner_school_name) || []).concat(
            request.borrow_request?.items?.filter(item => item.owner_school_id !== request.borrow_request?.home_school_id).map(item => item.partner_school?.school_name) || [])
          )];
          
          addNotification({
            type: 'BORROW_REQUEST_REJECTED',
            title: 'Borrow Request Rejected - Partner School',
            message: `Your borrow request ${requestId} for books from ${partnerSchools.join(', ')} has been rejected. Please contact the library for more information.`,
            related_request_id: requestId,
            senderName: studentIdentity.name,
            senderProfilePicture: studentIdentity.profilePicture,
            student_name: studentIdentity.name,
            student_profile_picture: studentIdentity.profilePicture,
          });
        } else {
          // Home school request
          addNotification({
            type: 'BORROW_REQUEST_REJECTED',
            title: 'Borrow Request Rejected',
            message: `Your borrow request ${requestId} has been rejected. Please contact the library for more information.`,
            related_request_id: requestId,
            senderName: studentIdentity.name,
            senderProfilePicture: studentIdentity.profilePicture,
            student_name: studentIdentity.name,
            student_profile_picture: studentIdentity.profilePicture,
          });
        }
      }
      
      await fetchBorrowRequests();
      await fetchInterSchoolRequests();
      setShowRejectConfirm(false);
      setRequestToProcess(null);
      setProcessingRequest(null);
    } catch (err) {
      console.error('Error rejecting request:', err);
      setProcessingRequest(null);
      alert('Failed to reject request. Please try again.');
    }
  };

  const handleApproveClick = (requestId) => {
    setRequestToProcess(requestId);
    setShowApproveConfirm(true);
  };

  const handleRejectClick = (requestId) => {
    setRequestToProcess(requestId);
    setShowRejectConfirm(true);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const toggleExpand = (requestId) => {
    setExpandedRequests(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'permission_ready':
        return 'bg-blue-100 text-blue-700';
      case 'ready_for_pickup':
        return 'bg-purple-100 text-purple-700';
      case 'borrowed':
        return 'bg-indigo-100 text-indigo-700';
      case 'returned':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Borrow Requests</h2>
        <p className="text-[#64748B] text-sm">Manage book borrowing requests and active borrows</p>
      </div>
      
      {/* Request Type Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveRequestTab('home-school')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeRequestTab === 'home-school'
              ? 'bg-[#0077B6] text-white shadow-md'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F7FAFC]'
          }`}
        >
          <FiBook className="inline w-4 h-4 mr-2" />
          Home School Requests
        </button>
        <button
          onClick={() => setActiveRequestTab('inter-school')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeRequestTab === 'inter-school'
              ? 'bg-[#0077B6] text-white shadow-md'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F7FAFC]'
          }`}
        >
          <FiGlobe className="inline w-4 h-4 mr-2" />
          Inter-School Requests
        </button>
      </div>
      
      {/* Pending Requests Table - Home School */}
      {activeRequestTab === 'home-school' && (
        <Card className="mb-6">
        <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
          <FiClock className="w-5 h-5" />
          Pending Requests ({borrowRequests.filter(r => r.status === 'pending').length})
        </h3>
        {borrowRequestsLoading ? (
          <div className="text-center py-12 text-slate-600">Loading requests...</div>
        ) : borrowRequests.filter(r => r.status === 'pending').length === 0 ? (
          <EmptyState
            title="No Pending Requests"
            description="There are no pending borrow requests at the moment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Request ID</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Student</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">School</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Books</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Purpose</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowRequests.filter(r => r.status === 'pending').map((request) => {
                  const student = request.student || {};
                  const homeSchool = request.home_school || request.school || {};
                  const bookCount = request.items?.length || 0;
                  return (
                    <tr key={request.request_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-slate-900">{request.request_id}</td>
                      <td className="py-4 px-4 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <FiUser className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{student.firstname || request.first_name || 'N/A'} {student.lastname || request.last_name || ''}</div>
                            <div className="text-xs text-slate-500">{student.student_number || request.student_id || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-700">{homeSchool.school_name || 'N/A'}</td>
                      <td className="py-4 px-4 text-sm text-slate-700">
                        <div className="flex items-center gap-1">
                          <FiBook className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{bookCount}</span>
                          <span className="text-slate-500">{bookCount === 1 ? 'book' : 'books'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-700 truncate max-w-xs">{request.purpose}</td>
                      <td className="py-4 px-4 text-sm text-slate-700">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleApproveClick(request.request_id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <FiCheckCircle className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => handleRejectClick(request.request_id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <FiXCircle className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}

      {/* Inter-School Requests Table */}
      {activeRequestTab === 'inter-school' && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
            <FiGlobe className="w-5 h-5" />
            Inter-School Requests ({interSchoolRequests.filter(r => r.status === 'pending').length})
          </h3>
          {interSchoolRequestsLoading ? (
            <div className="text-center py-12 text-slate-600">Loading inter-school requests...</div>
          ) : interSchoolRequests.filter(r => r.status === 'pending').length === 0 ? (
            <EmptyState
              title="No Inter-School Requests"
              description="There are no pending inter-school borrow requests at the moment."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Request ID</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Student</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Home School</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Books</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Purpose</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interSchoolRequests.filter(r => r.status === 'pending').map((request) => {
                    const student = request.borrow_request?.student || request.student || {};
                    const homeSchool = request.borrow_request?.home_school || request.home_school || {};
                    const bookCount = request.borrow_request?.items?.length || request.items?.length || 0;
                    const requestId = request.borrow_request?.request_id || request.request_id;
                    const itemStatus = request.status;
                    return (
                      <tr key={request.item_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-slate-900">{requestId}</td>
                        <td className="py-4 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{student.firstname || 'N/A'} {student.lastname || ''}</div>
                              <div className="text-xs text-slate-500">{student.student_number || request.student_id || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700">{homeSchool.school_name || 'N/A'}</td>
                        <td className="py-4 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-1">
                            <FiBook className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{bookCount}</span>
                            <span className="text-slate-500">{bookCount === 1 ? 'book' : 'books'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 truncate max-w-xs">{request.borrow_request?.purpose || request.purpose || 'N/A'}</td>
                        <td className="py-4 px-4 text-sm text-slate-700">
                          {new Date(request.borrow_request?.created_at || request.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(itemStatus)}`}>
                            {itemStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(request.borrow_request || request)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleApproveClick(requestId)}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <FiCheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleRejectClick(requestId)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <FiXCircle className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Request Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 overflow-y-auto" onClick={() => setShowDetailModal(false)}>
          <div className="min-h-screen flex items-center justify-center py-8">
            <div className="bg-white rounded-t-2xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-[#26364A] p-6 rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10">
                      <FiBook className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">Request Details</h2>
                      <p className="text-slate-300 text-xs">Request ID: {selectedRequest.request_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <FiXCircle className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Student Information Section - Two Column Layout */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Side - Student Information */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <FiUser className="w-4 h-4" />
                        Student Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Name</p>
                          <p className="font-medium text-slate-900 text-sm">
                            {(selectedRequest.student?.firstname || selectedRequest.first_name || 'N/A')} 
                            {(selectedRequest.student?.lastname || selectedRequest.last_name || '')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Student ID</p>
                          <p className="font-medium text-slate-900 text-sm">{selectedRequest.student_id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Contact Number</p>
                          <p className="font-medium text-slate-900 text-sm">{selectedRequest.contact_number || selectedRequest.student?.contact_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Address</p>
                          <p className="font-medium text-slate-900 text-sm">{selectedRequest.address || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Email</p>
                          <p className="font-medium text-slate-900 text-sm">{selectedRequest.student?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - ID Picture */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <FiUser className="w-4 h-4" />
                        ID Picture
                      </h3>
                      <div className="flex-1 flex items-center justify-center">
                        {selectedRequest.id_picture_url ? (
                          <img 
                            src={getBackendAssetUrl(selectedRequest.id_picture_url)} 
                            alt="ID Picture" 
                            className="w-48 h-48 object-cover rounded-lg shadow-sm border border-slate-200"
                            onError={(e) => {
                              console.error('Error loading ID picture:', selectedRequest.id_picture_url);
                              console.error('Processed URL:', getBackendAssetUrl(selectedRequest.id_picture_url));
                              console.error('Image error event:', e);
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                            onLoad={() => {
                              console.log('ID picture loaded successfully:', getBackendAssetUrl(selectedRequest.id_picture_url));
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300" 
                          style={{ display: selectedRequest.id_picture_url ? 'none' : 'flex' }}
                        >
                          <div className="text-center">
                            <FiUser className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">No ID Picture</p>
                          </div>
                        </div>
                      </div>
                      {selectedRequest.id_picture_url && (
                        <div className="mt-3 text-center">
                          <p className="text-xs text-slate-500 truncate">{getBackendAssetUrl(selectedRequest.id_picture_url)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Books to Borrow */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FiBook className="w-4 h-4" />
                    Books to Borrow ({selectedRequest.items?.length || selectedRequest.borrow_request?.items?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {(selectedRequest.items || selectedRequest.borrow_request?.items || []).map((item, index) => {
                      const book = item.book || booksData[item.book_id];
                      return (
                        <div key={index} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                          <div className="w-10 h-12 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center">
                            <FiBook className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-slate-500">Book ID: {item.book_id}</p>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' ? 'Inter-School' : 'Home Library'}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 truncate">{book?.title || item.title || `Book ID: ${item.book_id}`}</p>
                            <p className="text-xs text-slate-600">{book?.author || item.author || 'Unknown Author'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Purpose */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    Purpose
                  </h3>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-sm text-slate-700">{selectedRequest.purpose}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    Request Details
                  </h3>
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Request Type</p>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedRequest.request_type === 'INTER_SCHOOL' ? 'Inter-School Borrowing' : 'Home Library Borrowing'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedRequest.status === 'pending' ? 'bg-amber-100 text-amber-700' : getStatusColor(selectedRequest.status)
                        }`}>
                          {selectedRequest.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Request Date</p>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(selectedRequest.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">QR Token</p>
                        <p className="text-sm font-medium text-slate-900 break-all">{selectedRequest.qr_token || 'N/A'}</p>
                      </div>
                      {selectedRequest.request_type === 'INTER_SCHOOL' && (
                        <>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Owner School (Book Location)</p>
                            <p className="text-sm font-medium text-slate-900">
                              {selectedRequest.items?.[0]?.owner_school_id === 1 ? 'Santa Rita College' : 
                               selectedRequest.items?.[0]?.owner_school_id === 18 ? 'Tony Stark University' : 
                               `School ID: ${selectedRequest.items?.[0]?.owner_school_id}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Partner School (Requesting)</p>
                            <p className="text-sm font-medium text-slate-900">
                              {selectedRequest.items?.[0]?.partner_school_id === 1 ? 'Santa Rita College' : 
                               selectedRequest.items?.[0]?.partner_school_id === 18 ? 'Tony Stark University' : 
                               `School ID: ${selectedRequest.items?.[0]?.partner_school_id}`}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200 p-6 bg-white">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setRequestToProcess(selectedRequest.request_id);
                      setShowApproveConfirm(true);
                    }}
                    disabled={processingRequest === selectedRequest.request_id || approvedRequest === selectedRequest.request_id}
                    className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                  >
                    {processingRequest === selectedRequest.request_id ? (
                      <div className="flex items-center justify-center">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            fill="none"
                            strokeLinecap="round"
                            className="animate-circle-draw"
                            style={{
                              strokeDasharray: 63,
                              strokeDashoffset: 63,
                              animation: 'drawCircle 1s ease-in-out forwards'
                            }}
                          />
                        </svg>
                      </div>
                    ) : approvedRequest === selectedRequest.request_id ? (
                      <div className="flex items-center justify-center">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            fill="none"
                            strokeLinecap="round"
                          />
                          <path 
                            d="M8 12l3 3 5-6" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="animate-check-draw"
                            style={{
                              strokeDasharray: 20,
                              strokeDashoffset: 20,
                              animation: 'drawCheck 0.5s ease-in-out forwards 0.5s'
                            }}
                          />
                        </svg>
                      </div>
                    ) : (
                      <>
                        <FiCheckCircle className="w-4 h-4" />
                        Approve Request
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setRequestToProcess(selectedRequest.request_id);
                      setShowRejectConfirm(true);
                    }}
                    disabled={processingRequest === selectedRequest.request_id}
                    className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiXCircle className="w-4 h-4" />
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && requestToProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center animate-fade-in" onClick={() => setShowApproveConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Approve Request</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to approve borrow request {requestToProcess}? This action will allow the student to proceed with borrowing the requested books.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowApproveConfirm(false);
                  setRequestToProcess(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveRequest(requestToProcess)}
                disabled={processingRequest === requestToProcess}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingRequest === requestToProcess ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Approve'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && requestToProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center animate-fade-in" onClick={() => setShowRejectConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Reject Request</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to reject borrow request {requestToProcess}? This action cannot be undone and the student will need to submit a new request.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setRequestToProcess(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectRequest(requestToProcess)}
                disabled={processingRequest === requestToProcess}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingRequest === requestToProcess ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Borrows */}
      <Card padding="none">
        <div className="p-6 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FiBook className="w-5 h-5" />
                Active Borrows
              </h3>
              <p className="text-sm text-slate-500 mt-1">Currently borrowed books in your library</p>
            </div>
            <button
              onClick={fetchActiveBorrows}
              disabled={activeBorrowsLoading}
              className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <FiRefreshCw className={`w-4 h-4 text-slate-600 ${activeBorrowsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {activeBorrowsLoading ? (
          <div className="text-center py-12 text-slate-600">Loading active borrows...</div>
        ) : activeBorrows.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Active Borrows"
              description="There are no active book borrows at the moment."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-slate-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Borrowed</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {activeBorrows.map((borrow) => {
                  const book = booksData[borrow.book_id];
                  const student = studentsData[borrow.student_id];
                  const isOverdue = new Date(borrow.due_date) < new Date();
                  const dueDate = new Date(borrow.due_date);
                  const today = new Date();
                  const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={borrow.borrow_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                            <FiBook className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate max-w-xs">
                              {book?.title || 'Unknown Book'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {book?.isbn || 'No ISBN'}
                            </p>
                            {borrow.book_copies?.accession_number && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Acc: {borrow.book_copies.accession_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {student ? `${student.firstname} ${student.lastname}` : 'Unknown Student'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {student?.student_number || borrow.student_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {new Date(borrow.borrow_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                            {dueDate.toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <p className="text-xs text-red-600 mt-0.5 font-medium">
                              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={borrow.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleReturnBook(borrow.borrow_id)}
                          disabled={returningBookId === borrow.borrow_id}
                          className="w-full sm:w-auto"
                        >
                          {returningBookId === borrow.borrow_id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                              Returning...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle className="w-4 h-4 mr-1.5" />
                              Return
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminBorrowRequests;
