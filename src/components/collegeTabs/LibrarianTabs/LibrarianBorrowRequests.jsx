import { useState, useEffect } from "react";
import { 
  FiBook, FiUser, FiCalendar, FiMapPin, FiPhone, FiCheckCircle, FiXCircle, 
  FiClock, FiEye, FiChevronDown, FiChevronUp, FiRefreshCw, FiAlertTriangle, 
  FiGlobe, FiMail, FiHash, FiMaximize2, FiArrowRight, FiShield, FiX 
} from "react-icons/fi";
import {
  getBorrowRequests,
  updateBorrowRequestStatus,
  getAllActiveBorrows,
  getBookById,
  getBackendAssetUrl,
  returnBook,
  confirmBorrowCancellation,
  declineBorrowCancellation,
} from "../../../utils/api";
import api from "../../../utils/api";
import { useNotifications } from "../../../context/NotificationContext";
import { subscribeToSchoolChanges } from "../../../utils/realtime";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import { formatDateTimeWithRelative, formatPhilippineDateTime, formatPhilippineDate } from "../../../utils/timeUtils";

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
  const [activeRequestTab, setActiveRequestTab] = useState('home-school'); // 'home-school' | 'inter-school' | 'cancellations'

  // Cancellation handling states
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [showDeclineCancelModal, setShowDeclineCancelModal] = useState(false);
  const [cancellationRequestToProcess, setCancellationRequestToProcess] = useState(null);
  const [declineRemarks, setDeclineRemarks] = useState('');
  const [cancellationProcessing, setCancellationProcessing] = useState(false);
  const [activeLoansSearch, setActiveLoansSearch] = useState('');
  const [activeLoansFilter, setActiveLoansFilter] = useState('all'); // 'all' | 'due-soon' | 'overdue'
  const [schoolsMap, setSchoolsMap] = useState({});
  const [zoomIdImage, setZoomIdImage] = useState(false);

  useEffect(() => {
    api.get('/schools/public')
      .catch(() => api.get('/schools'))
      .then(res => {
        const list = res.data?.data || res.data || [];
        const map = {};
        list.forEach(s => {
          map[s.school_id] = s;
        });
        setSchoolsMap(map);
      })
      .catch(() => {});
  }, []);

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

    // Subscribe to realtime changes for this school
    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      const unsubscribe = subscribeToSchoolChanges(schoolId, (change) => {
        console.log('[LIBRARIAN] Realtime change detected:', change);
        // Refresh relevant data based on change type
        if (change.type === 'borrow_request' || change.type === 'borrow_request_item') {
          fetchBorrowRequests();
          fetchInterSchoolRequests();
        } else if (change.type === 'book_copy') {
          // Book copy status changed - refresh active borrows
          fetchActiveBorrows();
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
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
      case 'cancellation_requested':
        return 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600';
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

  // Compute cancellation requests
  const cancellationRequests = [
    ...borrowRequests.filter(r => r.status === 'cancel_requested' || r.status === 'cancellation_requested'),
    ...interSchoolRequests
      .filter(r => 
        r.status === 'cancel_requested' || 
        r.status === 'cancellation_requested' || 
        r.borrow_request?.status === 'cancel_requested' || 
        r.borrow_request?.status === 'cancellation_requested'
      )
      .map(r => ({
        ...(r.borrow_request || r),
        isInterSchool: true,
        cancellation_reason: r.cancellation_reason || r.borrow_request?.cancellation_reason,
      }))
  ].reduce((acc, curr) => {
    if (!acc.some(item => item.request_id === curr.request_id)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  const handleConfirmCancellation = async (requestId) => {
    try {
      setCancellationProcessing(true);
      const { error } = await confirmBorrowCancellation(requestId);
      if (error) throw error;

      const request = cancellationRequests.find(r => r.request_id === requestId);
      if (request) {
        const studentIdentity = getRequestStudentIdentity(request);
        addNotification({
          type: 'BORROW_REQUEST_CANCELLED',
          title: 'Hold Cancellation Confirmed',
          message: `The cancellation for request ${requestId} has been confirmed. The reserved copy has been restored to catalog inventory.`,
          related_request_id: requestId,
          student_name: studentIdentity.name,
        });
      }

      setShowConfirmCancelModal(false);
      setCancellationRequestToProcess(null);
      if (showDetailModal && selectedRequest?.request_id === requestId) {
        setShowDetailModal(false);
      }

      await fetchBorrowRequests();
      await fetchInterSchoolRequests();
      window.dispatchEvent(new CustomEvent('refreshStats'));
    } catch (err) {
      console.error('Error confirming cancellation:', err);
      alert('Failed to confirm cancellation. Please try again.');
    } finally {
      setCancellationProcessing(false);
    }
  };

  const handleDeclineCancellation = async (requestId) => {
    try {
      setCancellationProcessing(true);
      const { error } = await declineBorrowCancellation(requestId, declineRemarks);
      if (error) throw error;

      const request = cancellationRequests.find(r => r.request_id === requestId);
      if (request) {
        const studentIdentity = getRequestStudentIdentity(request);
        addNotification({
          type: 'CANCELLATION_DECLINED',
          title: 'Hold Cancellation Declined',
          message: `Your cancellation request for ${requestId} was declined.${declineRemarks ? ` Reason: ${declineRemarks}` : ' The reserved hold remains active for pickup.'}`,
          related_request_id: requestId,
          student_name: studentIdentity.name,
        });
      }

      setShowDeclineCancelModal(false);
      setCancellationRequestToProcess(null);
      setDeclineRemarks('');
      if (showDetailModal && selectedRequest?.request_id === requestId) {
        setShowDetailModal(false);
      }

      await fetchBorrowRequests();
      await fetchInterSchoolRequests();
    } catch (err) {
      console.error('Error declining cancellation:', err);
      alert('Failed to decline cancellation. Please try again.');
    } finally {
      setCancellationProcessing(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic & Glassmorphism Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-blue-50/20 to-white p-5 sm:p-6 shadow-xs backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 border border-blue-200 text-blue-800">
                <FiClock className="w-3 h-3 text-blue-600" />
                PHT Philippine Time (UTC+8)
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Auto-synced</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Borrow Requests Counter</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
              Process campus book reservations, approve cross-library inter-school loans, and handle hold cancellations with precise timestamps.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                fetchBorrowRequests();
                fetchInterSchoolRequests();
                fetchActiveBorrows();
              }}
              disabled={borrowRequestsLoading || interSchoolRequestsLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 text-blue-600 ${borrowRequestsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queues</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Modern Pill Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 w-fit">
        <button
          onClick={() => setActiveRequestTab('home-school')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeRequestTab === 'home-school'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FiBook className="w-4 h-4" />
          <span>Home School Requests</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
            activeRequestTab === 'home-school' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {borrowRequests.filter(r => r.status === 'pending').length}
          </span>
        </button>

        <button
          onClick={() => setActiveRequestTab('inter-school')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeRequestTab === 'inter-school'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FiGlobe className="w-4 h-4" />
          <span>Inter-School Requests</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
            activeRequestTab === 'inter-school' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {interSchoolRequests.filter(r => r.status === 'pending').length}
          </span>
        </button>

        <button
          onClick={() => setActiveRequestTab('cancellations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeRequestTab === 'cancellations'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FiAlertTriangle className={`w-4 h-4 ${cancellationRequests.length > 0 ? 'text-amber-500' : ''}`} />
          <span>Hold Cancellations</span>
          {cancellationRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white animate-pulse">
              {cancellationRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveRequestTab('active-loans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeRequestTab === 'active-loans'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FiBook className="w-4 h-4" />
          <span>Active Loans</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
            activeRequestTab === 'active-loans' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {activeBorrows.length}
          </span>
        </button>
      </div>
      
      {/* Pending Requests Table - Home School */}
      {activeRequestTab === 'home-school' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiClock className="w-4 h-4 text-blue-600" />
              <span>Pending Requests Queue</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {borrowRequests.filter(r => r.status === 'pending').length} pending
              </span>
            </h3>
          </div>
          {borrowRequestsLoading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Fetching borrow requests...</p>
            </div>
          ) : borrowRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <FiCheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Pending Requests</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no pending home school borrow requests at the moment. New student reservations will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Borrower Student</th>
                    <th className="py-3 px-4">Campus</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Requested At (PHT)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {borrowRequests.filter(r => r.status === 'pending').map((request) => {
                    const student = request.student || {};
                    const homeSchool = request.home_school || request.school || {};
                    const bookCount = request.items?.length || 0;
                    return (
                      <tr key={request.request_id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-mono font-bold text-blue-600">{request.request_id}</td>
                        <td className="py-3.5 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
                              {(student.firstname || request.first_name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900">{student.firstname || request.first_name || 'N/A'} {student.lastname || request.last_name || ''}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{student.student_number || request.student_id || 'No ID'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">{homeSchool.school_name || 'Campus Library'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            <FiBook className="w-3 h-3 text-slate-500" />
                            {bookCount} {bookCount === 1 ? 'book' : 'books'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 truncate max-w-[180px]">{request.purpose || 'Academic Reading'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                          {formatDateTimeWithRelative(request.created_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getStatusColor(request.status)}`}>
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
      </div>
      )}

      {/* Inter-School Requests Table */}
      {activeRequestTab === 'inter-school' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiGlobe className="w-4 h-4 text-blue-600" />
              <span>Inter-School Requests</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {interSchoolRequests.filter(r => r.status === 'pending').length} pending
              </span>
            </h3>
          </div>
          {interSchoolRequestsLoading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Fetching requests...</p>
            </div>
          ) : interSchoolRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <FiGlobe className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Inter-School Requests</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no cross-library inter-school borrow requests awaiting pickup approval from partner campuses.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Borrower Student</th>
                    <th className="py-3 px-4">Home School</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Requested At (PHT)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interSchoolRequests.filter(r => r.status === 'pending').map((request) => {
                    const student = request.borrow_request?.student || request.student || {};
                    const homeSchool = request.borrow_request?.home_school || request.home_school || {};
                    const bookCount = request.borrow_request?.items?.length || request.items?.length || 0;
                    const requestId = request.borrow_request?.request_id || request.request_id;
                    const itemStatus = request.status;
                    return (
                      <tr key={request.item_id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-mono font-bold text-blue-600">{requestId}</td>
                        <td className="py-3.5 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
                              {(student.firstname || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900">{student.firstname || 'N/A'} {student.lastname || ''}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{student.student_number || request.student_id || 'No ID'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">{homeSchool.school_name || 'Partner Campus'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            <FiBook className="w-3 h-3 text-slate-500" />
                            {bookCount} {bookCount === 1 ? 'book' : 'books'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 truncate max-w-[180px]">{request.borrow_request?.purpose || request.purpose || 'Inter-library Research'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                          {formatDateTimeWithRelative(request.borrow_request?.created_at || request.created_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getStatusColor(itemStatus)}`}>
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
        </div>
      )}

      {/* Cancellation Requests Table */}
      {activeRequestTab === 'cancellations' && (
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <FiAlertTriangle className="w-5 h-5 text-amber-500" />
                Hold Cancellation Requests ({cancellationRequests.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Students requesting to cancel their approved book holds. Confirming will restock reserved copies to available shelf inventory.
              </p>
            </div>
            <button
              onClick={() => {
                fetchBorrowRequests();
                fetchInterSchoolRequests();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition shrink-0 self-start sm:self-auto"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {borrowRequestsLoading || interSchoolRequestsLoading ? (
            <div className="text-center py-12 text-slate-600">Loading cancellation requests...</div>
          ) : cancellationRequests.length === 0 ? (
            <EmptyState
              title="No Cancellation Requests"
              description="There are no hold cancellation requests awaiting librarian review."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Request ID</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Student</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Reserved Books</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Cancellation Reason</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationRequests.map((request) => {
                    const student = request.student || request.borrow_request?.student || {};
                    const bookItems = request.items || request.borrow_request?.items || [];
                    const reason = request.cancellation_reason || 'No reason provided';
                    const isProcessing = cancellationProcessing && cancellationRequestToProcess?.request_id === request.request_id;

                    return (
                      <tr key={request.request_id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-slate-900">
                          <div>{request.request_id}</div>
                          {request.isInterSchool && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              Inter-School
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <FiUser className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {student.firstname || student.first_name || 'N/A'} {student.lastname || student.last_name || ''}
                              </div>
                              <div className="text-xs text-slate-500">{student.student_number || student.student_id || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700">
                          <div className="space-y-1 max-w-xs">
                            {bookItems.map((itm, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-800 truncate">
                                <FiBook className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="truncate font-medium">{itm.book?.title || itm.title || `Book ID: ${itm.book_id}`}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 max-w-sm">
                            <p className="text-xs font-semibold text-amber-900 leading-snug">{reason}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                          {formatDateTimeWithRelative(request.created_at)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(request)}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCancellationRequestToProcess(request);
                                setShowConfirmCancelModal(true);
                              }}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition active:scale-95 shadow-sm disabled:opacity-50"
                              title="Confirm cancellation and release copy back to catalog"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setCancellationRequestToProcess(request);
                                setDeclineRemarks('');
                                setShowDeclineCancelModal(true);
                              }}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                              title="Decline cancellation and maintain reservation"
                            >
                              <FiXCircle className="w-3.5 h-3.5 text-rose-500" />
                              Decline
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
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 p-4 sm:p-6 overflow-y-auto flex items-center justify-center animate-fade-in" 
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-up overflow-hidden my-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                  <FiBook className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Borrow Request Review</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      selectedRequest.status === 'pending' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : selectedRequest.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedRequest.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Request ID: <span className="font-mono text-slate-700 font-medium">#{selectedRequest.request_id}</span> · Submitted {formatDateTimeWithRelative(selectedRequest.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="Close review"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="p-6 overflow-y-auto max-h-[72vh] space-y-6">
              {/* Cancellation Alert Banner */}
              {(selectedRequest.status === 'cancel_requested' || selectedRequest.status === 'cancellation_requested' || selectedRequest.cancellation_reason) && (
                <div className={`rounded-xl border p-4 shadow-sm ${
                  selectedRequest.status === 'cancelled'
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-amber-300 bg-amber-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRequest.status === 'cancelled'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      <FiAlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold ${
                        selectedRequest.status === 'cancelled' ? 'text-slate-900' : 'text-amber-900'
                      }`}>
                        {selectedRequest.status === 'cancelled' ? 'Hold Was Cancelled' : 'Hold Cancellation Requested by Student'}
                      </h4>
                      <p className={`text-xs mt-1 ${
                        selectedRequest.status === 'cancelled' ? 'text-slate-700' : 'text-amber-800'
                      }`}>
                        Reason: <span className="font-semibold">"{selectedRequest.cancellation_reason || 'No specific reason provided'}"</span>
                      </p>
                      {selectedRequest.status === 'cancellation_requested' && (
                        <p className="text-[11px] text-amber-700 mt-1">
                          Confirming cancellation will mark this request as cancelled and restore the reserved copy to available catalog inventory.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2-Column Split: Left Column (Student & ID Card) | Right Column (Books & Details) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Borrower & Institutional ID */}
                <div className="md:col-span-5 space-y-4">
                  {/* Student Identity Card */}
                  <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-sm">
                        {(selectedRequest.student?.firstname?.[0] || selectedRequest.first_name?.[0] || 'S')}
                        {(selectedRequest.student?.lastname?.[0] || selectedRequest.last_name?.[0] || '')}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {(selectedRequest.student?.firstname || selectedRequest.first_name || 'N/A')}{' '}
                          {(selectedRequest.student?.lastname || selectedRequest.last_name || '')}
                        </h3>
                        <p className="text-xs font-mono text-slate-500">
                          ID: {selectedRequest.student_id || selectedRequest.student?.student_number || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Institutional ID Preview Card */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Institutional ID Badge
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <FiCheckCircle className="w-3 h-3" />
                          Card on File
                        </span>
                      </div>
                      
                      {selectedRequest.id_picture_url ? (
                        <div 
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
                          onClick={() => setZoomIdImage(true)}
                        >
                          <img 
                            src={getBackendAssetUrl(selectedRequest.id_picture_url)} 
                            alt="Student Institutional ID" 
                            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                            <FiMaximize2 className="w-4 h-4" />
                            Click to zoom
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-36 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                          <div className="text-center p-3">
                            <FiUser className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                            <p className="text-xs text-slate-500 font-medium">No ID Picture Uploaded</p>
                            <p className="text-[10px] text-slate-400">Verify borrower in person at counter</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact Info Meta */}
                    <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <FiMail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{selectedRequest.student?.email || 'No email on record'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FiPhone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{selectedRequest.contact_number || selectedRequest.student?.contact_number || 'No phone'}</span>
                      </div>
                      {selectedRequest.address && (
                        <div className="flex items-start gap-2 text-slate-600">
                          <FiMapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{selectedRequest.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Book Details, Campus Route, and Purpose */}
                <div className="md:col-span-7 space-y-4">
                  {/* Inter-School Visual Route Card (if applicable) */}
                  {selectedRequest.request_type === 'INTER_SCHOOL' && (
                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FiGlobe className="w-3.5 h-3.5" />
                          Inter-School Consortium Request
                        </span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-800 font-semibold">
                          Cross-Campus
                        </span>
                      </div>
                      <div className="flex items-center gap-2 my-2 bg-white/80 p-3 rounded-lg border border-indigo-100/80">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Requesting Campus</span>
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {schoolsMap[selectedRequest.items?.[0]?.partner_school_id || selectedRequest.partner_school_id || selectedRequest.student?.school_id]?.school_name || 'Home Campus'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center px-2 text-indigo-500">
                          <FiArrowRight className="w-4 h-4 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Lending Library</span>
                          <p className="text-xs font-bold text-indigo-900 truncate">
                            {schoolsMap[selectedRequest.items?.[0]?.owner_school_id || selectedRequest.school_id]?.school_name || 'Your Library'}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-900/80 mt-1">
                        Visiting student from partner institution requesting resource borrowing / on-site study pass.
                      </p>
                    </div>
                  )}

                  {/* Books to Borrow Section */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FiBook className="w-4 h-4 text-blue-600" />
                        Books to Borrow ({(selectedRequest.items || selectedRequest.borrow_request?.items || []).length})
                      </span>
                    </h3>
                    <div className="space-y-2.5">
                      {(selectedRequest.items || selectedRequest.borrow_request?.items || []).map((item, index) => {
                        const book = item.book || booksData[item.book_id];
                        return (
                          <div key={index} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
                            <div className="w-10 h-12 bg-white border border-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center shadow-2xs">
                              <FiBook className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-900 truncate">
                                  {book?.title || item.title || `Book ID: ${item.book_id}`}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex-shrink-0">
                                  {item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' ? 'Inter-School Use' : 'Local Home Loan'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Author: <span className="text-slate-700 font-medium">{book?.author || item.author || 'Unknown'}</span>
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                                <span>ISBN: {book?.isbn || '—'}</span>
                                <span>·</span>
                                <span>Item ID: {item.book_id}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Purpose & Schedule Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Purpose of Borrowing / Research
                      </span>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        {selectedRequest.purpose || 'No specific purpose description provided by borrower.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Request Type</span>
                        <span className="font-semibold text-slate-800">
                          {selectedRequest.request_type === 'INTER_SCHOOL' ? 'Inter-School' : 'Local Home'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Access Pass Token</span>
                        <span className="font-mono font-semibold text-slate-800 text-[11px]">
                          {selectedRequest.qr_token || 'Generated upon release'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - Sticky Bottom Action Bar */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Close Review
              </button>

              <div className="flex items-center gap-2">
                {selectedRequest.status === 'cancel_requested' || selectedRequest.status === 'cancellation_requested' ? (
                  <>
                    <button
                      onClick={() => {
                        setCancellationRequestToProcess(selectedRequest);
                        setDeclineRemarks('');
                        setShowDeclineCancelModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    >
                      <FiXCircle className="w-4 h-4 text-rose-500" />
                      Decline Cancellation
                    </button>
                    <button
                      onClick={() => {
                        setCancellationRequestToProcess(selectedRequest);
                        setShowConfirmCancelModal(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Confirm & Restock Copy
                    </button>
                  </>
                ) : selectedRequest.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => {
                        setRequestToProcess(selectedRequest.request_id);
                        setShowRejectConfirm(true);
                      }}
                      disabled={processingRequest === selectedRequest.request_id}
                      className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <FiXCircle className="w-4 h-4 text-rose-600" />
                      Decline Request
                    </button>
                    <button
                      onClick={() => {
                        setRequestToProcess(selectedRequest.request_id);
                        setShowApproveConfirm(true);
                      }}
                      disabled={processingRequest === selectedRequest.request_id || approvedRequest === selectedRequest.request_id}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Approve Request
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-lg">
                    Request is already {selectedRequest.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Institutional ID Full-Screen Lightbox Zoom Modal */}
          {zoomIdImage && selectedRequest.id_picture_url && (
            <div 
              className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" 
              onClick={() => setZoomIdImage(false)}
            >
              <div 
                className="relative max-w-2xl w-full bg-slate-900 rounded-2xl p-2 shadow-2xl animate-scale-up" 
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setZoomIdImage(false)}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-200 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
                <img 
                  src={getBackendAssetUrl(selectedRequest.id_picture_url)} 
                  alt="Student ID Badge Enlarged" 
                  className="w-full max-h-[80vh] object-contain rounded-xl"
                />
              </div>
            </div>
          )}
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

      {/* Confirm Cancellation Modal */}
      {showConfirmCancelModal && cancellationRequestToProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center animate-fade-in" onClick={() => setShowConfirmCancelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Confirm Hold Cancellation</h3>
                <p className="text-xs text-slate-500">Request ID: {cancellationRequestToProcess.request_id}</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-3">
              Are you sure you want to confirm this cancellation?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900">
              <p className="font-semibold mb-1">Student's Stated Reason:</p>
              <p className="italic">"{cancellationRequestToProcess.cancellation_reason || 'No specific reason provided'}"</p>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Confirming will mark this request as <span className="font-bold text-slate-700">cancelled</span> and automatically restore any reserved physical book copies back to available shelf inventory.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmCancelModal(false);
                  setCancellationRequestToProcess(null);
                }}
                disabled={cancellationProcessing}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={() => handleConfirmCancellation(cancellationRequestToProcess.request_id)}
                disabled={cancellationProcessing}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {cancellationProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    Confirm & Restock Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Cancellation Modal */}
      {showDeclineCancelModal && cancellationRequestToProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center animate-fade-in" onClick={() => setShowDeclineCancelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <FiXCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Decline Hold Cancellation</h3>
                <p className="text-xs text-slate-500">Request ID: {cancellationRequestToProcess.request_id}</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-4">
              Declining will keep this request as <span className="font-bold text-slate-700">approved</span> and the reserved copy will remain held at the circulation desk for the student.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Remarks / Instructions for Student (Optional)
              </label>
              <textarea
                rows={3}
                value={declineRemarks}
                onChange={(e) => setDeclineRemarks(e.target.value)}
                placeholder="e.g., Hold will remain reserved until 5:00 PM today. Please pick up at the circulation counter."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeclineCancelModal(false);
                  setCancellationRequestToProcess(null);
                  setDeclineRemarks('');
                }}
                disabled={cancellationProcessing}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeclineCancellation(cancellationRequestToProcess.request_id)}
                disabled={cancellationProcessing}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {cancellationProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Declining...
                  </>
                ) : (
                  'Decline Cancellation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Borrows - Rendered conditionally when Active Loans tab is selected */}
      {activeRequestTab === 'active-loans' && (
        <Card padding="none">
          <div className="p-6 border-b border-[#E2E8F0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FiBook className="w-5 h-5 text-blue-600" />
                  Active Loans Directory
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">Currently borrowed books across all students</p>
              </div>
              <button
                onClick={fetchActiveBorrows}
                disabled={activeBorrowsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 self-start sm:self-center"
                title="Refresh"
              >
                <FiRefreshCw className={`w-3.5 h-3.5 ${activeBorrowsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Loans</span>
              </button>
            </div>

            {/* Instant Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search active loans by book title, student name, ID number, accession..."
                value={activeLoansSearch}
                onChange={(e) => setActiveLoansSearch(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveLoansFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeLoansFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({activeBorrows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLoansFilter('due-soon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeLoansFilter === 'due-soon'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Due Soon
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLoansFilter('overdue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeLoansFilter === 'overdue'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Overdue
                </button>
              </div>
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
                  {activeBorrows
                    .filter((borrow) => {
                      const dueDate = new Date(borrow.due_date);
                      const today = new Date();
                      const isOverdue = dueDate < today;
                      const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= (2 * 24 * 60 * 60 * 1000);

                      if (activeLoansFilter === 'overdue' && !isOverdue) return false;
                      if (activeLoansFilter === 'due-soon' && !isDueSoon) return false;

                      if (!activeLoansSearch.trim()) return true;

                      const q = activeLoansSearch.toLowerCase();
                      const b = booksData[borrow.book_id] || borrow.book_copies?.books || {};
                      const s = studentsData[borrow.student_id] || borrow.student || {};
                      const title = (b.title || '').toLowerCase();
                      const author = (b.author || '').toLowerCase();
                      const studentName = `${s.firstname || ''} ${s.lastname || ''} ${s.name || ''}`.toLowerCase();
                      const studentNumber = (s.student_number || '').toLowerCase();
                      const acc = (borrow.book_copies?.accession_number || '').toLowerCase();

                      return (
                        title.includes(q) ||
                        author.includes(q) ||
                        studentName.includes(q) ||
                        studentNumber.includes(q) ||
                        acc.includes(q)
                      );
                    })
                    .map((borrow) => {
                      const book = booksData[borrow.book_id] || borrow.book_copies?.books || {};
                      const student = studentsData[borrow.student_id] || borrow.student || {};
                      const dueDate = new Date(borrow.due_date);
                      const today = new Date();
                      const isOverdue = dueDate < today;
                      const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= (2 * 24 * 60 * 60 * 1000);
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
                                {student?.firstname ? `${student.firstname} ${student.lastname}` : (student?.name || 'Student')}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {student?.student_number || `ID: ${borrow.student_id}`}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {formatPhilippineDate(borrow.borrow_date)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className={`text-xs font-bold whitespace-nowrap ${isOverdue ? 'text-red-600' : (isDueSoon ? 'text-amber-600' : 'text-slate-700')}`}>
                                {formatPhilippineDate(dueDate)}
                              </span>
                              {isOverdue && (
                                <p className="text-xs text-red-600 mt-0.5 font-medium">
                                  {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                </p>
                              )}
                              {isDueSoon && (
                                <p className="text-xs text-amber-600 mt-0.5 font-medium">
                                  Due soon
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={isOverdue ? 'overdue' : (isDueSoon ? 'due soon' : 'active')} />
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
      )}
    </div>
  );
}

export default AdminBorrowRequests;
