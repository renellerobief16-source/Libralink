import React, { useState, useEffect, useRef } from 'react';
import { 
  FiPrinter, FiFileText, FiUser, FiCalendar, FiBook, FiCheckCircle, 
  FiX, FiSearch, FiArrowRight, FiEdit3, FiFile, FiShare2, FiLayers, 
  FiShield, FiClock, FiCheck, FiRefreshCw, FiExternalLink
} from 'react-icons/fi';
import api, { API_ORIGIN } from '../../../utils/api';
import { formatPhilippineDate, formatPhilippineDateTime, formatRelativeTime } from '../../../utils/timeUtils';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const LibrarianPermissionLetter = ({ darkMode }) => {
  const [requestId, setRequestId] = useState('');
  const [borrowRequest, setBorrowRequest] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [letterGenerated, setLetterGenerated] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [recentApprovedRequests, setRecentApprovedRequests] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  
  // Editable content state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState({
    letterTitle: 'OFFICIAL LIBRARY PERMISSION LETTER',
    letterSubtitle: 'Institutional Authorization for Inter-School Resource Access',
    letterBody: '',
    customInstructions: ''
  });

  const fetchRecentApproved = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) return;

    setLoadingRecent(true);
    try {
      const response = await api.get(`/borrow-requests/school/${schoolId}`);
      const requests = response.dataWithItems || response.data || [];
      
      // Filter for approved inter-school requests
      const approved = requests.filter(r => 
        (r.status === 'approved' || r.status === 'released' || r.status === 'active') &&
        r.request_type === 'inter_school'
      );
      setRecentApprovedRequests(approved.slice(0, 10));
    } catch (err) {
      console.error('Error fetching approved requests:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    // Fetch school info
    const storedSchool = localStorage.getItem('schoolInfo');
    if (storedSchool) {
      try {
        setSchoolInfo(JSON.parse(storedSchool));
      } catch (e) {
        console.warn(e);
      }
    } else {
      const schoolId = localStorage.getItem('schoolId');
      if (schoolId) {
        api.get(`/schools/${schoolId}`)
          .then(res => setSchoolInfo(res.data))
          .catch(console.warn);
      }
    }

    fetchRecentApproved();

    // Clean print styles
    const style = document.createElement('style');
    style.id = 'print-letter-styles';
    style.textContent = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-permission-letter, #printable-permission-letter * {
          visibility: visible !important;
        }
        #printable-permission-letter {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 24px !important;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById('print-letter-styles');
      if (el) document.head.removeChild(el);
    };
  }, []);

  const populateLetterContent = (reqData, studentData) => {
    const todayPHT = formatPhilippineDate(new Date());
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    const validUntilPHT = formatPhilippineDate(validUntilDate);

    const partnerName = reqData.partner_school?.school_name || 'Partner Consortium Library';
    const homeName = schoolInfo?.school_name || 'Home Campus Library';

    setEditableContent({
      letterTitle: 'OFFICIAL LIBRARY PERMISSION LETTER',
      letterSubtitle: 'Consortium Resource Access & Inter-School Borrowing Authorization',
      letterBody: `This letter serves as formal institutional authorization issued by the ${homeName} for the student designated herein to visit and borrow approved academic resources from the ${partnerName} under the Libralink Inter-School Library Network arrangement.

This authorization corresponds to the verified and approved Request Reference: ${reqData.request_id}. The student has been verified to be in good institutional standing with no outstanding liabilities or circulation hold impediments at the home campus.

Conditions of Inter-School Loan:
1. The student must present this authorization letter along with their official institutional Student ID upon arrival at the partner library circulation counter.
2. Materials borrowed must be handled with utmost diligence and returned on or before the agreed-upon due date.
3. Overdue penalties, replacement fees, or damage assessments shall be governed by consortium inter-library policies.

This credential remains valid from ${todayPHT} through ${validUntilPHT}.`,
      customInstructions: 'Please present this document to the head circulation desk upon entry.'
    });
  };

  const loadRequestDetails = async (reqObjOrId) => {
    setLoading(true);
    setError('');
    setIsEditMode(false);

    try {
      let reqData = null;
      if (typeof reqObjOrId === 'object' && reqObjOrId !== null) {
        reqData = reqObjOrId;
      } else {
        const res = await api.get(`/borrow-requests/${reqObjOrId}`);
        reqData = res.data?.data || res.data;
      }

      if (!reqData) {
        setError('Borrow request record could not be found.');
        setLoading(false);
        return;
      }

      if (reqData.status === 'rejected' || reqData.status === 'cancelled') {
        setError(`This request is marked as ${reqData.status.toUpperCase()}. A permission letter cannot be generated for cancelled or rejected requests.`);
        setLoading(false);
        return;
      }

      setBorrowRequest(reqData);
      setRequestId(reqData.request_id);

      // Student info
      let studentData = reqData.student;
      if (!studentData && reqData.student_id) {
        try {
          const uRes = await api.get(`/users/${reqData.student_id}`);
          studentData = uRes.data?.data || uRes.data;
        } catch (e) {
          console.warn('Could not fetch student:', e);
        }
      }
      setStudent(studentData);

      populateLetterContent(reqData, studentData);
      setLetterGenerated(true);
    } catch (err) {
      console.error(err);
      setError('Unable to load request details. Please check the Request ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e?.preventDefault();
    if (!requestId.trim()) {
      setError('Please enter a Request ID (e.g. LL-2026-123456)');
      return;
    }
    loadRequestDetails(requestId.trim());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiShield className="w-3.5 h-3.5 text-emerald-300" />
              Consortium Circulation Authorization
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Permission Letter Generator</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Issue printable institutional permission letters for students authorized to borrow books from partner campus libraries.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-white flex items-center justify-center font-bold text-xs">
              PHT
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Standard Issuance Date</p>
              <p className="text-sm font-bold text-white">{formatPhilippineDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Quick Selector: Recent Approved Inter-School Requests */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Approved Inter-School Requests (1-Click Generation)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an approved request below to instantly generate the official permission letter without typing the ID.
            </p>
          </div>
          <button
            onClick={fetchRecentApproved}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loadingRecent ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
            Scanning approved inter-school requests...
          </div>
        ) : recentApprovedRequests.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-600 font-medium">No approved inter-school requests found currently.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">You can also look up any request by entering its Request ID in the search box below.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/80 border-b border-slate-200/80">
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Student Borrower</th>
                  <th className="py-2.5 px-3">Target Partner Library</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApprovedRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {req.request_id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {req.student?.firstname} {req.student?.lastname}
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {req.student?.student_number || ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {req.partner_school?.school_name || 'Partner Campus Library'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => loadRequestDetails(req)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1"
                      >
                        <span>Generate Letter</span>
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Search Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 no-print">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FiSearch className="w-3.5 h-3.5 text-blue-600" />
          Lookup Specific Request ID
        </h4>
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiFileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. LL-2026-170894"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-slate-900"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 shadow-md"
          >
            {loading ? 'Searching...' : 'Search & Load'}
          </Button>
        </form>

        {error && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <FiX className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Generated Letter Studio & Printable Sheet */}
      {letterGenerated && borrowRequest && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <p className="text-xs font-bold text-slate-900">
                Letter Ready: {borrowRequest.request_id} · {student?.firstname} {student?.lastname}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <FiEdit3 className="w-3.5 h-3.5" />
                {isEditMode ? 'Done Editing' : 'Customize Letter Text'}
              </button>

              <Button
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold py-2 px-5 shadow-md flex items-center gap-1.5"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                Print Official Letter
              </Button>
            </div>
          </div>

          {/* Official Letter Sheet (Screen preview + Print target) */}
          <div 
            id="printable-permission-letter"
            className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-8 sm:p-12 max-w-4xl mx-auto text-slate-800 space-y-6"
          >
            {/* Institution Letterhead Header */}
            <div className="border-b-2 border-slate-800 pb-6 text-center space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Republic of the Philippines · Higher Education Consortium
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
                {schoolInfo?.school_name || 'SANTA RITA COLLEGE'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                University Library & Learning Commons · Inter-School Circulation Office
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Consortium ID: {schoolInfo?.school_code || 'SRC'} · Libralink Inter-Library Network
              </p>
            </div>

            {/* Document Title */}
            <div className="text-center pt-2">
              {isEditMode ? (
                <input
                  type="text"
                  value={editableContent.letterTitle}
                  onChange={(e) => setEditableContent({...editableContent, letterTitle: e.target.value})}
                  className="text-center text-lg font-black text-slate-900 uppercase border border-blue-400 p-1 rounded-lg w-full"
                />
              ) : (
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase">
                  {editableContent.letterTitle}
                </h3>
              )}
              <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-0.5">
                {editableContent.letterSubtitle}
              </p>
            </div>

            {/* Reference Meta Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Date Issued</span>
                <span className="font-bold text-slate-800">{formatPhilippineDate(new Date())}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Request Reference</span>
                <span className="font-mono font-bold text-slate-900">{borrowRequest.request_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Target Partner</span>
                <span className="font-bold text-blue-800">{borrowRequest.partner_school?.school_name || 'Partner Library'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Network Status</span>
                <span className="font-bold text-emerald-700 uppercase">Verified & Approved</span>
              </div>
            </div>

            {/* Authorized Student Credentials */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-blue-700">
                Student Patron Identity
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 block">Student Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{student?.firstname} {student?.lastname}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Student ID Number:</span>
                  <span className="font-mono font-bold text-slate-800">{student?.student_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Academic Department:</span>
                  <span className="font-medium text-slate-800">{student?.department || 'Undergraduate'}</span>
                </div>
              </div>
            </div>

            {/* Requested Materials */}
            {borrowRequest.items && borrowRequest.items.length > 0 && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-blue-700">
                  Authorized Item Specifications
                </p>
                <div className="space-y-1.5">
                  {borrowRequest.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                      <div>
                        <span className="font-bold text-slate-900">{it.books?.title || it.book?.title || 'Book Title'}</span>
                        <span className="text-slate-500 block text-[11px]">Author: {it.books?.author || it.book?.author || '—'}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-600">ISBN: {it.books?.isbn || it.book?.isbn || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Letter Body */}
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 pt-2">
              {isEditMode ? (
                <textarea
                  rows={8}
                  value={editableContent.letterBody}
                  onChange={(e) => setEditableContent({...editableContent, letterBody: e.target.value})}
                  className="w-full p-3 border border-blue-400 rounded-xl text-xs font-mono"
                />
              ) : (
                <div className="whitespace-pre-line">
                  {editableContent.letterBody}
                </div>
              )}
            </div>

            {/* Signatory Block */}
            <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-10">Issued and Certified By:</p>
                <div className="border-t border-slate-800 pt-1">
                  <p className="font-bold text-slate-900">CAMPUS CHIEF LIBRARIAN</p>
                  <p className="text-slate-500 text-[11px]">Director of Library & Learning Resources</p>
                  <p className="text-slate-400 text-[10px] font-mono mt-0.5">Signature Verified over Printed Name</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-10">Acknowledged by Borrower:</p>
                <div className="border-t border-slate-800 pt-1">
                  <p className="font-bold text-slate-900">{student?.firstname} {student?.lastname}</p>
                  <p className="text-slate-500 text-[11px]">Student Borrower Signature</p>
                  <p className="text-slate-400 text-[10px] font-mono mt-0.5">ID: {student?.student_number || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarianPermissionLetter;
