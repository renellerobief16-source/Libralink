import React, { useState, useEffect, useRef } from 'react';
import { FiPrinter, FiFileText, FiUser, FiCalendar, FiBook, FiCheckCircle, FiX, FiSearch, FiArrowRight, FiEdit3, FiFile, FiShare2 } from 'react-icons/fi';
import { API_ORIGIN } from '../../../utils/api';

const LibrarianPermissionLetter = ({ darkMode }) => {
  const [requestId, setRequestId] = useState('');
  const [borrowRequest, setBorrowRequest] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [letterGenerated, setLetterGenerated] = useState(false);
  const letterRef = useRef(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  
  // Editable content state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState({
    letterTitle: 'LIBRARY PERMISSION LETTER',
    letterSubtitle: 'Official Authorization for Library Access',
    letterBody: '',
    customInstructions: ''
  });

  useEffect(() => {
    // Fetch school info from localStorage
    const storedSchool = localStorage.getItem('schoolInfo');
    if (storedSchool) {
      setSchoolInfo(JSON.parse(storedSchool));
    }

    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!requestId.trim()) {
      setError('Please enter a request ID');
      return;
    }

    setLoading(true);
    setError('');
    setBorrowRequest(null);
    setStudent(null);
    setLetterGenerated(false);
    setIsEditMode(false);

    try {
      const response = await fetch(`${API_ORIGIN}/api/borrow-requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Check if request is rejected or pending
        if (data.data.status === 'rejected') {
          setError("Student can't get the permission letter because it's Rejected");
          setLoading(false);
          return;
        }
        
        if (data.data.status === 'pending') {
          setError("Request is still pending approval. Please approve the request first before generating a permission letter.");
          setLoading(false);
          return;
        }

        setBorrowRequest(data.data);
        setLetterGenerated(true);

        // Initialize editable content with default letter body
        setEditableContent({
          letterTitle: 'LIBRARY PERMISSION LETTER',
          letterSubtitle: 'Official Authorization for Library Access',
          letterBody: `This letter serves as official authorization for the student identified below to borrow books from partner school libraries through the inter-library borrowing program.

This permission is granted based on the approved borrow request ${data.data.request_id} and authorizes the student to access library resources at partner schools, including but not limited to:

- Borrowing books from partner school libraries
- Accessing reference materials and digital resources
- Utilizing study areas and research facilities at partner schools
- Participating in inter-library programs and workshops

The student agrees to adhere to all library policies and regulations of both their home school and the partner schools, including proper care of borrowed materials, timely return of items, and respectful conduct within library premises.

This permission letter is valid from ${getCurrentDate()} until ${getExpiryDate()}, unless otherwise revoked or renewed.

Should you have any questions or require further verification, please contact the library administration using the information provided above.`,
          customInstructions: ''
        });

        // Fetch student details
        if (data.data.student_id) {
          try {
            const studentResponse = await fetch(`${API_ORIGIN}/api/users/${data.data.student_id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const studentData = await studentResponse.json();
            if (studentData.success && studentData.data) {
              setStudent(studentData.data);
            }
          } catch (err) {
            console.error('Error fetching student details:', err);
          }
        }
      } else {
        setError('Request not found');
      }
    } catch (err) {
      console.error('Error searching request:', err);
      setError('Failed to search request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
  };

  const handleContentChange = (field, value) => {
    setEditableContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrint = () => {
    const printContent = letterRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      document.body.style.padding = '0';
      document.body.style.margin = '0';
      window.print();
      document.body.innerHTML = originalContents;
      document.body.style.padding = '';
      document.body.style.margin = '';
      window.location.reload();
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getExpiryDate = () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    return expiry.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#0077B6] rounded-xl flex items-center justify-center">
              <FiFileText className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              Permission Letter Generator
            </h1>
          </div>
          <p className="text-[#64748B] text-lg ml-15">
            Generate permission letters for inter-library book borrowing
          </p>
        </div>

        {/* Request ID Search Section */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 mb-8">
          <label className="block text-sm font-semibold text-[#0F172A] mb-3">
            Request ID
          </label>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#64748B] w-5 h-5" />
              <input
                type="text"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="Enter request ID (e.g., LL-2026-123456)"
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0077B6] focus:border-transparent text-[#0F172A] placeholder-[#64748B] transition-all text-base"
              />
            </div>
            <button
              type="submit"
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-4 bg-[#0077B6] text-white rounded-xl hover:bg-[#005f8f] disabled:bg-[#94a3b8] disabled:cursor-not-allowed flex items-center gap-2 transition-all font-medium text-base min-w-[160px] justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <FiSearch className="w-5 h-5" />
                  Search Request
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <FiX className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

      {/* Permission Letter */}
      {letterGenerated && borrowRequest && (
        <>
          {/* Request Details Preview (Screen Only) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 mb-8 no-print">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
              <FiFileText className="text-[#0077B6]" />
              Request Details
            </h2>
            <div className="bg-[#F7FAFC] p-6 rounded-xl border border-[#E2E8F0]">
              <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                <div>
                  <span className="font-semibold text-[#64748B]">Request ID:</span>
                  <p className="text-[#0F172A] mt-1">{borrowRequest.request_id}</p>
                </div>
                <div>
                  <span className="font-semibold text-[#64748B]">Request Type:</span>
                  <p className="text-[#0F172A] mt-1">{borrowRequest.request_type === 'HOME' ? 'Home Library' : 'Inter-School'}</p>
                </div>
                <div>
                  <span className="font-semibold text-[#64748B]">Status:</span>
                  <p className="text-[#0F172A] mt-1 capitalize">{borrowRequest.status}</p>
                </div>
                <div>
                  <span className="font-semibold text-[#64748B]">Purpose:</span>
                  <p className="text-[#0F172A] mt-1">{borrowRequest.purpose || 'Academic Research'}</p>
                </div>
              </div>

              <h3 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <FiUser className="text-[#0077B6]" />
                Student Information
              </h3>
              <div className="flex items-start gap-4 mb-6">
                {student?.profile_image && (
                  <img
                    src={`${API_ORIGIN}${student.profile_image}`}
                    alt={`${student.firstname} ${student.lastname}`}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-[#E2E8F0]"
                  />
                )}
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="font-semibold text-[#64748B]">Full Name:</span>
                      <p className="text-[#0F172A] mt-1">{student?.firstname} {student?.lastname}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Student ID:</span>
                      <p className="text-[#0F172A] mt-1">{student?.student_number || borrowRequest.student_id}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Email:</span>
                      <p className="text-[#0F172A] mt-1">{student?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Contact:</span>
                      <p className="text-[#0F172A] mt-1">{student?.contact_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-[#64748B]">Home School:</span>
                      <p className="text-[#0F172A] mt-1">{student?.school_name || borrowRequest.home_school_id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {borrowRequest.items && borrowRequest.items.length > 0 && (
                <>
                  <h3 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                    <FiBook className="text-[#0077B6]" />
                    Requested Books
                  </h3>
                  <div className="text-sm">
                    {borrowRequest.items.map((item, index) => (
                      <div key={index} className="mb-3 p-4 bg-white rounded-xl border border-[#E2E8F0]">
                        <p className="text-[#0F172A] font-medium">{item.books?.title || 'Book title not available'}</p>
                        {item.books?.author && <p className="text-[#64748B] text-xs mt-1">by {item.books.author}</p>}
                        {item.books?.isbn && <p className="text-[#64748B] text-xs">ISBN: {item.books.isbn}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Printable Letter */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                <FiFileText className="text-[#0077B6]" />
                Permission Letter Preview
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-[#64748B] text-white rounded-xl hover:bg-[#475569] flex items-center gap-2 transition-all font-medium"
                >
                  {isEditMode ? (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      Done Editing
                    </>
                  ) : (
                    <>
                      <FiEdit3 className="w-4 h-4" />
                      Edit Letter
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-2 bg-[#0077B6] text-white rounded-xl hover:bg-[#005f8f] flex items-center gap-2 transition-all font-medium"
                >
                  <FiPrinter className="w-5 h-5" />
                  Print Letter
                </button>
              </div>
            </div>

            {/* Edit Mode Controls */}
            {isEditMode && (
              <div className="mb-6 p-4 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0] no-print">
                <h3 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                  <FiEdit3 className="text-[#0077B6]" />
                  Edit Letter Content
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-2">Letter Title</label>
                    <input
                      type="text"
                      value={editableContent.letterTitle}
                      onChange={(e) => handleContentChange('letterTitle', e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0077B6] focus:border-transparent text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-2">Letter Subtitle</label>
                    <input
                      type="text"
                      value={editableContent.letterSubtitle}
                      onChange={(e) => handleContentChange('letterSubtitle', e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0077B6] focus:border-transparent text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-2">Letter Body</label>
                    <textarea
                      value={editableContent.letterBody}
                      onChange={(e) => handleContentChange('letterBody', e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0077B6] focus:border-transparent text-[#0F172A] resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-2">Custom Instructions (Optional)</label>
                    <textarea
                      value={editableContent.customInstructions}
                      onChange={(e) => handleContentChange('customInstructions', e.target.value)}
                      rows={4}
                      placeholder="Add any additional instructions or notes..."
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0077B6] focus:border-transparent text-[#0F172A] resize-y"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Letter Content */}
            <div ref={letterRef} className="bg-white p-10 border-2 border-[#E2E8F0] rounded-2xl">
              {/* Letter Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#0F172A] mb-2">
                  {editableContent.letterTitle}
                </h1>
                <p className="text-[#64748B]">{editableContent.letterSubtitle}</p>
              </div>

              {/* School Header with Logo */}
              {schoolInfo && (
                <div className="text-center mb-8 pb-4 border-b-2 border-[#E2E8F0]">
                  {schoolInfo.logo && (
                    <img 
                      src={`${API_ORIGIN}${schoolInfo.logo}`} 
                      alt={`${schoolInfo.school_name} Logo`}
                      className="h-20 mx-auto mb-3 object-contain"
                    />
                  )}
                  <h2 className="text-xl font-bold text-[#0077B6]">{schoolInfo.school_name}</h2>
                  <p className="text-[#64748B]">{schoolInfo.address}</p>
                  <p className="text-[#64748B]">Contact: {schoolInfo.contact_number}</p>
                </div>
              )}

              {/* Date */}
              <div className="text-right mb-6">
                <p className="text-[#0F172A]">
                  <span className="font-semibold">Date:</span> {getCurrentDate()}
                </p>
              </div>

              {/* Salutation */}
              <div className="mb-6">
                <p className="text-[#0F172A]">
                  <span className="font-semibold">To Whom It May Concern:</span>
                </p>
              </div>

              {/* Letter Body */}
              <div className="mb-6 text-[#0F172A] leading-relaxed whitespace-pre-line">
                {editableContent.letterBody}
              </div>

              {/* Custom Instructions */}
              {editableContent.customInstructions && (
                <div className="mb-6 p-4 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
                  <h3 className="font-semibold text-[#0F172A] mb-2">Additional Instructions:</h3>
                  <p className="text-[#64748B] whitespace-pre-line">{editableContent.customInstructions}</p>
                </div>
              )}

              {/* Student Information (Simplified for Letter) */}
              <div className="bg-[#F7FAFC] p-4 rounded-xl mb-6 border border-[#E2E8F0]">
                <h3 className="font-bold text-[#0F172A] mb-3 flex items-center gap-2">
                  <FiUser className="text-[#0077B6]" />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-[#64748B]">Full Name:</span>
                    <p className="text-[#0F172A]">{student?.firstname} {student?.lastname}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#64748B]">Student ID:</span>
                    <p className="text-[#0F172A]">{student?.student_number || borrowRequest.student_id}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#64748B]">School:</span>
                    <p className="text-[#0F172A]">{student?.school_name || borrowRequest.home_school_id}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#64748B]">School ID:</span>
                    <p className="text-[#0F172A]">{student?.school_id || borrowRequest.home_school_id}</p>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div className="mt-12 pt-6 border-t-2 border-[#E2E8F0]">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-center text-[#64748B] text-sm mb-1">
                      Student Name
                    </p>
                    <p className="text-center text-[#0F172A] font-semibold mb-2">
                      {student?.firstname} {student?.lastname}
                    </p>
                    <div className="border-b-2 border-[#E2E8F0] mb-2 h-16"></div>
                    <p className="text-center text-[#0F172A]">
                      <span className="font-semibold">Student Signature</span>
                    </p>
                  </div>
                  <div>
                    <div className="border-b-2 border-[#E2E8F0] mb-2 h-16"></div>
                    <p className="text-center text-[#0F172A]">
                      <span className="font-semibold">Chief Librarian</span>
                    </p>
                    <p className="text-center text-[#64748B] text-sm">
                      {schoolInfo?.school_name || 'Library Administration'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-[#64748B] text-sm">
                    Date: {getCurrentDate()}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-[#E2E8F0] text-center text-sm text-[#64748B]">
                <p>This is an official document. Unauthorized reproduction is prohibited.</p>
                <p className="mt-1">Generated by LibraLink Library Management System</p>
              </div>
            </div>
          </div>
        </>
      )}

        {/* How to Use Section */}
        {!letterGenerated && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 mb-8">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
              <FiBook className="text-[#0077B6]" />
              How to Use
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0F172A] mb-1">Enter Request ID</h3>
                  <p className="text-sm text-[#64748B]">Enter the request ID in the search field above.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0F172A] mb-1">Search Request</h3>
                  <p className="text-sm text-[#64748B]">Click "Search Request" to fetch request details.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0F172A] mb-1">Review Letter</h3>
                  <p className="text-sm text-[#64748B]">Review the generated permission letter with request information.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0F172A] mb-1">Print Letter</h3>
                  <p className="text-sm text-[#64748B]">Click "Print Letter" to generate a printable version.</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0F172A] mb-1">Sign Letter</h3>
                  <p className="text-sm text-[#64748B]">Sign the letter in the designated signature area.</p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    6
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0F172A] mb-1">Provide Letter</h3>
                  <p className="text-sm text-[#64748B]">Provide the signed letter to the student.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Footer Message */}
        <div className="text-center py-8">
          <p className="text-[#64748B] text-sm">
            Keep the library connected. Share knowledge, build futures.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LibrarianPermissionLetter;
