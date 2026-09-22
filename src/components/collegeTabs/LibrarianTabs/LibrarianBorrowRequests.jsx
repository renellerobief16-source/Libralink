import { useState, useEffect, useMemo } from "react";
import { 
  FiBook, FiUser, FiCalendar, FiMapPin, FiPhone, FiCheckCircle, FiXCircle, 
  FiClock, FiEye, FiChevronDown, FiChevronUp, FiRefreshCw, FiAlertTriangle, 
  FiGlobe, FiMail, FiHash, FiMaximize2, FiArrowRight, FiShield, FiX, FiLock,
  FiPackage, FiZap, FiSearch, FiFilter, FiCheck, FiLayers, FiInbox, FiExternalLink,
  FiSettings, FiSliders, FiTag, FiHelpCircle, FiCheckSquare, FiBell
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
  sendDueReminderNotification,
} from "../../../utils/api";
import api from "../../../utils/api";
import { useNotifications } from "../../../context/NotificationContext";
import { subscribeToSchoolChanges } from "../../../utils/realtime";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import { 
  formatDateTimeWithRelative, 
  formatPhilippineDateTime, 
  formatPhilippineDate,
  formatPhilippineTime,
  formatTimeWithRelative,
  getDueStatusDetails 
} from "../../../utils/timeUtils";

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
  const [homeQueueSearch, setHomeQueueSearch] = useState('');
  const [homeDatePreset, setHomeDatePreset] = useState('all'); // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'
  const [homeDateStart, setHomeDateStart] = useState('');
  const [homeDateEnd, setHomeDateEnd] = useState('');

  const [interSchoolSearch, setInterSchoolSearch] = useState('');
  const [interSchoolDatePreset, setInterSchoolDatePreset] = useState('all');
  const [interSchoolDateStart, setInterSchoolDateStart] = useState('');
  const [interSchoolDateEnd, setInterSchoolDateEnd] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [historyDatePreset, setHistoryDatePreset] = useState('all');
  const [historyDateStart, setHistoryDateStart] = useState('');
  const [historyDateEnd, setHistoryDateEnd] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // 'all' | 'returned' | 'cancelled'

  const [zoomIdModal, setZoomIdModal] = useState({ isOpen: false, imageUrl: '', studentName: '', studentNumber: '', schoolName: '' });
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

  // Return Inspection Modal States (Integrated Circulation Desk Check-in)
  const [showReturnInspectionModal, setShowReturnInspectionModal] = useState(false);
  const [loanToInspect, setLoanToInspect] = useState(null);
  const [returnCondition, setReturnCondition] = useState('good'); // 'good' | 'minor' | 'damaged'
  const [damageFee, setDamageFee] = useState('0');
  const [manualFineAmount, setManualFineAmount] = useState('0');
  const [isFinePaid, setIsFinePaid] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnInspectionProcessing, setReturnInspectionProcessing] = useState(false);

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

  // Open the Professional Return Inspection Modal
  const handleOpenReturnModal = (borrow, book, student) => {
    const dueStatus = getDueStatusDetails(borrow.due_date);
    const initialFine = dueStatus.isOverdue ? (dueStatus.daysOverdue * 5).toFixed(2) : '0';
    setLoanToInspect({
      ...borrow,
      book,
      student,
      dueStatus,
    });
    setReturnCondition('good');
    setDamageFee('0');
    setManualFineAmount(initialFine);
    setIsFinePaid(false);
    setReturnRemarks('');
    setShowReturnInspectionModal(true);
  };

  // Process the Return with Condition Check & Restock
  const handleConfirmReturnInspection = async () => {
    if (!loanToInspect) return;
    try {
      setReturnInspectionProcessing(true);
      const borrowId = loanToInspect.borrow_id;
      const { data, error } = await returnBook(borrowId);
      if (error) throw error;

      const bookTitle = loanToInspect.book?.title || 'Book';
      const studentName = loanToInspect.student?.firstname 
        ? `${loanToInspect.student.firstname} ${loanToInspect.student.lastname}` 
        : (loanToInspect.student?.name || 'Student Borrower');

      const conditionLabel = returnCondition === 'good' ? 'Good / Intact' : returnCondition === 'minor' ? 'Minor Wear' : 'Damaged';
      const totalFee = (parseFloat(manualFineAmount) || 0) + (parseFloat(damageFee) || 0);

      showToast('approve', `"${bookTitle}" successfully returned and restocked into catalog!`);

      addNotification({
        type: 'BOOK_RETURNED',
        title: 'Book Returned & Inspected',
        message: `"${bookTitle}" returned by ${studentName}. Condition: ${conditionLabel}${totalFee > 0 ? ` · Fee: ₱${totalFee.toFixed(2)}${isFinePaid ? ' (Paid at counter)' : ' (Pending clearance)'}` : ' · No fines'}`,
        student_name: studentName,
      });

      setShowReturnInspectionModal(false);
      setLoanToInspect(null);
      await fetchActiveBorrows();
      await fetchBorrowRequests();
      window.dispatchEvent(new CustomEvent('refreshStats'));
    } catch (err) {
      console.error('Error returning book:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to check in returned book. Please try again.');
    } finally {
      setReturnInspectionProcessing(false);
    }
  };

  const handleReturnBook = async (borrowId, bookTitle = 'Book', studentName = 'Student') => {
    // Locate the borrow record to open the inspection modal
    const borrow = activeBorrows.find(b => b.borrow_id === borrowId);
    if (borrow) {
      const book = booksData[borrow.book_id] || borrow.book_copies?.books || {};
      const student = studentsData[borrow.student_id] || borrow.student || {};
      handleOpenReturnModal(borrow, book, student);
      return;
    }

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

  const [sendingReminderId, setSendingReminderId] = useState(null);

  const handleSendStudentReminder = async (borrow, book, student) => {
    const studentId = borrow.student_id;
    if (!studentId) {
      alert('Cannot find student ID for this borrow record.');
      return;
    }

    setSendingReminderId(borrow.borrow_id);
    try {
      const dueStatus = getDueStatusDetails(borrow.due_date);
      const formattedDueDate = formatPhilippineDate(borrow.due_date);
      const studentName = student.firstname ? `${student.firstname} ${student.lastname}` : (student.name || 'Student');

      const { data, error } = await sendDueReminderNotification({
        student_id: studentId,
        book_title: book.title || 'Borrowed Book',
        due_date: formattedDueDate,
        reminder_type: dueStatus.isOverdue ? 'overdue' : dueStatus.isDueToday ? 'due_today' : 'due_soon',
        days_left: dueStatus.daysRemaining,
        days_overdue: dueStatus.daysOverdue,
        borrow_id: borrow.borrow_id,
      });

      if (error) throw error;

      showToast('approve', `Due reminder notice sent to ${studentName}'s student notification inbox!`);
    } catch (err) {
      console.error('Error sending due reminder:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to send reminder to student.');
    } finally {
      setSendingReminderId(null);
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
            setBooksData(prev => ({ ...prev, ...booksMap }));
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
        const uniqueBookIds = [...new Set(data.map(b => b.book_id || b.book_copies?.books?.book_id))].filter(id => id && String(id).length > 0);
        const uniqueStudentIds = [...new Set(data.map(b => b.student_id))].filter(id => id && String(id).length > 0);
        
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
            setBooksData(prev => ({ ...prev, ...booksMap }));
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
                const userData = studentResponse.data.data || studentResponse.data;
                studentsMap[studentId] = userData;
              }
            }
            setStudentsData(prev => ({ ...prev, ...studentsMap }));
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

  const matchesDateFilter = (dateStr, preset, customStart, customEnd) => {
    if (!dateStr || preset === 'all') return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    
    // Manila timezone calendar day comparison (UTC+8)
    const manilaOptions = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
    const recordDateStr = new Intl.DateTimeFormat('en-CA', manilaOptions).format(d);
    const todayDateStr = new Intl.DateTimeFormat('en-CA', manilaOptions).format(new Date());

    if (preset === 'today') {
      return recordDateStr === todayDateStr;
    }

    if (preset === 'this_week') {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 is Sunday
      const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diffToMonday));
      const mondayStr = new Intl.DateTimeFormat('en-CA', manilaOptions).format(monday);
      return recordDateStr >= mondayStr && recordDateStr <= todayDateStr;
    }

    if (preset === 'this_month') {
      const [year, month] = todayDateStr.split('-');
      return recordDateStr.startsWith(`${year}-${month}`);
    }

    if (preset === 'custom') {
      if (customStart && recordDateStr < customStart) return false;
      if (customEnd && recordDateStr > customEnd) return false;
      return true;
    }

    return true;
  };

  // Home School Active & Pending Requests Queue (Clean, unified)
  const homeFilteredRequests = useMemo(() => {
    return borrowRequests.filter((request) => {
      // Exclude completed history (those belong in Circulation History)
      const status = String(request.status || '').toLowerCase();
      if (status === 'returned' || status === 'cancelled' || status === 'rejected') {
        return false;
      }

      // Date filter
      const dateToCheck = request.created_at || request.borrow_date;
      if (!matchesDateFilter(dateToCheck, homeDatePreset, homeDateStart, homeDateEnd)) {
        return false;
      }

      // Search filter
      if (homeQueueSearch.trim()) {
        const q = homeQueueSearch.toLowerCase();
        const student = request.student || {};
        const studentName = `${student.firstname || ''} ${student.lastname || ''} ${student.name || ''}`.toLowerCase();
        const studentNumber = String(student.student_number || request.student_id || '').toLowerCase();
        const reqId = String(request.request_id || '').toLowerCase();
        const purpose = String(request.purpose || '').toLowerCase();
        const bookTitles = (request.items || []).map(it => it.book?.title || '').join(' ').toLowerCase();

        return (
          studentName.includes(q) ||
          studentNumber.includes(q) ||
          reqId.includes(q) ||
          purpose.includes(q) ||
          bookTitles.includes(q)
        );
      }

      return true;
    });
  }, [borrowRequests, homeDatePreset, homeDateStart, homeDateEnd, homeQueueSearch]);

  // Inter-School (Interlibrary) Filtered Requests
  const interSchoolFilteredRequests = useMemo(() => {
    return interSchoolRequests.filter((request) => {
      const status = String(request.status || request.item_status || request.borrow_request?.status || '').toLowerCase();
      if (status === 'returned' || status === 'cancelled' || status === 'rejected') {
        return false;
      }

      const dateToCheck = request.borrow_request?.created_at || request.created_at;
      if (!matchesDateFilter(dateToCheck, interSchoolDatePreset, interSchoolDateStart, interSchoolDateEnd)) {
        return false;
      }

      if (interSchoolSearch.trim()) {
        const q = interSchoolSearch.toLowerCase();
        const student = request.borrow_request?.student || request.student || {};
        const studentName = `${student.firstname || ''} ${student.lastname || ''} ${student.name || ''}`.toLowerCase();
        const studentNumber = String(student.student_number || request.student_id || '').toLowerCase();
        const reqId = String(request.borrow_request?.request_id || request.request_id || '').toLowerCase();
        const purpose = String(request.borrow_request?.purpose || request.purpose || '').toLowerCase();
        const bookTitle = String(request.book?.title || '').toLowerCase();

        return (
          studentName.includes(q) ||
          studentNumber.includes(q) ||
          reqId.includes(q) ||
          purpose.includes(q) ||
          bookTitle.includes(q)
        );
      }

      return true;
    });
  }, [interSchoolRequests, interSchoolDatePreset, interSchoolDateStart, interSchoolDateEnd, interSchoolSearch]);

  // Circulation History Records (Previous completed loans with date)
  const circulationHistoryRecords = useMemo(() => {
    const homeHistory = borrowRequests
      .filter(r => r.status === 'returned' || r.status === 'cancelled' || r.status === 'rejected')
      .map(r => ({ ...r, _queueSource: 'home' }));

    const interHistory = interSchoolRequests
      .filter(r => {
        const s = String(r.status || r.item_status || r.borrow_request?.status || '').toLowerCase();
        return s === 'returned' || s === 'cancelled' || s === 'rejected';
      })
      .map(r => ({
        ...(r.borrow_request || r),
        _queueSource: 'inter-school',
        rawItem: r
      }));

    const combined = [...homeHistory, ...interHistory].reduce((acc, curr) => {
      if (!acc.some(item => item.request_id === curr.request_id)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    return combined.filter(record => {
      const status = String(record.status || '').toLowerCase();
      if (historyTypeFilter === 'returned' && status !== 'returned') return false;
      if (historyTypeFilter === 'cancelled' && status !== 'cancelled' && status !== 'rejected') return false;

      const dateToCheck = record.return_date || record.updated_at || record.created_at;
      if (!matchesDateFilter(dateToCheck, historyDatePreset, historyDateStart, historyDateEnd)) {
        return false;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const student = record.student || {};
        const studentName = `${student.firstname || ''} ${student.lastname || ''} ${student.name || ''}`.toLowerCase();
        const studentNumber = String(student.student_number || record.student_id || '').toLowerCase();
        const reqId = String(record.request_id || '').toLowerCase();
        const bookTitles = (record.items || []).map(it => it.book?.title || '').join(' ').toLowerCase();

        return (
          studentName.includes(q) ||
          studentNumber.includes(q) ||
          reqId.includes(q) ||
          bookTitles.includes(q)
        );
      }

      return true;
    });
  }, [borrowRequests, interSchoolRequests, historyTypeFilter, historyDatePreset, historyDateStart, historyDateEnd, historySearch]);

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
      
      {/* Modern Compact Single-Line Switcher */}
      <div className="w-full max-w-full overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-100/95 border border-slate-200/90 shadow-2xs mb-5">
        <button
          onClick={() => setActiveRequestTab('home-school')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
            activeRequestTab === 'home-school'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FiBook className="w-3.5 h-3.5 text-blue-600" />
          <span>Home Requests</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeRequestTab === 'home-school' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {homeFilteredRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveRequestTab('inter-school')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
            activeRequestTab === 'inter-school'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FiGlobe className="w-3.5 h-3.5 text-blue-600" />
          <span>Inter-School</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeRequestTab === 'inter-school' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {interSchoolFilteredRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveRequestTab('ready-for-pickup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
            activeRequestTab === 'ready-for-pickup'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FiPackage className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ready for Pickup</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeRequestTab === 'ready-for-pickup' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {readyForPickupRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveRequestTab('active-loans')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
            activeRequestTab === 'active-loans'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FiBook className="w-3.5 h-3.5 text-indigo-600" />
          <span>Active Loans</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeRequestTab === 'active-loans' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {activeBorrows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveRequestTab('cancellations')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
            activeRequestTab === 'cancellations'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FiAlertTriangle className={`w-3.5 h-3.5 ${cancellationRequests.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Cancellations</span>
          {cancellationRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
              {cancellationRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveRequestTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
            activeRequestTab === 'history'
              ? 'bg-white text-purple-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FiClock className="w-3.5 h-3.5 text-purple-600" />
          <span>Circulation History</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeRequestTab === 'history' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {circulationHistoryRecords.length}
          </span>
        </button>
      </div>
      
      {/* Borrow Requests Table - Home School (Clean, unified with Date filter & School ID picture) */}
      {activeRequestTab === 'home-school' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Header with Title and Search/Date Filter/Refresh */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FiBook className="w-4 h-4 text-blue-600" />
                  <span>Home School Borrow Requests</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {homeFilteredRequests.length} {homeFilteredRequests.length === 1 ? 'record' : 'records'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor and manage student borrow requests and active book reservations
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    fetchBorrowRequests();
                    fetchActiveBorrows();
                  }}
                  disabled={borrowRequestsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                  title="Refresh queue"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 text-blue-600 ${borrowRequestsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Instant Search & Date Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by student, student ID, book title, request ID..."
                  value={homeQueueSearch}
                  onChange={(e) => setHomeQueueSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 bg-white shadow-2xs transition"
                />
                {homeQueueSearch && (
                  <button
                    type="button"
                    onClick={() => setHomeQueueSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter Presets */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3 text-slate-400" /> Date:
                  </span>
                  <button
                    type="button"
                    onClick={() => setHomeDatePreset('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      homeDatePreset === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeDatePreset('today')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      homeDatePreset === 'today'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeDatePreset('this_week')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      homeDatePreset === 'this_week'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeDatePreset('this_month')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      homeDatePreset === 'this_month'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeDatePreset('custom')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      homeDatePreset === 'custom'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {homeDatePreset === 'custom' && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
                    <input
                      type="date"
                      value={homeDateStart}
                      onChange={(e) => setHomeDateStart(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 outline-none font-medium"
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                      type="date"
                      value={homeDateEnd}
                      onChange={(e) => setHomeDateEnd(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 outline-none font-medium"
                    />
                    {(homeDateStart || homeDateEnd) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHomeDateStart('');
                          setHomeDateEnd('');
                        }}
                        className="text-slate-400 hover:text-slate-600 ml-0.5"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {borrowRequestsLoading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Fetching borrow requests...</p>
            </div>
          ) : homeFilteredRequests.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <FiCheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {homeQueueSearch || homeDatePreset !== 'all' ? 'No Matching Records Found' : 'No Active Requests'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {homeQueueSearch || homeDatePreset !== 'all'
                  ? 'No requests match your search or date filter. Try resetting filters to view all records.'
                  : 'There are no active borrow requests in the queue at the moment.'}
              </p>
              {(homeQueueSearch || homeDatePreset !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setHomeQueueSearch('');
                    setHomeDatePreset('all');
                    setHomeDateStart('');
                    setHomeDateEnd('');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                >
                  Reset Date & Filters
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-auto text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-1.5 px-2 whitespace-nowrap w-24">Request ID</th>
                    <th className="py-1.5 px-2 min-w-[150px] max-w-[190px]">Borrower</th>
                    <th className="py-1.5 px-2 min-w-[120px] max-w-[160px]">Campus</th>
                    <th className="py-1.5 px-2 min-w-[140px] max-w-[190px]">Book Details</th>
                    <th className="py-1.5 px-2 min-w-[95px] max-w-[130px]">Purpose</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[95px]">Requested</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[80px]">Status</th>
                    <th className="py-1.5 px-2 text-right whitespace-nowrap w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {homeFilteredRequests.map((request) => {
                    const student = request.student || {};
                    const studentIdentity = getRequestStudentIdentity(request);
                    const homeSchool = request.home_school || request.school || {};
                    const items = request.items || [];
                    const bookCount = items.length || 0;
                    const firstBook = items[0]?.book || booksData[request.book_id] || {};
                    const status = String(request.status || '').toLowerCase();
                    const isOverdue = status === 'borrowed' && request.due_date && new Date(request.due_date) < new Date();
                    const studentIdPic = request.id_picture_url || request.id_photo_url || student.id_picture_url || student.profile_image || student.profile_picture;

                    return (
                      <tr key={request.request_id} className="hover:bg-blue-50/20 transition-colors">
                        {/* Request ID */}
                        <td className="py-1.5 px-2 font-mono font-bold text-blue-600 whitespace-nowrap text-[10px] w-24">
                          {request.request_id}
                        </td>

                        {/* Borrower Student with Clickable Physical School ID Picture */}
                        <td className="py-1.5 px-2 min-w-[150px] max-w-[190px]">
                          <div className="flex items-center gap-1.5">
                            {/* Rectangular School ID Card Preview */}
                            <div 
                              onClick={() => setZoomIdModal({
                                isOpen: true,
                                imageUrl: studentIdPic,
                                studentName: studentIdentity.name,
                                studentNumber: student.student_number || request.student_id || 'N/A',
                                schoolName: homeSchool.school_name || 'Campus'
                              })}
                              className="relative w-10 h-7 rounded-md overflow-hidden cursor-pointer group shrink-0 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-500 transition-all bg-slate-100 flex items-center justify-center"
                              title="Click to zoom physical School ID card"
                            >
                              {studentIdPic ? (
                                <img
                                  src={getBackendAssetUrl(studentIdPic)}
                                  alt={`${studentIdentity.name}'s School ID`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[8px] flex flex-col items-center justify-center ${studentIdPic ? 'hidden' : 'flex'}`}>
                                <span>ID</span>
                              </div>
                              <div className="absolute top-0.5 left-0.5 bg-slate-900/80 text-white text-[7px] font-black px-0.5 rounded-xs leading-tight tracking-tighter backdrop-blur-xs pointer-events-none">
                                ID
                              </div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <FiMaximize2 className="w-2 h-2" />
                              </div>
                            </div>

                            <div className="min-w-0 max-w-[115px]">
                              <div className="font-bold text-slate-900 truncate text-[11px]" title={studentIdentity.name}>
                                {studentIdentity.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {student.student_number || request.student_id || 'No ID'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Campus */}
                        <td className="py-1.5 px-2 text-slate-600 min-w-[120px] max-w-[160px]">
                          <div className="w-full max-w-[145px] min-w-0 overflow-hidden">
                            <div className="truncate text-[10px] font-medium text-slate-700" title={homeSchool.school_name || 'Campus Library'}>
                              {homeSchool.school_name || 'Campus Library'}
                            </div>
                          </div>
                        </td>

                        {/* Book Details */}
                        <td className="py-1.5 px-2 text-slate-700 min-w-[140px] max-w-[190px]">
                          <div className="w-full max-w-[175px] min-w-0 overflow-hidden">
                            <div className="font-bold text-slate-900 truncate text-[11px]" title={firstBook.title || 'Book Title'}>
                              {firstBook.title || (bookCount > 0 ? `${bookCount} Book(s)` : 'General Request')}
                            </div>
                            {firstBook.author && (
                              <div className="text-[10px] text-slate-500 truncate" title={firstBook.author}>
                                {firstBook.author}
                              </div>
                            )}
                            {bookCount > 1 && (
                              <span className="inline-flex items-center text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded mt-0.5">
                                +{bookCount - 1} more book{bookCount > 2 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Purpose / Schedule */}
                        <td className="py-1.5 px-2 text-slate-600 text-[10px] min-w-[95px] max-w-[130px]">
                          <div className="truncate max-w-[115px]" title={request.purpose || 'Academic Reading'}>
                            {request.purpose || 'Academic Reading'}
                          </div>
                          {status === 'borrowed' && request.due_date && (
                            <div className={`text-[9px] font-bold mt-0.5 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                              Due: {formatPhilippineDate(request.due_date)} {isOverdue && '(Overdue)'}
                            </div>
                          )}
                        </td>

                        {/* Requested Date */}
                        <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap min-w-[95px] text-[10px]" title={formatDateTimeWithRelative(request.created_at)}>
                          {formatPhilippineDate(request.created_at)}
                        </td>

                        {/* Status */}
                        <td className="py-1.5 px-2 whitespace-nowrap min-w-[80px]">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold capitalize ${getStatusColor(request.status)}`}>
                            {request.status === 'borrowed' ? 'Borrowed' : request.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap w-16">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => handleViewDetails(request)}
                              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors shadow-2xs"
                              title="View Request Details"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>

                            {/* Status === pending: Approve & Reject */}
                            {status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveClick(request.request_id)}
                                  className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95"
                                  title="Approve Request"
                                >
                                  <FiCheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectClick(request.request_id)}
                                  className="p-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
                                  title="Decline Request"
                                >
                                  <FiXCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Status === approved / ready_for_pickup: Direct Release */}
                            {(status === 'approved' || status === 'ready_for_pickup') && (
                              <button
                                type="button"
                                onClick={() => handleOpenReleaseModal(request)}
                                className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95"
                                title="Release book directly to student"
                              >
                                <FiPackage className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Status === borrowed: Return / Check-In */}
                            {status === 'borrowed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const matchedBorrow = activeBorrows.find(b => 
                                    b.student_id === request.student_id &&
                                    (items.some(it => it.copy_id === b.copy_id || it.assigned_copy_id === b.copy_id || it.book_id === b.book_id))
                                  ) || activeBorrows.find(b => b.student_id === request.student_id);

                                  if (matchedBorrow) {
                                    const book = booksData[matchedBorrow.book_id] || matchedBorrow.book_copies?.books || items[0]?.book || {};
                                    const stud = studentsData[matchedBorrow.student_id] || matchedBorrow.student || request.student || {};
                                    handleOpenReturnModal(matchedBorrow, book, stud);
                                  } else {
                                    const firstItem = items[0];
                                    const fallbackBorrow = {
                                      borrow_id: request.borrow_id || request.request_id,
                                      due_date: request.due_date,
                                      copy_id: firstItem?.copy_id || firstItem?.assigned_copy_id,
                                      student_id: request.student_id,
                                      item_id: firstItem?.item_id,
                                    };
                                    const book = firstItem?.book || booksData[firstItem?.book_id] || {};
                                    const stud = request.student || {};
                                    handleOpenReturnModal(fallbackBorrow, book, stud);
                                  }
                                }}
                                className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-95"
                                title="Check-in return of borrowed book"
                              >
                                <FiCheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-1.5 px-2">Request & Pass</th>
                    <th className="py-1.5 px-2">Borrower</th>
                    <th className="py-1.5 px-2">Reserved Book(s)</th>
                    <th className="py-1.5 px-2">Approved At</th>
                    <th className="py-1.5 px-2">Pickup Deadline ({pickupHoldDays} Days)</th>
                    <th className="py-1.5 px-2 text-right">Actions</th>
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

      {/* Inter-School Requests Table (Upgraded Responsive Table with Date Filter & School ID Card) */}
      {activeRequestTab === 'inter-school' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Header with Title and Search/Date Filter/Refresh */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FiGlobe className="w-4 h-4 text-blue-600" />
                  <span>Inter-School Borrow Requests</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {interSchoolFilteredRequests.length} {interSchoolFilteredRequests.length === 1 ? 'record' : 'records'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cross-library borrow requests from partner campuses requiring home approval or pickup authorization
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => fetchInterSchoolRequests()}
                  disabled={interSchoolRequestsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                  title="Refresh inter-school queue"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 text-blue-600 ${interSchoolRequestsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Instant Search & Date Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by student, ID, partner campus, book..."
                  value={interSchoolSearch}
                  onChange={(e) => setInterSchoolSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 bg-white shadow-2xs transition"
                />
                {interSchoolSearch && (
                  <button
                    type="button"
                    onClick={() => setInterSchoolSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter Presets */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3 text-slate-400" /> Date:
                  </span>
                  <button
                    type="button"
                    onClick={() => setInterSchoolDatePreset('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      interSchoolDatePreset === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterSchoolDatePreset('today')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      interSchoolDatePreset === 'today'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterSchoolDatePreset('this_week')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      interSchoolDatePreset === 'this_week'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterSchoolDatePreset('this_month')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      interSchoolDatePreset === 'this_month'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterSchoolDatePreset('custom')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      interSchoolDatePreset === 'custom'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {interSchoolDatePreset === 'custom' && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
                    <input
                      type="date"
                      value={interSchoolDateStart}
                      onChange={(e) => setInterSchoolDateStart(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 outline-none font-medium"
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                      type="date"
                      value={interSchoolDateEnd}
                      onChange={(e) => setInterSchoolDateEnd(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 outline-none font-medium"
                    />
                    {(interSchoolDateStart || interSchoolDateEnd) && (
                      <button
                        type="button"
                        onClick={() => {
                          setInterSchoolDateStart('');
                          setInterSchoolDateEnd('');
                        }}
                        className="text-slate-400 hover:text-slate-600 ml-0.5"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {interSchoolRequestsLoading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Fetching inter-school requests...</p>
            </div>
          ) : interSchoolFilteredRequests.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <FiGlobe className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {interSchoolSearch || interSchoolDatePreset !== 'all' ? 'No Matching Records Found' : 'No Inter-School Requests'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {interSchoolSearch || interSchoolDatePreset !== 'all'
                  ? 'No inter-school requests match your search query or date filter. Reset filters to see all requests.'
                  : 'There are no cross-library inter-school borrow requests in the queue.'}
              </p>
              {(interSchoolSearch || interSchoolDatePreset !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setInterSchoolSearch('');
                    setInterSchoolDatePreset('all');
                    setInterSchoolDateStart('');
                    setInterSchoolDateEnd('');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                >
                  Reset Date & Filters
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-auto text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-1.5 px-2 whitespace-nowrap w-24">Request ID</th>
                    <th className="py-1.5 px-2 min-w-[150px] max-w-[190px]">Borrower</th>
                    <th className="py-1.5 px-2 min-w-[120px] max-w-[160px]">Home Campus</th>
                    <th className="py-1.5 px-2 min-w-[140px] max-w-[190px]">Book Details</th>
                    <th className="py-1.5 px-2 min-w-[95px] max-w-[130px]">Purpose</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[95px]">Requested</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[80px]">Status</th>
                    <th className="py-1.5 px-2 text-right whitespace-nowrap w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {interSchoolFilteredRequests.map((request) => {
                    const parentReq = request.borrow_request || request;
                    const student = parentReq.student || request.student || {};
                    const studentIdentity = getRequestStudentIdentity(parentReq);
                    const homeSchool = parentReq.home_school || request.home_school || {};
                    const items = parentReq.items || request.items || [];
                    const bookCount = items.length || (request.book ? 1 : 0);
                    const firstBook = request.book || items[0]?.book || booksData[request.book_id] || {};
                    const requestId = parentReq.request_id || request.request_id;
                    const itemStatus = String(request.status || request.item_status || parentReq.status || 'pending').toLowerCase();
                    const studentIdPic = parentReq.id_picture_url || parentReq.id_photo_url || request.id_picture_url || student.id_picture_url || student.profile_image || student.profile_picture;
                    const purpose = parentReq.purpose || request.purpose || 'Inter-library Study';
                    const requestedAt = parentReq.created_at || request.created_at;

                    return (
                      <tr key={request.item_id || requestId} className="hover:bg-blue-50/20 transition-colors">
                        {/* Request ID */}
                        <td className="py-1.5 px-2 font-mono font-bold text-blue-600 whitespace-nowrap text-[10px] w-24">
                          {requestId}
                        </td>

                        {/* Borrower Student with Clickable Physical School ID Picture */}
                        <td className="py-1.5 px-2 min-w-[150px] max-w-[190px]">
                          <div className="flex items-center gap-1.5">
                            {/* Rectangular School ID Card Preview */}
                            <div 
                              onClick={() => setZoomIdModal({
                                isOpen: true,
                                imageUrl: studentIdPic,
                                studentName: studentIdentity.name,
                                studentNumber: student.student_number || parentReq.student_id || 'N/A',
                                schoolName: homeSchool.school_name || 'Partner Campus'
                              })}
                              className="relative w-10 h-7 rounded-md overflow-hidden cursor-pointer group shrink-0 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-500 transition-all bg-slate-100 flex items-center justify-center"
                              title="Click to zoom physical School ID card"
                            >
                              {studentIdPic ? (
                                <img
                                  src={getBackendAssetUrl(studentIdPic)}
                                  alt={`${studentIdentity.name}'s School ID`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-[8px] flex flex-col items-center justify-center ${studentIdPic ? 'hidden' : 'flex'}`}>
                                <span>ID</span>
                              </div>
                              <div className="absolute top-0.5 left-0.5 bg-slate-900/80 text-white text-[7px] font-black px-0.5 rounded-xs leading-tight tracking-tighter backdrop-blur-xs pointer-events-none">
                                ID
                              </div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <FiMaximize2 className="w-2 h-2" />
                              </div>
                            </div>

                            <div className="min-w-0 max-w-[115px]">
                              <div className="font-bold text-slate-900 truncate text-[11px]" title={studentIdentity.name}>
                                {studentIdentity.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {student.student_number || parentReq.student_id || 'No ID'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Home Campus */}
                        <td className="py-1.5 px-2 text-slate-600 min-w-[120px] max-w-[160px]">
                          <div className="w-full max-w-[145px] min-w-0 overflow-hidden">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] max-w-full truncate" title={homeSchool.school_name || 'Partner Campus'}>
                              <FiMapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{homeSchool.school_name || 'Partner Campus'}</span>
                            </span>
                          </div>
                        </td>

                        {/* Book Details */}
                        <td className="py-1.5 px-2 text-slate-700 min-w-[140px] max-w-[190px]">
                          <div className="w-full max-w-[175px] min-w-0 overflow-hidden">
                            <div className="font-bold text-slate-900 truncate text-[11px]" title={firstBook.title || 'Book Title'}>
                              {firstBook.title || (bookCount > 0 ? `${bookCount} Book(s)` : 'General Request')}
                            </div>
                            {firstBook.author && (
                              <div className="text-[10px] text-slate-500 truncate" title={firstBook.author}>
                                {firstBook.author}
                              </div>
                            )}
                            {bookCount > 1 && (
                              <span className="inline-flex items-center text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded mt-0.5">
                                +{bookCount - 1} more book{bookCount > 2 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="py-1.5 px-2 text-slate-600 text-[10px] min-w-[95px] max-w-[130px]">
                          <div className="truncate max-w-[115px]" title={purpose}>
                            {purpose}
                          </div>
                        </td>

                        {/* Requested At */}
                        <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap min-w-[95px] text-[10px]">
                          <div title={formatDateTimeWithRelative(requestedAt)} className="cursor-default">
                            <div className="font-mono text-slate-700 text-[11px]">
                              {formatPhilippineDate(requestedAt)}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-1.5 px-2 whitespace-nowrap min-w-[80px]">
                          <StatusBadge status={itemStatus} />
                        </td>

                        {/* Actions */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap w-16">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Full Details Button */}
                            <button
                              type="button"
                              onClick={() => handleViewDetails(parentReq)}
                              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-2xs"
                              title="View Full Request Details"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>

                            {/* Status === pending: Approve / Decline */}
                            {itemStatus === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveClick(requestId)}
                                  className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95"
                                  title="Approve Inter-School Request"
                                >
                                  <FiCheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectClick(requestId)}
                                  className="p-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
                                  title="Decline Request"
                                >
                                  <FiXCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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
                    <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Request ID</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Student</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Reserved Books</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Reason</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationRequests.map((request) => {
                    const student = request.student || request.borrow_request?.student || {};
                    const studentIdentity = getRequestStudentIdentity(request);
                    const bookItems = request.items || request.borrow_request?.items || [];
                    const reason = request.cancellation_reason || 'No reason provided';
                    const isProcessing = cancellationProcessing && cancellationRequestToProcess?.request_id === request.request_id;

                    return (
                      <tr key={request.request_id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors text-[11px]">
                        <td className="py-1.5 px-2 font-mono font-medium text-slate-900 text-[10px]">
                          <div>{request.request_id}</div>
                          {request.isInterSchool && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                              Inter-School
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            {studentIdentity.profilePicture ? (
                              <img
                                src={getBackendAssetUrl(studentIdentity.profilePicture)}
                                alt={studentIdentity.name}
                                className="w-7 h-7 rounded-lg object-cover border border-slate-200/80 shadow-2xs shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 shadow-2xs border border-white/20 ${studentIdentity.profilePicture ? 'hidden' : 'flex'}`}>
                              {(studentIdentity.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate text-[11px]">
                                {studentIdentity.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{student.student_number || student.student_id || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-slate-700">
                          <div className="space-y-0.5 max-w-[160px]">
                            {bookItems.map((itm, i) => (
                              <div key={i} className="flex items-center gap-1 text-[10px] text-slate-800 truncate">
                                <FiBook className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate font-medium">{itm.book?.title || itm.title || `Book ID: ${itm.book_id}`}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="rounded-md bg-amber-50 border border-amber-200/80 px-2 py-1 max-w-[180px]">
                            <p className="text-[10px] font-semibold text-amber-900 leading-snug">{reason}</p>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-[10px] text-slate-600 whitespace-nowrap font-medium">
                          {formatDateTimeWithRelative(request.created_at)}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetails(request)}
                              className="p-1 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
                              title="View Details"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setCancellationRequestToProcess(request);
                                setShowConfirmCancelModal(true);
                              }}
                              disabled={isProcessing}
                              className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition active:scale-95 shadow-sm disabled:opacity-50"
                              title="Confirm cancellation and release copy back to catalog"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setCancellationRequestToProcess(request);
                                setDeclineRemarks('');
                                setShowDeclineCancelModal(true);
                              }}
                              disabled={isProcessing}
                              className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-rose-600 transition active:scale-95 disabled:opacity-50"
                              title="Decline cancellation and maintain reservation"
                            >
                              <FiXCircle className="w-3.5 h-3.5" />
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
                    {(() => {
                      const studentIdentity = getRequestStudentIdentity(selectedRequest);
                      return (
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                          {studentIdentity.profilePicture ? (
                            <img
                              src={getBackendAssetUrl(studentIdentity.profilePicture)}
                              alt={studentIdentity.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0 ${studentIdentity.profilePicture ? 'hidden' : 'flex'}`}>
                            {(selectedRequest.student?.firstname?.[0] || selectedRequest.first_name?.[0] || 'S')}
                            {(selectedRequest.student?.lastname?.[0] || selectedRequest.last_name?.[0] || '')}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate">
                              {studentIdentity.name}
                            </h3>
                            <p className="text-xs font-mono text-slate-500">
                              ID: {selectedRequest.student_id || selectedRequest.student?.student_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

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

              {/* Target Student Identity with Profile Picture */}
              {(() => {
                const targetReq = borrowRequests.find(r => r.request_id === requestToProcess) || interSchoolRequests.find(r => (r.borrow_request?.request_id || r.request_id) === requestToProcess);
                if (!targetReq) return null;
                const ident = getRequestStudentIdentity(targetReq);
                return (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
                    {ident.profilePicture ? (
                      <img
                        src={getBackendAssetUrl(ident.profilePicture)}
                        alt={ident.name}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${ident.profilePicture ? 'hidden' : 'flex'}`}>
                      {(ident.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{ident.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500 truncate">ID: {targetReq.student?.student_number || targetReq.student_id || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{targetReq.student?.department || targetReq.student?.college || 'Student Borrower'}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Context message */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
                <p className="text-sm text-emerald-900 leading-relaxed">
                  You are about to <span className="font-bold">approve</span> this borrow request. The student will be notified and allowed to proceed with picking up the requested books from the library.
                </p>
              </div>

              {/* Pickup Hold Window Info */}
              {(() => {
                const holdDeadline = new Date();
                holdDeadline.setDate(holdDeadline.getDate() + (pickupHoldDays || 3));
                return (
                  <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-3.5 mb-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-emerald-950 font-bold">
                      <span className="flex items-center gap-1.5">
                        <FiPackage className="w-4 h-4 text-emerald-700" />
                        Pickup Hold Window:
                      </span>
                      <span className="font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                        {pickupHoldDays} Calendar Days
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Student will have until <strong>{formatPhilippineDate(holdDeadline)}</strong> to claim their books at the circulation counter before hold auto-expires.
                    </p>
                  </div>
                );
              })()}

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
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
                <p className="text-sm text-rose-900 leading-relaxed">
                  You are about to <span className="font-bold">decline</span> this request. The student will be notified and may need to resubmit a new borrow request.
                </p>
              </div>

              {/* Quick-select standard reason chips */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick-select common reason:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "All physical copies currently loaned out",
                    "Copy undergoing repair / binding maintenance",
                    "Student has overdue loans or unsettled fines",
                    "Student ID credentials unverified or unclear",
                    "Reserved for institutional or faculty reference"
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setDeclineReason(chip)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all ${
                        declineReason === chip
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason textarea — required */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Reason for Declining <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value.slice(0, 300))}
                  placeholder="Select a reason chip above or type custom reason..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-sm text-slate-800 placeholder:text-slate-400 px-3.5 py-2.5 resize-none transition-all duration-150"
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

      {/* ══════════════════════════════════════════════════════════
           CIRCULATION DESK RETURN INSPECTION MODAL
          ══════════════════════════════════════════════════════════ */}
      {showReturnInspectionModal && loanToInspect && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ animation: 'fadeInOverlay 0.2s ease-out' }}
          onClick={() => { if (!returnInspectionProcessing) setShowReturnInspectionModal(false); }}
        >
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />

          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            style={{ animation: 'slideUpScale 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-cyan-500" />

            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Return & Catalog Check-in</h3>
                  <p className="text-[11px] text-slate-500">Inspect condition, review fines, and restock copy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnInspectionModal(false)}
                disabled={returnInspectionProcessing}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Book & Borrower Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {loanToInspect.book?.title || 'Book Title'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {loanToInspect.book?.author ? `by ${loanToInspect.book.author}` : 'Unknown Author'}
                    </p>
                  </div>
                  {loanToInspect.book_copies?.accession_number && (
                    <span className="font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold shrink-0">
                      Acc: {loanToInspect.book_copies.accession_number}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Borrower</span>
                    <span className="font-semibold text-slate-800">
                      {loanToInspect.student?.firstname ? `${loanToInspect.student.firstname} ${loanToInspect.student.lastname}` : 'Student'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Due Date</span>
                    <span className={`font-bold ${loanToInspect.dueStatus?.textClass}`}>
                      {formatPhilippineDate(loanToInspect.due_date)} ({loanToInspect.dueStatus?.label})
                    </span>
                  </div>
                </div>
              </div>

              {/* Due Status & Overdue Fine Section */}
              {loanToInspect.dueStatus?.isOverdue ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <FiAlertTriangle className="w-4 h-4 text-rose-600" />
                      Overdue by {loanToInspect.dueStatus.daysOverdue} calendar day{loanToInspect.dueStatus.daysOverdue !== 1 ? 's' : ''}
                    </span>
                    <span className="font-mono text-rose-700 text-sm">
                      ₱{(loanToInspect.dueStatus.daysOverdue * 5).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Standard rate: ₱5.00/day. You may adjust or waive the fine below for excused clearance:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs font-bold text-rose-900">Assessed Fine (₱):</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={manualFineAmount}
                      onChange={(e) => setManualFineAmount(e.target.value)}
                      className="w-24 rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    {parseFloat(manualFineAmount) === 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Waived
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs flex items-center justify-between text-emerald-800 font-semibold">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Returned On Time (No Overdue Fines)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">₱0.00</span>
                </div>
              )}

              {/* Physical Condition Checklist */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                          className="w-20 rounded-lg border border-rose-300 bg-white px-2 py-0.5 text-xs font-bold text-rose-900 focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-rose-700">
                      Covers torn pages, liquid spills, or binding repairs.
                    </p>
                  </div>
                )}
              </div>

              {/* Total Fee & Counter Settlement */}
              {(parseFloat(manualFineAmount) > 0 || parseFloat(damageFee) > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-extrabold text-sm">
                    <span>Total Fees Assessed:</span>
                    <span className="font-mono text-blue-700 text-base">
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
                    <span>Settled and paid by student at circulation desk</span>
                  </label>
                </div>
              )}

              {/* Inspection Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Inspection Remarks <span className="text-slate-400 font-normal">(Optional)</span>:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pages intact, barcode scanned, condition verified..."
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReturnInspectionModal(false)}
                disabled={returnInspectionProcessing}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnInspection}
                disabled={returnInspectionProcessing}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {returnInspectionProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Checking In...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Complete Return & Restock</span>
                  </>
                )}
              </button>
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
                        const studentAvatar = student.profile_image || student.profile_picture || student.avatar || student.avatar_url || studentsData[borrow.student_id]?.profile_image || studentsData[borrow.student_id]?.profile_picture;
                        const schoolName = book.schools?.school_name || schoolsMap[book.school_id]?.school_name || '';
                        const dueStatus = getDueStatusDetails(borrow.due_date);
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
                                {formatTimeWithRelative(borrow.borrow_date)}
                              </p>
                            </td>

                            {/* Due Date Column */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <FiClock className={`w-3 h-3 ${dueStatus.textClass}`} />
                                  <span className={`text-xs font-bold ${dueStatus.textClass}`}>
                                    {formatPhilippineDate(borrow.due_date)}
                                  </span>
                                </div>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${dueStatus.badgeClass}`}>
                                  {dueStatus.label}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-2.5 py-2.5 whitespace-nowrap">
                              <StatusBadge status={dueStatus.status === 'due_today' ? 'due soon' : dueStatus.status} />
                            </td>

                            {/* Action */}
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSendStudentReminder(borrow, book, student)}
                                  disabled={sendingReminderId === borrow.borrow_id}
                                  className={`text-[11px] px-2.5 py-1 font-bold rounded-lg border transition-all active:scale-95 flex items-center gap-1 shadow-2xs ${
                                    dueStatus.isOverdue
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : dueStatus.isDueSoon
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title="Send instant due date reminder to student notification inbox"
                                >
                                  {sendingReminderId === borrow.borrow_id ? (
                                    <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <FiBell className="w-3 h-3 text-amber-600" />
                                  )}
                                  <span>{dueStatus.isOverdue ? 'Notify Overdue' : dueStatus.isDueToday ? 'Remind Due Today' : 'Remind Due'}</span>
                                </button>

                                <Button
                                  size="sm"
                                  onClick={() => handleOpenReturnModal(borrow, book, student)}
                                  disabled={returnInspectionProcessing}
                                  className="text-xs px-2.5 py-1 font-bold shadow-xs hover:shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                >
                                  <FiCheckCircle className="w-3.5 h-3.5 mr-1" />
                                  <span>Return</span>
                                </Button>
                              </div>
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

      {/* ══════════════════════════════════════════════════════════════
           CIRCULATION HISTORY QUEUE (RETURNED & COMPLETED LOANS)
          ══════════════════════════════════════════════════════════════ */}
      {activeRequestTab === 'history' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Header with Title, Search, Date Filter, and Type Filter */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-purple-600" />
                  <span>Circulation History & Completed Records</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {circulationHistoryRecords.length} {circulationHistoryRecords.length === 1 ? 'record' : 'records'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete archive of returned books, inspected check-ins, and cancelled borrow transactions with timestamps
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    fetchBorrowRequests();
                    fetchInterSchoolRequests();
                    fetchActiveBorrows();
                  }}
                  disabled={borrowRequestsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                  title="Refresh history records"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 text-purple-600 ${borrowRequestsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Controls Bar: Type Filter, Search, and Date Presets */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
              {/* Left: Type Toggle & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
                {/* Type Filter Pills */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      historyTypeFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('returned')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      historyTypeFilter === 'returned'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FiCheckCircle className="w-3 h-3" />
                    <span>Returned</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('cancelled')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      historyTypeFilter === 'cancelled'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FiXCircle className="w-3 h-3" />
                    <span>Cancelled</span>
                  </button>
                </div>

                {/* Instant Search Bar */}
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search history by student, ID, book title..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 bg-white shadow-2xs transition"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Clear search"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Date Filter Presets */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3 text-slate-400" /> Date:
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryDatePreset('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyDatePreset === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDatePreset('today')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyDatePreset === 'today'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDatePreset('this_week')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyDatePreset === 'this_week'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDatePreset('this_month')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyDatePreset === 'this_month'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDatePreset('custom')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyDatePreset === 'custom'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {historyDatePreset === 'custom' && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
                    <input
                      type="date"
                      value={historyDateStart}
                      onChange={(e) => setHistoryDateStart(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 outline-none font-medium"
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                      type="date"
                      value={historyDateEnd}
                      onChange={(e) => setHistoryDateEnd(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 outline-none font-medium"
                    />
                    {(historyDateStart || historyDateEnd) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryDateStart('');
                          setHistoryDateEnd('');
                        }}
                        className="text-slate-400 hover:text-slate-600 ml-0.5"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {borrowRequestsLoading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Fetching history records...</p>
            </div>
          ) : circulationHistoryRecords.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto mb-3 text-purple-600">
                <FiClock className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {historySearch || historyDatePreset !== 'all' || historyTypeFilter !== 'all' ? 'No Matching Records Found' : 'No History Records Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {historySearch || historyDatePreset !== 'all' || historyTypeFilter !== 'all'
                  ? 'No circulation records match your search or date filter. Reset filters to see all completed transactions.'
                  : 'Returned books and cancelled requests will be recorded here automatically.'}
              </p>
              {(historySearch || historyDatePreset !== 'all' || historyTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDatePreset('all');
                    setHistoryDateStart('');
                    setHistoryDateEnd('');
                    setHistoryTypeFilter('all');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                >
                  Reset Date & Filters
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-auto text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-1.5 px-2 whitespace-nowrap w-24">Record ID</th>
                    <th className="py-1.5 px-2 min-w-[150px] max-w-[190px]">Borrower</th>
                    <th className="py-1.5 px-2 min-w-[140px] max-w-[190px]">Book Details</th>
                    <th className="py-1.5 px-2 min-w-[130px] max-w-[165px]">Campus Origin</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[110px]">Completed Date</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[100px]">Condition / Fines</th>
                    <th className="py-1.5 px-2 whitespace-nowrap min-w-[80px]">Status</th>
                    <th className="py-1.5 px-2 text-right whitespace-nowrap w-14">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {circulationHistoryRecords.map((record) => {
                    const student = record.student || {};
                    const studentIdentity = getRequestStudentIdentity(record);
                    const homeSchool = record.home_school || record.school || {};
                    const items = record.items || [];
                    const bookCount = items.length || 0;
                    const firstBook = items[0]?.book || booksData[record.book_id] || {};
                    const status = String(record.status || '').toLowerCase();
                    const studentIdPic = record.id_picture_url || record.id_photo_url || student.id_picture_url || student.profile_image || student.profile_picture;
                    const completedDate = record.return_date || record.updated_at || record.created_at;
                    const hasFine = Number(record.fine_amount || record.damage_fee || 0) > 0;
                    const fineAmount = record.fine_amount || record.damage_fee || '0';

                    return (
                      <tr key={`${record.request_id || record.borrow_id}-${record._queueSource}`} className="hover:bg-purple-50/20 transition-colors text-[11px]">
                        {/* Record ID */}
                        <td className="py-1.5 px-2 font-mono font-bold text-purple-700 whitespace-nowrap text-[10px] w-24">
                          {record.request_id || record.borrow_id}
                        </td>

                        {/* Borrower Student with Clickable Physical School ID Picture */}
                        <td className="py-1.5 px-2 min-w-[150px] max-w-[190px]">
                          <div className="flex items-center gap-1.5">
                            {/* Rectangular School ID Card Preview */}
                            <div 
                              onClick={() => setZoomIdModal({
                                isOpen: true,
                                imageUrl: studentIdPic,
                                studentName: studentIdentity.name,
                                studentNumber: student.student_number || record.student_id || 'N/A',
                                schoolName: homeSchool.school_name || 'Campus'
                              })}
                              className="relative w-10 h-7 rounded-md overflow-hidden cursor-pointer group shrink-0 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-500 transition-all bg-slate-100 flex items-center justify-center"
                              title="Click to zoom physical School ID card"
                            >
                              {studentIdPic ? (
                                <img
                                  src={getBackendAssetUrl(studentIdPic)}
                                  alt={`${studentIdentity.name}'s School ID`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-[8px] flex flex-col items-center justify-center ${studentIdPic ? 'hidden' : 'flex'}`}>
                                <span>ID</span>
                              </div>
                              <div className="absolute top-0.5 left-0.5 bg-slate-900/80 text-white text-[7px] font-black px-0.5 rounded-xs leading-tight tracking-tighter backdrop-blur-xs pointer-events-none">
                                ID
                              </div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <FiMaximize2 className="w-2 h-2" />
                              </div>
                            </div>

                            <div className="min-w-0 max-w-[115px]">
                              <div className="font-bold text-slate-900 truncate text-[11px]" title={studentIdentity.name}>
                                {studentIdentity.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {student.student_number || record.student_id || 'No ID'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Book Details */}
                        <td className="py-1.5 px-2 text-slate-700 min-w-[140px] max-w-[190px]">
                          <div className="w-full max-w-[175px] min-w-0 overflow-hidden">
                            <div className="font-bold text-slate-900 truncate text-[11px]" title={firstBook.title || 'Book Title'}>
                              {firstBook.title || (bookCount > 0 ? `${bookCount} Book(s)` : 'General Request')}
                            </div>
                            {firstBook.author && (
                              <div className="text-[10px] text-slate-500 truncate" title={firstBook.author}>
                                {firstBook.author}
                              </div>
                            )}
                            {bookCount > 1 && (
                              <span className="inline-flex items-center text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded mt-0.5">
                                +{bookCount - 1} more book{bookCount > 2 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Campus Origin - Truncated cleanly to prevent any overlap */}
                        <td className="py-1.5 px-2 text-slate-600 min-w-[130px] max-w-[165px]">
                          <div className="w-full max-w-[150px] min-w-0 overflow-hidden">
                            <div className="truncate text-[11px] font-semibold text-slate-800" title={homeSchool.school_name || 'Campus'}>
                              {homeSchool.school_name || 'Campus Library'}
                            </div>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                              record._queueSource === 'inter-school' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {record._queueSource === 'inter-school' ? 'Inter-School' : 'Local Home'}
                            </span>
                          </div>
                        </td>

                        {/* Completed Date */}
                        <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap min-w-[110px] text-[10px]">
                          <div title={formatDateTimeWithRelative(completedDate)} className="cursor-default">
                            <div className="font-mono text-slate-800 text-[11px] font-semibold">
                              {formatPhilippineDate(completedDate)}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium">
                              {formatTimeWithRelative(completedDate)}
                            </div>
                          </div>
                        </td>

                        {/* Condition / Fines */}
                        <td className="py-1.5 px-2 whitespace-nowrap min-w-[100px]">
                          <div className="space-y-0.5">
                            {hasFine ? (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                                <span>₱{Number(fineAmount).toFixed(2)}</span>
                                <span className="text-[9px] font-normal text-rose-600">fine</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <FiCheck className="w-3 h-3" /> No Fines
                              </span>
                            )}
                            {record.return_condition && (
                              <div className="text-[9px] text-slate-500 capitalize truncate max-w-[95px]">
                                Condition: <span className="font-semibold text-slate-700">{record.return_condition}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <StatusBadge status={status} />
                        </td>

                        {/* Actions */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap w-14">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(record)}
                            className="p-1 rounded-md border border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all shadow-2xs"
                            title="View Full Historical Record"
                          >
                            <FiEye className="w-3.5 h-3.5" />
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
                              const studentAvatar = student.profile_image || student.profile_picture || student.avatar || student.avatar_url || studentsData[borrow.student_id]?.profile_image || studentsData[borrow.student_id]?.profile_picture;
                              const schoolName = book.schools?.school_name || schoolsMap[book.school_id]?.school_name || '';
                              const dueStatus = getDueStatusDetails(borrow.due_date);
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
                                          {formatTimeWithRelative(borrow.borrow_date)}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Due Date & Timeline */}
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <FiClock className={`w-3.5 h-3.5 ${dueStatus.textClass}`} />
                                        <span className={`text-xs font-black ${dueStatus.textClass}`}>
                                          {formatPhilippineDate(borrow.due_date)}
                                        </span>
                                      </div>
                                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${dueStatus.badgeClass}`}>
                                        <span>{dueStatus.label}</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="px-3 py-4 whitespace-nowrap">
                                    <StatusBadge status={dueStatus.status === 'due_today' ? 'due soon' : dueStatus.status} />
                                  </td>

                                  {/* Action */}
                                  <td className="px-5 py-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSendStudentReminder(borrow, book, student)}
                                        disabled={sendingReminderId === borrow.borrow_id}
                                        className={`text-xs px-3 py-1.5 font-bold rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 shadow-xs ${
                                          dueStatus.isOverdue
                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                            : dueStatus.isDueSoon
                                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                        title="Send instant due date reminder to student notification inbox"
                                      >
                                        {sendingReminderId === borrow.borrow_id ? (
                                          <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <FiBell className="w-3.5 h-3.5 text-amber-600" />
                                        )}
                                        <span>{dueStatus.isOverdue ? 'Notify Overdue' : dueStatus.isDueToday ? 'Remind Due Today' : 'Remind Due'}</span>
                                      </button>

                                      <Button
                                        size="sm"
                                        onClick={() => handleOpenReturnModal(borrow, book, student)}
                                        disabled={returnInspectionProcessing}
                                        className="font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                      >
                                        <FiCheckCircle className="w-4 h-4 mr-1.5" />
                                        Return / Check-In
                                      </Button>
                                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredLoans.map((borrow) => {
                      const book = booksData[borrow.book_id] || borrow.book_copies?.books || {};
                      const student = studentsData[borrow.student_id] || borrow.student || {};
                      const bookCover = book.cover_image || booksData[borrow.book_id]?.cover_image || borrow.book_copies?.books?.cover_image;
                      const studentAvatar = student.profile_image || student.profile_picture || student.avatar || student.avatar_url || studentsData[borrow.student_id]?.profile_image || studentsData[borrow.student_id]?.profile_picture;
                      const schoolName = book.schools?.school_name || schoolsMap[book.school_id]?.school_name || '';
                      const dueStatus = getDueStatusDetails(borrow.due_date);
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
                              <p className="font-mono text-[11px] text-slate-500 truncate">
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
                              <span className={`font-black ${dueStatus.textClass}`}>
                                {formatPhilippineDate(borrow.due_date)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${dueStatus.badgeClass}`}>
                                {dueStatus.label}
                              </span>
                              <StatusBadge status={dueStatus.status === 'due_today' ? 'due soon' : dueStatus.status} />
                            </div>
                          </div>

                          {/* Return Button */}
                          <Button
                            size="md"
                            onClick={() => handleOpenReturnModal(borrow, book, student)}
                            disabled={returnInspectionProcessing}
                            className="w-full font-bold shadow-xs hover:shadow-md transition-all active:scale-98"
                          >
                            <FiCheckCircle className="w-4 h-4 mr-1.5" />
                            Return / Check-In
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

      {/* Institutional School ID Zoom Lightbox Modal */}
      {zoomIdModal.isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomIdModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <FiMaximize2 className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-white">{zoomIdModal.studentName || 'Student ID Card'}</h4>
                  <p className="text-[11px] text-slate-300 font-mono">
                    {zoomIdModal.studentNumber} • {zoomIdModal.schoolName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoomIdModal(prev => ({ ...prev, isOpen: false }))}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                title="Close ID preview"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Image */}
            <div className="p-3 bg-slate-900 flex items-center justify-center min-h-[260px] max-h-[65vh] overflow-hidden">
              {zoomIdModal.imageUrl ? (
                <img
                  src={getBackendAssetUrl(zoomIdModal.imageUrl)}
                  alt={`School ID Card for ${zoomIdModal.studentName}`}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-700/50"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`flex-col items-center justify-center text-center p-8 text-slate-400 ${zoomIdModal.imageUrl ? 'hidden' : 'flex'}`}>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-slate-400">
                  <FiUser className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-slate-300">No School ID Image Uploaded</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  This student has not yet uploaded an institutional ID card photo.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Verified Student Identification
              </span>
              <div className="flex items-center gap-2">
                {zoomIdModal.imageUrl && (
                  <a
                    href={getBackendAssetUrl(zoomIdModal.imageUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition"
                  >
                    Open Full Resolution
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setZoomIdModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBorrowRequests;
