import { useState, useEffect } from "react";
import { 
  FiBook, FiUser, FiCalendar, FiMapPin, FiPhone, FiCheckCircle, FiXCircle, 
  FiClock, FiEye, FiChevronDown, FiChevronUp, FiRefreshCw, FiAlertTriangle, 
  FiGlobe, FiMail, FiHash, FiMaximize2, FiArrowRight, FiShield, FiX, FiLock,
  FiPackage, FiZap, FiSearch, FiFilter, FiCheck, FiLayers, FiInbox, FiExternalLink,
  FiSettings, FiSliders, FiTag, FiHelpCircle, FiCheckSquare
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
  releaseBookItem,
  getLibraryPolicy,
  updateLibraryPolicy,
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

  @keyframes slideUpScale {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to   { opacity: 1; }
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

function getStoredUserRole() {
  const rawUser = localStorage.getItem('currentUser');
  if (!rawUser) return '';
  try {
    const parsed = JSON.parse(rawUser);
    return String(parsed?.role || parsed?.role_name || parsed?.role_id || '').toLowerCase();
  } catch {
    return '';
  }
}

function AdminBorrowRequests() {
  const { addNotification } = useNotifications();
  const userRole = getStoredUserRole();
  const isAdminLibrarian = userRole.includes('admin') || userRole === '2' || userRole === 'librarian_admin';
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
  const [declineReason, setDeclineReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);
  const [approvedRequest, setApprovedRequest] = useState(null);
  const [returningBookId, setReturningBookId] = useState(null);
  const [activeRequestTab, setActiveRequestTab] = useState('home-school');
  // Toast notification state
  const [actionToast, setActionToast] = useState(null); // { type: 'approve'|'decline', message: string }

  // Cancellation handling states
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [showDeclineCancelModal, setShowDeclineCancelModal] = useState(false);
  const [cancellationRequestToProcess, setCancellationRequestToProcess] = useState(null);
  const [declineRemarks, setDeclineRemarks] = useState('');
  const [cancellationProcessing, setCancellationProcessing] = useState(false);
  const [activeLoansSearch, setActiveLoansSearch] = useState('');
  const [activeLoansFilter, setActiveLoansFilter] = useState('all'); // 'all' | 'due-soon' | 'overdue'
  const [isLoansOverlayOpen, setIsLoansOverlayOpen] = useState(false);
  const [overlaySearch, setOverlaySearch] = useState('');
  const [overlayFilter, setOverlayFilter] = useState('all'); // 'all' | 'due-soon' | 'overdue'
  const [overlayViewMode, setOverlayViewMode] = useState('table'); // 'table' | 'grid'
  const [selectedActiveLoan, setSelectedActiveLoan] = useState(null);
  const [schoolsMap, setSchoolsMap] = useState({});
  const [zoomIdImage, setZoomIdImage] = useState(false);

  // Ready for Pickup & Direct Release States
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [pickupFilter, setPickupFilter] = useState('all'); // 'all' | 'expiring-soon' | 'expired'
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [requestToRelease, setRequestToRelease] = useState(null);
  const [releaseDueDate, setReleaseDueDate] = useState('');
  const [releaseProcessing, setReleaseProcessing] = useState(false);

  // Policy & Hold Window States
  const [pickupHoldDays, setPickupHoldDays] = useState(3);
  const [homeBorrowingDays, setHomeBorrowingDays] = useState(7);
  const [isHoldSettingsOpen, setIsHoldSettingsOpen] = useState(false);
  const [savingHoldSettings, setSavingHoldSettings] = useState(false);
  const [tempHoldDays, setTempHoldDays] = useState(3);

  // Helper to trigger toast notification
  const showToast = (type, message) => {
    setActionToast({ type, message });
    setTimeout(() => {
      setActionToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchLibraryPolicy = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) return;
    try {
      const { data } = await getLibraryPolicy(schoolId);
      if (data) {
        if (data.pickup_hold_days) {
          setPickupHoldDays(Number(data.pickup_hold_days));
          setTempHoldDays(Number(data.pickup_hold_days));
        }
        if (data.home_borrowing_days) {
          setHomeBorrowingDays(Number(data.home_borrowing_days));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch library policy:', e);
    }
  };

  const handleSaveHoldDays = async (newDays) => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) return;
    const daysNum = Math.max(1, parseInt(newDays) || 3);
    setSavingHoldSettings(true);
    try {
      await updateLibraryPolicy(schoolId, { pickup_hold_days: daysNum });
      setPickupHoldDays(daysNum);
      setTempHoldDays(daysNum);
      setIsHoldSettingsOpen(false);
      showToast('success', `Pickup hold window successfully updated to ${daysNum} day(s)!`);
    } catch (err) {
      console.error('Error updating hold policy:', err);
      showToast('error', 'Failed to update hold window. Please try again.');
    } finally {
      setSavingHoldSettings(false);
    }
  };

  useEffect(() => {
    fetchLibraryPolicy();
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

  const handleReturnBook = async (borrowId, bookTitle = 'Book', studentName = 'Student') => {
    if (!window.confirm(`Confirm return / check-in for "${bookTitle}" borrowed by ${studentName}?`)) {
      return;
    }
    try {
      setReturningBookId(borrowId);
      const { data, error } = await returnBook(borrowId);
      if (error) throw error;

      showToast('approve', `"${bookTitle}" successfully returned and checked back into the library catalog!`);
      
      addNotification({
        type: 'BOOK_RETURNED',
        title: 'Book Returned & Checked In',
        message: `"${bookTitle}" borrowed by ${studentName} was checked in successfully.`,
        student_name: studentName,
      });

      await fetchActiveBorrows();
      await fetchBorrowRequests();
      window.dispatchEvent(new CustomEvent('refreshStats'));
    } catch (err) {
      console.error('Error returning book:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to check in returned book. Please try again.');
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
      
      // Show approved checkmark on list row
      setApprovedRequest(requestId);
      setProcessingRequest(null);
      setShowApproveConfirm(false);
      setRequestToProcess(null);

      // 🎉 Show success toast
      showToast('approve', `Request ${requestId} has been successfully approved!`);

      // Clear checkmark after 2 seconds and refresh
      setTimeout(() => {
        setApprovedRequest(null);
        fetchBorrowRequests();
        fetchInterSchoolRequests();
      }, 2000);
    } catch (err) {
      console.error('Error approving request:', err);
      setProcessingRequest(null);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleRejectRequest = async (requestId, reason = '') => {
    try {
      setProcessingRequest(requestId);
      const adminId = getStoredUserId();
      if (!adminId) {
        throw new Error('Admin session is missing. Please log in again.');
      }

      const { data, error } = await updateBorrowRequestStatus(requestId, 'rejected', adminId, reason);
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
            title: 'Borrow Request Declined - Partner School',
            message: `Your borrow request ${requestId} for books from ${partnerSchools.join(', ')} has been declined.${reason ? ` Reason: "${reason}"` : ' Please contact the library for more information.'}`,
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
            title: 'Borrow Request Declined',
            message: `Your borrow request ${requestId} has been declined.${reason ? ` Reason: "${reason}"` : ' Please contact the library for more information.'}`,
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
      setDeclineReason('');
      setProcessingRequest(null);

      // ❌ Show decline toast
      showToast('decline', `Request ${requestId} has been successfully declined.`);
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

      showToast('approve', `Cancellation for request #${requestId} confirmed.`);

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

      showToast('decline', `Cancellation for request #${requestId} declined.`);

      await fetchBorrowRequests();
      await fetchInterSchoolRequests();
    } catch (err) {
      console.error('Error declining cancellation:', err);
      alert('Failed to decline cancellation. Please try again.');
    } finally {
      setCancellationProcessing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // READY FOR PICKUP (APPROVED) DATA & HELPERS
  // ═══════════════════════════════════════════════════════════════════
  const isUnreleasedApproved = (item) => {
    const s = String(item?.item_status || item?.status || '').toLowerCase();
    return s === 'approved' || s === 'ready_for_pickup' || s === 'ready for pickup';
  };

  const readyForPickupRequests = [
    ...borrowRequests
      .filter(r => {
        const s = String(r.status || '').toLowerCase();
        if (s !== 'approved' && s !== 'ready_for_pickup') return false;
        const items = r.items || [];
        if (items.length > 0) {
          return items.some(isUnreleasedApproved);
        }
        return true;
      })
      .map(r => ({ ...r, _queueType: 'home' })),
    ...interSchoolRequests
      .filter(r => {
        const parentStatus = String(r.borrow_request?.status || r.status || '').toLowerCase();
        if (parentStatus !== 'approved' && parentStatus !== 'ready_for_pickup') return false;
        const selfStatus = String(r.item_status || r.status || '').toLowerCase();
        if (selfStatus === 'borrowed' || selfStatus === 'released' || selfStatus === 'returned' || selfStatus === 'cancelled' || selfStatus === 'rejected') {
          return false;
        }
        const items = r.borrow_request?.items || r.items || [];
        if (items.length > 0) {
          return items.some(isUnreleasedApproved);
        }
        return true;
      })
      .map(r => {
        const base = r.borrow_request || r;
        return {
          ...base,
          _queueType: 'inter-school',
          rawInterSchool: r
        };
      })
  ].reduce((acc, curr) => {
    if (!acc.some(item => item.request_id === curr.request_id)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  const getPickupCountdown = (approvedDateStr, createdDateStr) => {
    const baseDate = new Date(approvedDateStr || createdDateStr || Date.now());
    const holdDays = pickupHoldDays || 3;
    if (isNaN(baseDate.getTime())) {
      return { 
        label: `${holdDays} days left`, 
        detail: 'Standard Pickup Window',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        badgeBg: 'emerald',
        isExpired: false 
      };
    }
    // Dynamic Configurable Pickup Window
    const expiresAt = new Date(baseDate.getTime() + (holdDays * 24 * 60 * 60 * 1000));
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      const daysOverdue = Math.max(1, Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000)));
      return {
        label: `Expired (${daysOverdue}d ago)`,
        detail: 'Unclaimed Hold Reservation',
        colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
        badgeBg: 'rose',
        isExpired: true,
        expiresAt
      };
    }

    const hoursLeft = Math.floor(diffMs / (60 * 60 * 1000));
    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (hoursLeft < 24) {
      return {
        label: `Expires in ${hoursLeft}h`,
        detail: 'Expiring today!',
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
        badgeBg: 'amber',
        isExpired: false,
        isDueToday: true,
        expiresAt
      };
    }

    return {
      label: `${daysLeft} days left to claim`,
      detail: `Hold until ${formatPhilippineDate(expiresAt)}`,
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeBg: 'emerald',
      isExpired: false,
      expiresAt
    };
  };

  const handleOpenReleaseModal = (request) => {
    setRequestToRelease(request);
    const loanDays = homeBorrowingDays || 7;
    const d = new Date();
    d.setDate(d.getDate() + loanDays);
    const defaultDueDate = d.toISOString().split('T')[0];
    setReleaseDueDate(defaultDueDate);
    setShowReleaseModal(true);
  };

  const confirmDirectRelease = async () => {
    if (!requestToRelease) return;
    setReleaseProcessing(true);
    try {
      const items = requestToRelease.items || [];
      const adminId = getStoredUserId();
      
      if (items.length > 0) {
        for (const item of items) {
          if (item.item_id && item.item_status !== 'borrowed') {
            await releaseBookItem(item.item_id, item.copy_id || null);
          }
        }
      } else {
        await updateBorrowRequestStatus(requestToRelease.request_id, 'borrowed', adminId);
      }

      const studentIdentity = getRequestStudentIdentity(requestToRelease);
      
      addNotification({
        type: 'BOOK_RELEASED',
        title: 'Books Picked Up & Loan Active',
        message: `Your requested books for ${requestToRelease.request_id} have been released. Due date is ${formatPhilippineDate(releaseDueDate)}. Please return books on time to avoid fines.`,
        related_request_id: requestToRelease.request_id,
        student_name: studentIdentity.name,
      });

      showToast('approve', `Books for Request #${requestToRelease.request_id} successfully released to ${studentIdentity.name}! Moved to Active Loans.`);
      
      setShowReleaseModal(false);
      setRequestToRelease(null);

      await fetchBorrowRequests();
      await fetchInterSchoolRequests();
      await fetchActiveBorrows();
      window.dispatchEvent(new CustomEvent('refreshStats'));
    } catch (err) {
      console.error('Error releasing book:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to release book. Please try again.');
    } finally {
      setReleaseProcessing(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Action Toast Notification (Approve / Decline success feedback) */}
      {actionToast && (
        <div className="fixed top-6 right-6 z-[100] max-w-md w-full animate-slide-up pointer-events-auto shadow-2xl">
          <div
            className={`flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
              actionToast.type === 'approve'
                ? 'bg-slate-900/95 border-emerald-500/40 text-white shadow-emerald-950/40'
                : 'bg-slate-900/95 border-rose-500/40 text-white shadow-rose-950/40'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                actionToast.type === 'approve'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {actionToast.type === 'approve' ? (
                <FiCheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <FiXCircle className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    actionToast.type === 'approve' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <h4 className="text-sm font-bold tracking-tight text-white">
                  {actionToast.type === 'approve' ? 'Request Approved' : 'Request Declined'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
                {actionToast.message}
              </p>
            </div>
            <button
              onClick={() => setActionToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 -mr-1 -mt-1"
              aria-label="Close notification"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
              <span className="text-xs text-slate-500 font-medium">Auto-synced Circulation Counter</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Borrow Requests Counter</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
              Process campus book reservations, monitor approved holds ready for pickup, release loans, and handle cancellations in real-time.
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

      {/* ══════════════════════════════════════════════════════════════
           4 REAL-TIME KPI SUMMARY METRIC CARDS
          ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Pending Approvals */}
        <div
          onClick={() => setActiveRequestTab('home-school')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            activeRequestTab === 'home-school' || activeRequestTab === 'inter-school'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-600'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeRequestTab === 'home-school' || activeRequestTab === 'inter-school'
                ? 'bg-white/20 text-white'
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              <FiClock className="w-4 h-4" />
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              activeRequestTab === 'home-school' || activeRequestTab === 'inter-school'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-700'
            }`}>
              Queue
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight">
            {borrowRequests.filter(r => r.status === 'pending').length + interSchoolRequests.filter(r => r.status === 'pending').length}
          </div>
          <p className={`text-xs font-medium mt-0.5 ${
            activeRequestTab === 'home-school' || activeRequestTab === 'inter-school'
              ? 'text-blue-100'
              : 'text-slate-500'
          }`}>
            Pending Review
          </p>
        </div>

        {/* Card 2: Ready for Pickup (Approved) */}
        <div
          onClick={() => setActiveRequestTab('ready-for-pickup')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group relative ${
            activeRequestTab === 'ready-for-pickup'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-emerald-600'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeRequestTab === 'ready-for-pickup'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              <FiPackage className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                activeRequestTab === 'ready-for-pickup'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {pickupHoldDays}-Day Hold
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTempHoldDays(pickupHoldDays);
                  setIsHoldSettingsOpen(true);
                }}
                className={`p-1 rounded-lg transition-colors ${
                  activeRequestTab === 'ready-for-pickup'
                    ? 'text-white/80 hover:text-white hover:bg-white/20'
                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
                title="Adjust Pickup Hold Window (Days)"
              >
                <FiSettings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight">
            {readyForPickupRequests.length}
          </div>
          <p className={`text-xs font-medium mt-0.5 ${
            activeRequestTab === 'ready-for-pickup'
              ? 'text-emerald-100'
              : 'text-slate-500'
          }`}>
            Ready for Pickup
          </p>
        </div>

        {/* Card 3: Active Loans */}
        <div
          onClick={() => setActiveRequestTab('active-loans')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            activeRequestTab === 'active-loans'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-indigo-600'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeRequestTab === 'active-loans'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}>
              <FiBook className="w-4 h-4" />
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              activeRequestTab === 'active-loans'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              Borrowed
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight">
            {activeBorrows.length}
          </div>
          <p className={`text-xs font-medium mt-0.5 ${
            activeRequestTab === 'active-loans'
              ? 'text-indigo-100'
              : 'text-slate-500'
          }`}>
            Active Loans
          </p>
        </div>

        {/* Card 4: Hold Cancellations */}
        <div
          onClick={() => setActiveRequestTab('cancellations')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            activeRequestTab === 'cancellations'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-amber-600'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeRequestTab === 'cancellations'
                ? 'bg-white/20 text-white'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              <FiAlertTriangle className="w-4 h-4" />
            </div>
            {cancellationRequests.length > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                Action Req.
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Clear
              </span>
            )}
          </div>
          <div className="text-2xl font-black tracking-tight">
            {cancellationRequests.length}
          </div>
          <p className={`text-xs font-medium mt-0.5 ${
            activeRequestTab === 'cancellations'
              ? 'text-amber-100'
              : 'text-slate-500'
          }`}>
            Hold Cancellations
          </p>
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
          <span>Home School (Pending)</span>
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
          <span>Inter-School (Pending)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
            activeRequestTab === 'inter-school' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {interSchoolRequests.filter(r => r.status === 'pending').length}
          </span>
        </button>

        {/* 📦 NEW TAB: Ready for Pickup (Approved) */}
        <button
          onClick={() => setActiveRequestTab('ready-for-pickup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeRequestTab === 'ready-for-pickup'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FiPackage className="w-4 h-4 text-emerald-600" />
          <span>Ready for Pickup</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
            activeRequestTab === 'ready-for-pickup' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {readyForPickupRequests.length}
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
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FiBook className="w-4 h-4" />
          <span>Active Loans</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
            activeRequestTab === 'active-loans' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
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

      {/* ══════════════════════════════════════════════════════════════
           READY FOR PICKUP (APPROVED) QUEUE TABLE & CARDS
          ══════════════════════════════════════════════════════════════ */}
      {activeRequestTab === 'ready-for-pickup' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Section Header with Search & Filter */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FiPackage className="w-5 h-5 text-emerald-600" />
                  <span>Ready for Pickup Queue</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {readyForPickupRequests.length} approved holds
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approved book holds waiting for student collection at the counter. Students have a 3-day pickup window.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchBorrowRequests();
                    fetchInterSchoolRequests();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shrink-0"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${borrowRequestsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div className="relative flex-1">
                <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by student name, ID number, request ID, book title..."
                  value={pickupSearchQuery}
                  onChange={(e) => setPickupSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                {pickupSearchQuery && (
                  <button
                    onClick={() => setPickupSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setPickupFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    pickupFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({readyForPickupRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPickupFilter('expiring-soon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    pickupFilter === 'expiring-soon'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Expiring Soon
                </button>
                <button
                  type="button"
                  onClick={() => setPickupFilter('expired')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    pickupFilter === 'expired'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Unclaimed / Expired
                </button>
              </div>
            </div>
          </div>

          {borrowRequestsLoading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Loading pickup queue...</p>
            </div>
          ) : readyForPickupRequests.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <FiPackage className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Approved Holds Waiting</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are currently no approved requests waiting for student pickup. When you approve a borrow request, it will appear here with a 3-day hold window.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Request & Pass</th>
                    <th className="py-3 px-4">Borrower Student</th>
                    <th className="py-3 px-4">Reserved Book(s)</th>
                    <th className="py-3 px-4">Approved At</th>
                    <th className="py-3 px-4">Pickup Deadline ({pickupHoldDays} Days)</th>
                    <th className="py-3 px-4 text-right">Counter Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readyForPickupRequests
                    .filter((request) => {
                      const countdown = getPickupCountdown(request.updated_at || request.approval_date, request.created_at);
                      if (pickupFilter === 'expired' && !countdown.isExpired) return false;
                      if (pickupFilter === 'expiring-soon' && !countdown.isDueToday) return false;

                      if (!pickupSearchQuery.trim()) return true;
                      const q = pickupSearchQuery.toLowerCase();
                      const student = request.student || {};
                      const studentName = `${student.firstname || request.first_name || ''} ${student.lastname || request.last_name || ''}`.toLowerCase();
                      const studentId = (student.student_number || request.student_id || '').toLowerCase();
                      const reqId = (request.request_id || '').toLowerCase();
                      const qrToken = (request.qr_token || '').toLowerCase();
                      const bookTitles = (request.items?.map(i => i.title || i.book_title || '').join(' ') || '').toLowerCase();

                      return (
                        studentName.includes(q) ||
                        studentId.includes(q) ||
                        reqId.includes(q) ||
                        qrToken.includes(q) ||
                        bookTitles.includes(q)
                      );
                    })
                    .map((request) => {
                      const student = request.student || {};
                      const studentIdentity = getRequestStudentIdentity(request);
                      const items = request.items || [];
                      const bookCount = items.length || 1;
                      const countdown = getPickupCountdown(request.updated_at || request.approval_date, request.created_at);
                      const firstItem = items[0] || {};
                      const firstBookData = booksData[firstItem.book_id] || firstItem.book || {};
                      const bookCover = firstItem.cover_image || firstBookData.cover_image;

                      return (
                        <tr key={request.request_id} className="hover:bg-emerald-50/20 transition-colors">
                          {/* Request ID + QR Pass Token */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="text-xs font-mono font-bold text-blue-600 block">
                                {request.request_id}
                              </span>
                              {request.qr_token ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700 font-semibold" title="QR Code Claim Token">
                                  <FiHash className="w-3 h-3 text-slate-400" />
                                  {request.qr_token}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">Token: Auto-QR</span>
                              )}
                              {request._queueType === 'inter-school' && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Inter-School
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Student Identity with Profile Picture */}
                          <td className="py-3.5 px-4 text-sm text-slate-700">
                            <div className="flex items-center gap-3">
                              {studentIdentity.profilePicture ? (
                                <img
                                  src={getBackendAssetUrl(studentIdentity.profilePicture)}
                                  alt={studentIdentity.name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200 shadow-xs shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs border-2 border-white ${studentIdentity.profilePicture ? 'hidden' : 'flex'}`}>
                                {(studentIdentity.name || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-900 leading-snug">
                                  {studentIdentity.name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono font-semibold">
                                  {student.student_number || request.student_id || 'ID N/A'}
                                </div>
                                {(student.department || student.college) && (
                                  <div className="text-[10px] text-slate-400">
                                    {student.department || student.college}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Reserved Books with Cover */}
                          <td className="py-3.5 px-4 text-xs text-slate-700">
                            <div className="flex items-center gap-2.5">
                              {bookCover ? (
                                <div className="w-8 h-12 rounded overflow-hidden shrink-0 shadow-xs border border-slate-200">
                                  <img
                                    src={getBackendAssetUrl(bookCover)}
                                    alt={firstBookData.title || 'Book'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-12 rounded bg-gradient-to-br from-emerald-500 to-slate-700 flex items-center justify-center text-white shrink-0 shadow-xs">
                                  <FiBook className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 max-w-[200px]">
                                <p className="font-bold text-xs text-slate-900 truncate" title={items.map(i => i.title || i.book_title || firstBookData.title).join(', ')}>
                                  {firstBookData.title || firstItem.title || firstItem.book_title || 'Reserved Book'}
                                </p>
                                {bookCount > 1 && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    +{bookCount - 1} more book{bookCount > 2 ? 's' : ''}
                                  </span>
                                )}
                                {(firstBookData.isbn || firstItem.isbn) && (
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    ISBN: {firstBookData.isbn || firstItem.isbn}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Approved Timestamp */}
                          <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                            <div className="flex items-center gap-1 text-slate-700">
                              <FiClock className="w-3 h-3 text-slate-400" />
                              <span className="font-semibold">{formatPhilippineDateTime(request.updated_at || request.approval_date || request.created_at)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {formatDateTimeWithRelative(request.updated_at || request.approval_date || request.created_at)}
                            </span>
                          </td>

                          {/* Pickup Window & Loan Period */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${countdown.colorClass}`}>
                                <span className={`w-2 h-2 rounded-full ${
                                  countdown.badgeBg === 'rose'
                                    ? 'bg-rose-500'
                                    : countdown.badgeBg === 'amber'
                                      ? 'bg-amber-500 animate-ping'
                                      : 'bg-emerald-500'
                                }`} />
                                <span>{countdown.label}</span>
                              </span>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {countdown.detail}
                              </p>
                              <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <FiCalendar className="w-2.5 h-2.5" />
                                <span>{homeBorrowingDays}-day loan upon release</span>
                              </p>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetails(request)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 hover:text-slate-900 border border-slate-200"
                                title="Review Full Details"
                              >
                                <FiEye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenReleaseModal(request)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition active:scale-95"
                                title="Direct Release Books to Student"
                              >
                                <FiZap className="w-3.5 h-3.5" />
                                <span>Release Books</span>
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
                ) : selectedRequest.status === 'approved' ? (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleOpenReleaseModal(selectedRequest);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
                  >
                    <FiZap className="w-4 h-4" />
                    Direct Release Books
                  </button>
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

      {/* ══════════════════════════════════════════════════════════
           APPROVE CONFIRMATION MODAL — Premium Redesign
          ══════════════════════════════════════════════════════════ */}
      {showApproveConfirm && requestToProcess && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ animation: 'fadeInOverlay 0.2s ease-out' }}
          onClick={() => { setShowApproveConfirm(false); setRequestToProcess(null); }}
        >
          {/* Blurred dark overlay */}
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />

          {/* Modal Card */}
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation: 'slideUpScale 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Green gradient header bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400" />

            <div className="px-7 pt-7 pb-6">
              {/* Icon + Title */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">Approve Request</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{requestToProcess}</p>
                </div>
              </div>

              {/* Context message */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6">
                <p className="text-sm text-emerald-900 leading-relaxed">
                  You are about to <span className="font-bold">approve</span> this borrow request. The student will be notified and allowed to proceed with picking up the requested books from the library.
                </p>
              </div>

              {/* Info row */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 px-1">
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                A QR access token will be generated automatically for the student.
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowApproveConfirm(false); setRequestToProcess(null); }}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproveRequest(requestToProcess)}
                  disabled={processingRequest === requestToProcess}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold hover:from-emerald-600 hover:to-green-700 transition-all duration-150 shadow-lg shadow-emerald-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {processingRequest === requestToProcess ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      Approve Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
           DECLINE CONFIRMATION MODAL — Premium Redesign
          ══════════════════════════════════════════════════════════ */}
      {showRejectConfirm && requestToProcess && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ animation: 'fadeInOverlay 0.2s ease-out' }}
          onClick={() => { setShowRejectConfirm(false); setRequestToProcess(null); setDeclineReason(''); }}
        >
          {/* Blurred dark overlay */}
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />

          {/* Modal Card */}
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation: 'slideUpScale 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red gradient header bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-400 via-red-500 to-orange-400" />

            <div className="px-7 pt-7 pb-6">
              {/* Icon + Title */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">Decline Request</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{requestToProcess}</p>
                </div>
              </div>

              {/* Warning message */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-5">
                <p className="text-sm text-rose-900 leading-relaxed">
                  You are about to <span className="font-bold">decline</span> this request. The student will be notified and may need to resubmit a new borrow request.
                </p>
              </div>

              {/* Reason textarea — required */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Reason for Declining <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value.slice(0, 300))}
                  placeholder="e.g. Book is currently reserved for another borrower, insufficient identification, policy violation..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm text-slate-800 placeholder:text-slate-400 px-3.5 py-3 resize-none transition-all duration-150"
                />
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-[11px] text-slate-400">This message will be sent to the student as notification.</p>
                  <span className={`text-[11px] font-mono ${declineReason.length > 260 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {declineReason.length}/300
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectConfirm(false); setRequestToProcess(null); setDeclineReason(''); }}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectRequest(requestToProcess, declineReason)}
                  disabled={processingRequest === requestToProcess || declineReason.trim().length < 5}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-bold hover:from-rose-600 hover:to-red-700 transition-all duration-150 shadow-lg shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingRequest === requestToProcess ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <FiXCircle className="w-4 h-4" />
                      Confirm Decline
                    </>
                  )}
                </button>
              </div>
              {declineReason.trim().length > 0 && declineReason.trim().length < 5 && (
                <p className="text-xs text-rose-500 mt-2 text-center">Please enter at least 5 characters for the reason.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
           DIRECT RELEASE CONFIRMATION MODAL — Counter Handover
          ══════════════════════════════════════════════════════════════ */}
      {showReleaseModal && requestToRelease && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          style={{ animation: 'fadeInOverlay 0.2s ease-out' }}
          onClick={() => { if (!releaseProcessing) { setShowReleaseModal(false); setRequestToRelease(null); } }}
        >
          {/* Blurred dark overlay */}
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />

          {/* Modal Card */}
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ animation: 'slideUpScale 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Accent */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

            <div className="p-6 sm:p-7">
              {/* Title + Request info */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                    <FiZap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">Release Books to Student</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Request #{requestToRelease.request_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowReleaseModal(false); setRequestToRelease(null); }}
                  disabled={releaseProcessing}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Borrower Verification Summary Card */}
              {(() => {
                const s = requestToRelease.student || {};
                const ident = getRequestStudentIdentity(requestToRelease);
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/30 border border-slate-200/80 mb-5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Borrower Verification
                    </span>
                    <div className="flex items-center gap-3">
                      {ident.profilePicture ? (
                        <img
                          src={getBackendAssetUrl(ident.profilePicture)}
                          alt={ident.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-emerald-800 text-sm shrink-0">
                          {(ident.name || 'S').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{ident.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">ID: {s.student_number || requestToRelease.student_id || 'N/A'}</p>
                        <p className="text-xs text-slate-500 truncate">{s.department || s.college || s.school_name || 'Student Borrower'}</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 shrink-0 flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Reserved Items to Handover */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Items to Handover ({requestToRelease.items?.length || 1})
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(requestToRelease.items || [{ title: 'Requested Book Item', book_id: requestToRelease.book_id }]).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FiBook className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          {item.title || item.book_title || `Book ID: ${item.book_id || 'N/A'}`}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Loan Due Date Policy (Set by Admin-Librarian) */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <FiShield className="w-3.5 h-3.5 text-blue-600" />
                    Official Loan Due Date
                  </label>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    <FiLock className="w-2.5 h-2.5" />
                    Admin-Librarian Policy
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    value={releaseDueDate}
                    disabled={!isAdminLibrarian}
                    onChange={(e) => {
                      if (isAdminLibrarian) {
                        setReleaseDueDate(e.target.value);
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isAdminLibrarian
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer'
                        : 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed select-none'
                    }`}
                  />
                  {!isAdminLibrarian && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-slate-500 pointer-events-none">
                      <FiLock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Policy Locked</span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <FiAlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Ang loan duration na ito ay <span className="font-bold text-slate-800">opisyal na itinakda ng Admin-Librarian</span> ayon sa institutional borrowing rules. Hindi ito mababago ng regular circulation staff para maiwasan ang tampering.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReleaseModal(false); setRequestToRelease(null); }}
                  disabled={releaseProcessing}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDirectRelease}
                  disabled={releaseProcessing}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {releaseProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Releasing Books...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Confirm & Handover</span>
                    </>
                  )}
                </button>
              </div>
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
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FiBook className="w-5 h-5 text-blue-600" />
                  Active Loans Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Currently borrowed books across all students</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {/* 🌟 VIEW ALL OVERLAY BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsLoansOverlayOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
                  title="Open full-screen active loans overlay"
                >
                  <FiMaximize2 className="w-3.5 h-3.5" />
                  <span>View All (Overlay)</span>
                </button>

                <button
                  onClick={fetchActiveBorrows}
                  disabled={activeBorrowsLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  title="Refresh active loans list"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 ${activeBorrowsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Instant Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search active loans by title, student, ID, accession..."
                  value={activeLoansSearch}
                  onChange={(e) => setActiveLoansSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveLoansFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    activeLoansFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({activeBorrows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLoansFilter('due-soon')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    activeLoansFilter === 'due-soon'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Due Soon
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLoansFilter('overdue')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    activeLoansFilter === 'overdue'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Overdue
                </button>
              </div>
            </div>
          </div>
          
          {activeBorrowsLoading ? (
            <div className="text-center py-10 text-slate-500 text-xs">Loading active loans...</div>
          ) : activeBorrows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Active Borrows"
                description="There are no active book borrows at the moment."
              />
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-3.5 py-2.5">Book</th>
                      <th className="px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Borrowed</th>
                      <th className="px-3 py-2.5">Due Date</th>
                      <th className="px-2.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
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
                        const bookCover = book.cover_image || booksData[borrow.book_id]?.cover_image || borrow.book_copies?.books?.cover_image;
                        const studentAvatar = student.profile_image || student.avatar_url || studentsData[borrow.student_id]?.profile_image;
                        const schoolName = book.schools?.school_name || schoolsMap[book.school_id]?.school_name || '';
                        const dueDate = new Date(borrow.due_date);
                        const today = new Date();
                        const isOverdue = dueDate < today;
                        const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= (2 * 24 * 60 * 60 * 1000);
                        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                        const studentFullName = student.firstname ? `${student.firstname} ${student.lastname}` : (student.name || 'Student Borrower');
                        
                        return (
                          <tr key={borrow.borrow_id} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Book Column with Compact Cover */}
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2.5">
                                {bookCover ? (
                                  <div className="relative w-8 h-11 rounded overflow-hidden shrink-0 shadow-xs border border-slate-200">
                                    <img
                                      src={getBackendAssetUrl(bookCover)}
                                      alt={book.title || 'Book Cover'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="hidden w-full h-full bg-gradient-to-br from-indigo-500 to-blue-700 items-center justify-center text-white text-[9px] font-black">
                                      <FiBook className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-8 h-11 rounded bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-800 flex flex-col items-center justify-center text-white shrink-0 shadow-xs border border-slate-200">
                                    <FiBook className="w-3.5 h-3.5 opacity-90" />
                                  </div>
                                )}
                                <div className="min-w-0 max-w-[170px] sm:max-w-[240px] xl:max-w-[300px]">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight" title={book.title}>
                                    {book.title || 'Unknown Title'}
                                  </p>
                                  {book.author && (
                                    <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                                      by {book.author}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {borrow.book_copies?.accession_number && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200/60 text-[9px] font-mono text-blue-700 font-bold">
                                        <FiTag className="w-2 h-2 text-blue-500" />
                                        {borrow.book_copies.accession_number}
                                      </span>
                                    )}
                                    {schoolName && (
                                      <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-50 text-slate-500 border border-slate-200 truncate max-w-[100px]">
                                        {schoolName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Student Column with Profile */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {studentAvatar ? (
                                  <img
                                    src={getBackendAssetUrl(studentAvatar)}
                                    alt={student.firstname || 'Student'}
                                    className="w-7 h-7 rounded-full object-cover border border-indigo-100 shadow-2xs shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 border border-white shadow-2xs ${studentAvatar ? 'hidden' : 'flex'}`}>
                                  {((student.firstname || student.name || 'S').charAt(0) + (student.lastname || '').charAt(0)).toUpperCase()}
                                </div>
                                <div className="min-w-0 max-w-[130px] sm:max-w-[170px]">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight" title={studentFullName}>
                                    {studentFullName}
                                  </p>
                                  <p className="font-mono text-[10px] text-slate-500 truncate mt-0.5">
                                    {student.student_number || `ID: ${borrow.student_id}`}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Borrowed Date */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <p className="text-xs font-semibold text-slate-800">
                                {formatPhilippineDate(borrow.borrow_date)}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatDateTimeWithRelative(borrow.borrow_date)}
                              </p>
                            </td>

                            {/* Due Date Column */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <FiClock className={`w-3 h-3 ${isOverdue ? 'text-rose-500' : (isDueSoon ? 'text-amber-500' : 'text-slate-400')}`} />
                                  <span className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : (isDueSoon ? 'text-amber-600' : 'text-slate-900')}`}>
                                    {formatPhilippineDate(dueDate)}
                                  </span>
                                </div>
                                {isOverdue ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
                                    {daysOverdue}d Overdue
                                  </span>
                                ) : isDueSoon ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                                    Due Soon
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                                    Active
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-2.5 py-2.5 whitespace-nowrap">
                              <StatusBadge status={isOverdue ? 'overdue' : (isDueSoon ? 'due soon' : 'active')} />
                            </td>

                            {/* Action */}
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                onClick={() => handleReturnBook(borrow.borrow_id, book.title || 'Book', studentFullName)}
                                disabled={returningBookId === borrow.borrow_id}
                                className="text-xs px-2.5 py-1 font-bold shadow-xs hover:shadow-sm transition-all active:scale-95 whitespace-nowrap"
                              >
                                {returningBookId === borrow.borrow_id ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                                    <span>Returning...</span>
                                  </>
                                ) : (
                                  <>
                                    <FiCheckCircle className="w-3.5 h-3.5 mr-1" />
                                    <span>Return</span>
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
            </div>
          )}
        </Card>
      )}

      {/* ⚙️ ADJUST PICKUP HOLD DURATION SETTINGS MODAL */}
      {isHoldSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FiPackage className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Adjust Pickup Hold Window</h3>
                  <p className="text-[11px] text-emerald-100">Set reservation expiration period for students</p>
                </div>
              </div>
              <button
                onClick={() => setIsHoldSettingsOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose how many days an approved book reservation is held at the counter before the reservation expires and returns to available inventory.
              </p>

              {/* Preset Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 5, 7, 10].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTempHoldDays(days)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
                      tempHoldDays === days
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base font-black">{days} {days === 1 ? 'Day' : 'Days'}</span>
                    <span className={`text-[10px] ${tempHoldDays === days ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {days === 3 ? 'Standard' : (days === 7 ? '1 Week' : `${days * 24} hours`)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Custom Hold Duration (Days)</span>
                  <span className="text-[11px] text-emerald-600 font-mono font-semibold">{tempHoldDays} day{tempHoldDays !== 1 ? 's' : ''} ({tempHoldDays * 24}h)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={tempHoldDays}
                    onChange={(e) => setTempHoldDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Days</span>
                </div>
              </div>

              {/* Info Callout */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-800">
                <FiHelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-snug text-[11px]">
                  <strong>Automatic Real-Time Sync:</strong> The Ready for Pickup Queue countdown timers and student claim deadlines will instantly adjust to <strong>{tempHoldDays} days</strong>.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsHoldSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveHoldDays(tempHoldDays)}
                disabled={savingHoldSettings}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingHoldSettings ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Policy...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Apply {tempHoldDays}-Day Hold
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 FULLSCREEN ACTIVE LOANS DIRECTORY OVERLAY MODAL */}
      {isLoansOverlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-6xl h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FiBook className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base sm:text-lg font-black tracking-tight">Active Loans Directory</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-xs">
                      {activeBorrows.length} Active {activeBorrows.length === 1 ? 'Loan' : 'Loans'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">Comprehensive overview and instant check-in for all active book circulations</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchActiveBorrows}
                  disabled={activeBorrowsLoading}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
                  title="Refresh Active Loans"
                >
                  <FiRefreshCw className={`w-4 h-4 ${activeBorrowsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoansOverlayOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition"
                  title="Close Overlay"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Search, Filters & View Toggle Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80 md:w-96">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by book title, student, ID, accession..."
                  value={overlaySearch}
                  onChange={(e) => setOverlaySearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
                {overlaySearch && (
                  <button
                    onClick={() => setOverlaySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Status Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOverlayFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      overlayFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({activeBorrows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverlayFilter('due-soon')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      overlayFilter === 'due-soon'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 hover:bg-amber-100/60'
                    }`}
                  >
                    Due Soon ({
                      activeBorrows.filter(b => {
                        const d = new Date(b.due_date);
                        const now = new Date();
                        return d >= now && (d.getTime() - now.getTime()) <= (2 * 24 * 60 * 60 * 1000);
                      }).length
                    })
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverlayFilter('overdue')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      overlayFilter === 'overdue'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 hover:bg-rose-100/60'
                    }`}
                  >
                    Overdue ({
                      activeBorrows.filter(b => new Date(b.due_date) < new Date()).length
                    })
                  </button>
                </div>

                {/* View Switcher (Table vs Grid) */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOverlayViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition ${
                      overlayViewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Table View"
                  >
                    <FiLayers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverlayViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition ${
                      overlayViewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Card Grid View"
                  >
                    <FiZap className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
              {(() => {
                const filteredLoans = activeBorrows.filter((borrow) => {
                  const dueDate = new Date(borrow.due_date);
                  const today = new Date();
                  const isOverdue = dueDate < today;
                  const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= (2 * 24 * 60 * 60 * 1000);

                  if (overlayFilter === 'overdue' && !isOverdue) return false;
                  if (overlayFilter === 'due-soon' && !isDueSoon) return false;

                  if (!overlaySearch.trim()) return true;

                  const q = overlaySearch.toLowerCase();
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
                });

                if (filteredLoans.length === 0) {
                  return (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                        <FiBook className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-700">No active loans found</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {overlaySearch ? `No results match "${overlaySearch}"` : 'There are currently no active book loans in this filter.'}
                      </p>
                    </div>
                  );
                }

                if (overlayViewMode === 'table') {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="px-5 py-3.5">Book Title & Details</th>
                              <th className="px-4 py-3.5">Student Borrower</th>
                              <th className="px-4 py-3.5">Borrowed Date</th>
                              <th className="px-4 py-3.5">Due Date & Timeline</th>
                              <th className="px-3 py-3.5">Status</th>
                              <th className="px-5 py-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredLoans.map((borrow) => {
                              const book = booksData[borrow.book_id] || borrow.book_copies?.books || {};
                              const student = studentsData[borrow.student_id] || borrow.student || {};
                              const bookCover = book.cover_image || booksData[borrow.book_id]?.cover_image || borrow.book_copies?.books?.cover_image;
                              const studentAvatar = student.profile_image || student.avatar_url || studentsData[borrow.student_id]?.profile_image;
                              const schoolName = book.schools?.school_name || schoolsMap[book.school_id]?.school_name || '';
                              const dueDate = new Date(borrow.due_date);
                              const today = new Date();
                              const isOverdue = dueDate < today;
                              const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= (2 * 24 * 60 * 60 * 1000);
                              const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                              const studentFullName = student.firstname ? `${student.firstname} ${student.lastname}` : (student.name || 'Student Borrower');

                              return (
                                <tr key={borrow.borrow_id} className="hover:bg-blue-50/40 transition-colors group">
                                  {/* Book Info */}
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3.5">
                                      {bookCover ? (
                                        <div className="relative w-11 h-16 rounded-lg overflow-hidden shrink-0 shadow-md border border-slate-200 group-hover:scale-105 transition-transform">
                                          <img
                                            src={getBackendAssetUrl(bookCover)}
                                            alt={book.title || 'Book Cover'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                            }}
                                          />
                                          <div className="hidden w-full h-full bg-gradient-to-br from-indigo-500 to-blue-700 items-center justify-center text-white text-xs font-black">
                                            <FiBook className="w-5 h-5" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-11 h-16 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-800 flex flex-col items-center justify-center text-white shrink-0 shadow-md border border-slate-200">
                                          <FiBook className="w-5 h-5 mb-0.5 opacity-90" />
                                          <span className="text-[9px] font-bold opacity-75 uppercase tracking-wider">Book</span>
                                        </div>
                                      )}
                                      <div className="min-w-0 max-w-sm">
                                        <p className="text-sm font-bold text-slate-900 truncate" title={book.title}>
                                          {book.title || 'Unknown Title'}
                                        </p>
                                        {book.author && (
                                          <p className="text-xs text-slate-500 truncate mt-0.5">
                                            by <span className="font-medium text-slate-700">{book.author}</span>
                                          </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                          {borrow.book_copies?.accession_number && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/70 text-[10px] font-mono text-blue-700 font-bold">
                                              <FiTag className="w-2.5 h-2.5 text-blue-500" />
                                              {borrow.book_copies.accession_number}
                                            </span>
                                          )}
                                          {book.isbn && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600 font-semibold">
                                              <FiHash className="w-2.5 h-2.5 text-slate-400" />
                                              {book.isbn}
                                            </span>
                                          )}
                                          {schoolName && (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 truncate max-w-[130px]">
                                              {schoolName}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Student Info */}
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      {studentAvatar ? (
                                        <img
                                          src={getBackendAssetUrl(studentAvatar)}
                                          alt={student.firstname || 'Student'}
                                          className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 shadow-xs shrink-0"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs border-2 border-white ${studentAvatar ? 'hidden' : 'flex'}`}>
                                        {((student.firstname || student.name || 'S').charAt(0) + (student.lastname || '').charAt(0)).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                          {studentFullName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                            {student.student_number || `ID: ${borrow.student_id}`}
                                          </span>
                                        </div>
                                        {student.email && (
                                          <p className="text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5">
                                            {student.email}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Borrowed Date */}
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <FiCalendar className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-slate-800">
                                          {formatPhilippineDate(borrow.borrow_date)}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          {formatDateTimeWithRelative(borrow.borrow_date)}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Due Date & Timeline */}
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <FiClock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-500' : (isDueSoon ? 'text-amber-500' : 'text-slate-400')}`} />
                                        <span className={`text-xs font-black ${isOverdue ? 'text-rose-600' : (isDueSoon ? 'text-amber-600' : 'text-slate-900')}`}>
                                          {formatPhilippineDate(dueDate)}
                                        </span>
                                      </div>
                                      {isOverdue ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-black text-rose-700">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                          <span>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} Overdue</span>
                                        </div>
                                      ) : isDueSoon ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-700">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                          <span>Due Soon</span>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                                          <span>Active Loan</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="px-3 py-4 whitespace-nowrap">
                                    <StatusBadge status={isOverdue ? 'overdue' : (isDueSoon ? 'due soon' : 'active')} />
                                  </td>

                                  {/* Action */}
                                  <td className="px-5 py-4 text-right whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      onClick={() => handleReturnBook(borrow.borrow_id, book.title || 'Book', studentFullName)}
                                      disabled={returningBookId === borrow.borrow_id}
                                      className="font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                    >
                                      {returningBookId === borrow.borrow_id ? (
                                        <>
                                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                                          Returning...
                                        </>
                                      ) : (
                                        <>
                                          <FiCheckCircle className="w-4 h-4 mr-1.5" />
                                          Return / Check-In
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
                    </div>
                  );
                }

                // Grid View Mode
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLoans.map((borrow) => {
                      const book = booksData[borrow.book_id] || borrow.book_copies?.books || {};
                      const student = studentsData[borrow.student_id] || borrow.student || {};
                      const bookCover = book.cover_image || booksData[borrow.book_id]?.cover_image || borrow.book_copies?.books?.cover_image;
                      const studentAvatar = student.profile_image || student.avatar_url || studentsData[borrow.student_id]?.profile_image;
                      const schoolName = book.schools?.school_name || schoolsMap[book.school_id]?.school_name || '';
                      const dueDate = new Date(borrow.due_date);
                      const today = new Date();
                      const isOverdue = dueDate < today;
                      const isDueSoon = !isOverdue && (dueDate.getTime() - today.getTime()) <= (2 * 24 * 60 * 60 * 1000);
                      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                      const studentFullName = student.firstname ? `${student.firstname} ${student.lastname}` : (student.name || 'Student Borrower');

                      return (
                        <div
                          key={borrow.borrow_id}
                          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                        >
                          {/* Book & Cover Info */}
                          <div className="flex items-start gap-3.5">
                            {bookCover ? (
                              <div className="relative w-14 h-20 rounded-xl overflow-hidden shrink-0 shadow-md border border-slate-200 group-hover:scale-105 transition-transform">
                                <img
                                  src={getBackendAssetUrl(bookCover)}
                                  alt={book.title || 'Book Cover'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden w-full h-full bg-gradient-to-br from-indigo-500 to-blue-700 items-center justify-center text-white text-xs font-black">
                                  <FiBook className="w-6 h-6" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-14 h-20 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-800 flex flex-col items-center justify-center text-white shrink-0 shadow-md border border-slate-200">
                                <FiBook className="w-6 h-6 mb-1 opacity-90" />
                                <span className="text-[9px] font-bold opacity-75 uppercase tracking-wider">Book</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={book.title}>
                                {book.title || 'Unknown Title'}
                              </p>
                              {book.author && (
                                <p className="text-xs text-slate-500 truncate mt-1">
                                  by <span className="font-semibold text-slate-700">{book.author}</span>
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {borrow.book_copies?.accession_number && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/70 text-[10px] font-mono text-blue-700 font-bold">
                                    <FiTag className="w-2.5 h-2.5 text-blue-500" />
                                    {borrow.book_copies.accession_number}
                                  </span>
                                )}
                                {schoolName && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200 truncate max-w-[120px]">
                                    {schoolName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Student Info Card */}
                          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
                            {studentAvatar ? (
                              <img
                                src={getBackendAssetUrl(studentAvatar)}
                                alt={studentFullName}
                                className="w-9 h-9 rounded-full object-cover border border-indigo-100 shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 ${studentAvatar ? 'hidden' : 'flex'}`}>
                              {((student.firstname || student.name || 'S').charAt(0) + (student.lastname || '').charAt(0)).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {studentFullName}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 truncate">
                                {student.student_number || `ID: ${borrow.student_id}`}
                              </p>
                            </div>
                          </div>

                          {/* Dates & Timeline */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Borrowed:</span>
                              <span className="font-semibold text-slate-800">{formatPhilippineDate(borrow.borrow_date)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Due Date:</span>
                              <span className={`font-black ${isOverdue ? 'text-rose-600' : (isDueSoon ? 'text-amber-600' : 'text-slate-900')}`}>
                                {formatPhilippineDate(dueDate)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-black text-rose-700">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                  {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} Overdue
                                </span>
                              ) : isDueSoon ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-black text-amber-700">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                  Due Soon
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                                  Active Loan
                                </span>
                              )}
                              <StatusBadge status={isOverdue ? 'overdue' : (isDueSoon ? 'due soon' : 'active')} />
                            </div>
                          </div>

                          {/* Return Button */}
                          <Button
                            size="md"
                            onClick={() => handleReturnBook(borrow.borrow_id, book.title || 'Book', studentFullName)}
                            disabled={returningBookId === borrow.borrow_id}
                            className="w-full font-bold shadow-xs hover:shadow-md transition-all active:scale-98"
                          >
                            {returningBookId === borrow.borrow_id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                                Returning Book...
                              </>
                            ) : (
                              <>
                                <FiCheckCircle className="w-4 h-4 mr-1.5" />
                                Return / Check-In
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Displaying <strong>{activeBorrows.length}</strong> active borrower circulation{activeBorrows.length !== 1 ? 's' : ''}
              </div>
              <button
                type="button"
                onClick={() => setIsLoansOverlayOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBorrowRequests;
