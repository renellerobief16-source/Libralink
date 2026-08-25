import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const getBackendAssetUrl = (assetPath) => {
  if (!assetPath) return '';
  if (
    assetPath.startsWith('http://') ||
    assetPath.startsWith('https://') ||
    assetPath.startsWith('data:') ||
    assetPath.startsWith('blob:')
  ) {
    return assetPath;
  }
  if (assetPath.startsWith('/')) return `${API_ORIGIN}${assetPath}`;
  return `${API_ORIGIN}/${assetPath}`;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      return Promise.reject({
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        status: 0,
      });
    } else {
      // Error in request setup
      return Promise.reject({
        message: error.message || 'An error occurred',
        status: 0,
      });
    }
  }
);

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export async function signIn(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });
    
    if (response.success && response.token && response.user) {
      // Store JWT token
      localStorage.setItem('token', response.token);
      
      // Normalize user data to match previous format
      const user = normalizeUser(response.user);
      const normalizedRole = normalizeRoleKey(user.role || user.role_name || '');
      const roleId = user.role_id ?? response.user?.role_id ?? null;
      const schoolId = user.school_id ?? response.user?.school_id ?? null;
      
      // Store in localStorage for compatibility
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('currentUserId', user.user_id);
      localStorage.setItem('roleId', String(roleId ?? ''));
      localStorage.setItem('schoolId', String(schoolId ?? ''));
      localStorage.setItem('userRole', normalizedRole);
      localStorage.setItem('userRoleName', user.role_name || '');
      localStorage.setItem('userCollege', user.school_code || '');
      
      return {
        data: { user },
        error: null,
      };
    }
    
    return { data: null, error: { message: response.message || 'Login failed' } };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signUp(email, password, metadata = {}) {
  try {
    const response = await api.post('/auth/register', {
      email,
      password,
      ...metadata,
    });
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export function clearAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('roleId');
  localStorage.removeItem('schoolId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userRoleName');
  localStorage.removeItem('userCollege');
}

export async function signOut() {
  try {
    clearAuthStorage();
    return { data: null, error: null };
  } catch (error) {
    clearAuthStorage();
    return { data: null, error };
  }
}

export async function getCurrentUser() {
  try {
    const response = await api.get('/auth/me');
    
    if (response.success && response.data) {
      return { data: normalizeUser(response.data), error: null };
    }
    
    return { data: null, error: { message: 'Failed to get user' } };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateProfilePicture(file) {
  try {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    const response = await api.post('/users/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const profilePicture = response?.profile_picture || response?.profile_image || null;
    
    return {
      data: {
        ...(response || {}),
        profile_picture: profilePicture,
        profile_image: profilePicture,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateUserProfile(userId, payload) {
  try {
    const response = await api.put(`/users/${userId}`, payload);
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// BOOK FUNCTIONS
// ============================================

export async function searchBooks(query, userSchoolId = null) {
  try {
    const params = { q: query };
    if (userSchoolId) {
      params.user_school_id = userSchoolId;
    }
    
    const response = await api.get('/books/search', { params });
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getBookById(bookId) {
  try {
    const response = await api.get(`/books/${bookId}`);
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getBooksBySchool(schoolId) {
  try {
    const response = await api.get('/books/school', { params: { school_id: schoolId } });
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

// Legacy function names for compatibility
export async function fetchBooksGnc() {
  return getBooksBySchool(2); // GNC school_id
}

export async function fetchBooksSrc() {
  return getBooksBySchool(1); // SRC school_id
}

// ============================================
// BORROW FUNCTIONS
// ============================================

export async function createBasicBorrow(
  studentId,
  bookId,
  college,
  purpose,
  borrowerDetails = {}
) {
  try {
    const payload = {
      copy_id: bookId,
      remarks: purpose,
    };

    const response = await api.post('/borrow', payload);
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getBorrowRequests(schoolId) {
  try {
    const response = await api.get(`/borrow-requests/school/${schoolId}`);
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function updateBorrowRequestStatus(requestId, status, adminId) {
  try {
    if (status === 'approved') {
      const response = await api.put(`/borrow-requests/${requestId}/approve`);
      return { data: response.data, error: null };
    } else if (status === 'rejected') {
      const response = await api.put(`/borrow-requests/${requestId}/reject`, { remarks: 'Rejected by librarian' });
      return { data: response.data, error: null };
    }
    
    return { data: null, error: { message: 'Invalid status' } };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getActiveBorrows(studentId) {
  try {
    const response = await api.get('/borrow/active');
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getStudentBorrowHistory(studentId) {
  try {
    const response = await api.get('/borrow/history');
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function createActiveBorrow(studentId, bookId, college, requestId, dueDate) {
  // This is now handled by createBorrowRequest
  return createBorrowRequest(studentId, bookId, college, '', {});
}

export async function returnBook(borrowId) {
  try {
    const response = await api.post('/borrow/return', { borrow_id: borrowId });
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllActiveBorrows(schoolId) {
  try {
    const response = await api.get('/borrow/active/school', { params: { school_id: schoolId } });
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

// ============================================
// INTERLIBRARY FUNCTIONS
// ============================================

export async function createInterlibraryRequest(studentId, copyId, toSchoolId, remarks = '') {
  try {
    const response = await api.post('/interlibrary/request', {
      copy_id: copyId,
      to_school_id: toSchoolId,
      remarks,
    });
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPendingInterlibraryRequests() {
  try {
    const response = await api.get('/interlibrary/pending');
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getMyInterlibraryRequests() {
  try {
    const response = await api.get('/interlibrary/my-requests');
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function approveInterlibraryRequest(requestId) {
  try {
    const response = await api.post('/interlibrary/approve', { request_id: requestId });
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function rejectInterlibraryRequest(requestId, remarks = '') {
  try {
    const response = await api.post('/interlibrary/reject', { 
      request_id: requestId,
      remarks,
    });
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// BORROW REQUEST FUNCTIONS (NEW)
// ============================================

export async function createBorrowRequest(requestData) {
  try {
    const response = await api.post('/borrow-requests', requestData);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMyBorrowRequests() {
  try {
    const response = await api.get('/borrow-requests/my-requests');
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getBorrowRequestById(requestId) {
  try {
    const response = await api.get(`/borrow-requests/${requestId}`);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getSchoolBorrowRequests(schoolId, status = null) {
  try {
    const params = {};
    if (status) params.status = status;
    const response = await api.get(`/borrow-requests/school/${schoolId}`, { params });
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getPartnerSchoolBorrowRequests(schoolId, status = null) {
  try {
    const params = {};
    if (status) params.status = status;
    const response = await api.get(`/borrow-requests/partner/${schoolId}`, { params });
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function approveBorrowRequest(requestId) {
  try {
    const response = await api.put(`/borrow-requests/${requestId}/approve`);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function rejectBorrowRequest(requestId, remarks = '') {
  try {
    const response = await api.put(`/borrow-requests/${requestId}/reject`, { remarks });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function generatePermissionLetter(requestId, letterUrl) {
  try {
    const response = await api.post(`/borrow-requests/${requestId}/permission-letter`, { letter_url: letterUrl });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function scanQRToken(qrToken) {
  try {
    const response = await api.post('/borrow-requests/scan', { qr_token: qrToken });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function releaseBookItem(itemId, copyId = null) {
  try {
    const response = await api.put(`/borrow-requests/items/${itemId}/release`, { copy_id: copyId });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function returnBookItem(itemId) {
  try {
    const response = await api.put(`/borrow-requests/items/${itemId}/return`);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function cancelBorrowRequest(requestId) {
  try {
    const response = await api.put(`/borrow-requests/${requestId}/cancel`);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPartnerSchoolsForBook(bookId) {
  try {
    const response = await api.get(`/borrow-requests/partner-schools/${bookId}`);
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

export async function createNotification(userId, type, title, message, relatedId = null) {
  // This is handled server-side
  return { data: null, error: null };
}

export async function createAdminNotification(college, type, title, message, relatedId = null) {
  // This is handled server-side
  return { data: null, error: null };
}

export async function getUserNotifications(userId) {
  try {
    const response = await api.get('/notifications');
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getAdminNotifications(college) {
  try {
    const response = await api.get('/notifications/admin');
    
    return { data: response.data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getUnreadNotificationCount(userId) {
  try {
    const response = await api.get('/notifications/unread-count');
    
    return { count: response.data?.count || 0, error: null };
  } catch (error) {
    return { count: 0, error };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const response = await api.post('/notifications/read', { notification_id: notificationId });
    
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getStudentNotifications(userId) {
  return getUserNotifications(userId);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function normalizeUser(user) {
  if (!user) return null;

  const roleName = String(user.role_name || user.role || '').trim();
  const normalizedRole = normalizeRoleKey(roleName, user.role_id);
  const profilePicture = user.profile_picture || user.profile_image || null;
  const recoveredEmail = user.recovery_email || user.email || '';
  const username = user.username || user.name || user.display_name || user.firstname || '';

  // Map database fields to match previous Supabase format
  return {
    id: user.user_id,
    user_id: user.user_id,
    role_id: user.role_id ?? null,
    email: user.email,
    recovery_email: recoveredEmail,
    username,
    first_name: user.firstname,
    last_name: user.lastname,
    full_name: `${user.firstname} ${user.lastname}`,
    name: `${user.firstname} ${user.lastname}`,
    contact_number: user.contact_number || user.cellphone || '',
    policy_accepted: !!user.policy_accepted,
    role: normalizedRole,
    role_name: roleName,
    college: user.school_code,
    school_id: user.school_id ?? null,
    school_name: user.school_name,
    school_code: user.school_code,
    student_number: user.student_number,
    employee_number: user.employee_number,
    profile_picture: profilePicture,
    profile_image: profilePicture,
    user_metadata: {
      college: user.school_code,
      role: normalizedRole,
    },
  };
}

function normalizeRoleKey(roleName = '', roleId = null) {
  const roleIdValue = Number(roleId);

  if (roleIdValue === 1) return 'super_admin';
  if (roleIdValue === 2) return 'librarian_admin';
  if (roleIdValue === 3) return 'librarian';
  if (roleIdValue === 4) return 'student';

  const normalizedValue = String(roleName || '').trim().toLowerCase();

  if (!normalizedValue) return '';
  if (normalizedValue === 'super admin') return 'super_admin';
  if (normalizedValue === 'librarian admin') return 'librarian_admin';
  if (normalizedValue === 'librarian') return 'librarian';
  if (normalizedValue === 'student') return 'student';

  return normalizedValue.replace(/\s+/g, '_');
}

function normalizeCampusKey(college) {
  const normalizedValue = String(college || '').trim().toLowerCase();

  if (!normalizedValue) return '';
  if (normalizedValue.includes('guagua') || normalizedValue.includes('gnc')) return 'guagua';
  if (normalizedValue.includes('santarita') || normalizedValue.includes('src')) return 'santarita';

  return normalizedValue;
}

// Export the api instance for custom requests
export default api;
