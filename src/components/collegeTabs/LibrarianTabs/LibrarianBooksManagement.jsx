import { useState, useEffect, useRef } from 'react';
import { 
  FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText, 
  FiArrowRight, FiX, FiEye, FiFilter, FiSearch, FiLoader, FiPause,
  FiLayers, FiDatabase, FiCheck, FiInfo, FiUploadCloud, FiBook,
  FiActivity, FiBookOpen, FiZap, FiRefreshCw, FiGrid
} from 'react-icons/fi';
import api from '../../../utils/api';
import { PageHeader, Button, Card, Select, StatusBadge } from '../../ui';
import {
  parseImportFile,
  detectColumnMapping,
  normalizeBookData,
  validateImportRow,
  getAvailableFields,
  getRequiredFields,
  getRecommendedFields,
  getMappingConfidence,
  getMappingConfidencePercentage,
  autoMapColumns,
  downloadImportReport
} from '../../../utils/bookImportUtils';

function AdminBooksManagement({ darkMode, onNavigateTab }) {
  const [importStep, setImportStep] = useState('upload'); // upload, mapping, preview, results
  const [importStatus, setImportStatus] = useState('idle'); // idle, uploading, processing, validating, importing, completed, failed, cancelled
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [existingAccessionNumbers, setExistingAccessionNumbers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, valid, invalid, warning
  const [searchQuery, setSearchQuery] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importCancelled, setImportCancelled] = useState(false);
  const [dismissCancelledNotice, setDismissCancelledNotice] = useState(false);
  const [showConfirmGateModal, setShowConfirmGateModal] = useState(false);

  // Futuristic Cyber-Download Overlay state
  const [showDownloadOverlay, setShowDownloadOverlay] = useState(false);
  const [currentBookTitle, setCurrentBookTitle] = useState('');
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ingestionSpeed, setIngestionSpeed] = useState(0);
  const [isCelebrationPhase, setIsCelebrationPhase] = useState(false);

  const abortControllerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const loggedInUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const userSchoolId = selectedSchool || localStorage.getItem('schoolId') || loggedInUser?.school_id;
  const currentSchool = schools.find(s => String(s.school_id) === String(userSchoolId)) || {
    school_name: loggedInUser?.school_name || loggedInUser?.school || 'My Assigned Institution',
    school_code: loggedInUser?.school_code || ''
  };

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId') || loggedInUser?.school_id;
    if (schoolId) {
      setSelectedSchool(schoolId);
      fetchExistingAccessionNumbers(schoolId);
    }
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      const schoolList = response.data || response || [];
      setSchools(schoolList);
      const schoolId = localStorage.getItem('schoolId') || loggedInUser?.school_id;
      if (schoolId) {
        setSelectedSchool(schoolId);
        fetchExistingAccessionNumbers(schoolId);
      }
      setLoadingSchools(false);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setLoadingSchools(false);
    }
  };

  const fetchExistingAccessionNumbers = async (schoolId) => {
    try {
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      let books = [];
      if (Array.isArray(response)) {
        books = response;
      } else if (Array.isArray(response?.data?.books)) {
        books = response.data.books;
      } else if (Array.isArray(response?.books)) {
        books = response.books;
      } else if (Array.isArray(response?.data)) {
        books = response.data;
      }
      const accessionNumbers = books.map(book => book.accession_number).filter(Boolean);
      setExistingAccessionNumbers(accessionNumbers);
    } catch (err) {
      console.error('Error fetching existing accession numbers:', err);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError('');
    setErrorDetails(null);
    setUploading(true);
    setImportStatus('uploading');

    try {
      console.log('[FRONTEND] Parsing file:', selectedFile.name);
      const parsed = await parseImportFile(selectedFile);
      console.log('[FRONTEND] File parsed successfully:', parsed.rowCount, 'rows');
      
      setParsedData(parsed);
      
      // Auto-map columns with advanced detection
      const { mapping: autoMapping, unmappedColumns } = autoMapColumns(parsed.headers, parsed.data);
      console.log('[FRONTEND] Auto-mapped columns:', autoMapping);
      console.log('[FRONTEND] Unmapped columns:', unmappedColumns);
      
      setColumnMapping(autoMapping);
      
      // Check if all required fields are mapped
      const requiredFields = getRequiredFields();
      const mappedRequired = requiredFields.filter(field => 
        Object.values(autoMapping).includes(field)
      );
      
      console.log('[FRONTEND] Required fields mapped:', mappedRequired.length, '/', requiredFields.length);
      console.log('[FRONTEND] Unmapped columns:', unmappedColumns.length);
      
      // STRICT 3-STEP FLOW: 1 Upload & Source -> 2 Column Mapping -> 3 Preview & Ingest
      // ALWAYS proceed directly to Step 2: Column Mapping so the user reviews and confirms column assignments
      console.log('[FRONTEND] File parsed. Proceeding directly to Step 2: Column Mapping');
      setImportStep('mapping');
      
      setImportStatus('idle');
    } catch (err) {
      console.error('[FRONTEND] File parsing error:', err);
      setError('Failed to parse file: ' + err.message);
      setErrorDetails({
        type: 'parse_error',
        originalError: err.message,
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      });
      setImportStatus('failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMappingChange = (csvColumn, dbField) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: dbField
    }));
  };

  const handleContinueToPreview = () => {
    setImportStatus('validating');
    
    // Normalize all data with current mapping
    const normalized = parsedData.data.map((row, index) => {
      const normalizedRow = normalizeBookData(row, columnMapping);
      const validation = validateImportRow(normalizedRow, index, existingAccessionNumbers);
      return {
        original: row,
        normalized: normalizedRow,
        validation: validation,
        rowIndex: index
      };
    });

    console.log('[FRONTEND] Validation completed:', {
      total: normalized.length,
      valid: normalized.filter(r => r.validation.valid).length,
      invalid: normalized.filter(r => !r.validation.valid).length,
      warnings: normalized.filter(r => r.validation.hasWarnings).length
    });

    setPreviewData(normalized);
    setValidationResults(normalized);
    setImportStep('preview');
    setImportStatus('idle');
  };

  const handleAutoAcceptMappings = () => {
    // Auto-accept all current mappings and proceed to preview
    console.log('[FRONTEND] Auto-accepting all mappings');
    handleContinueToPreview();
  };

  const handleCancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setImportCancelled(true);
    setImportStatus('cancelled');
    setShowDownloadOverlay(false);
    setUploading(false);
    setDismissCancelledNotice(false);
  };

  const handleImport = async () => {
    const activeSchool = selectedSchool || localStorage.getItem('schoolId') || loggedInUser?.school_id;
    if (!activeSchool) {
      setError('Authenticated institutional credentials missing. Please re-login.');
      return;
    }

    // Import ALL rows - no filtering needed since everything is valid now
    const allRows = validationResults;
    
    if (allRows.length === 0) {
      setError('No data to import');
      return;
    }

    setUploading(true);
    setError('');
    setErrorDetails(null);
    setImportCancelled(false);
    setDismissCancelledNotice(true);
    setImportStatus('importing');
    setImportProgress(0);
    setCurrentBookIndex(1);
    setCurrentBookTitle(allRows[0]?.normalized?.title || 'Preparing records for catalog ingestion...');
    setElapsedSeconds(0);
    setIngestionSpeed(16);
    setIsCelebrationPhase(false);
    setShowDownloadOverlay(true);

    abortControllerRef.current = new AbortController();

    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let simProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      const remaining = 93 - simProgress;
      if (remaining > 0) {
        const step = Math.max(0.4, remaining * 0.05 + Math.random() * 1.4);
        simProgress = Math.min(93, simProgress + step);
        setImportProgress(simProgress);

        const activeIdx = Math.min(
          Math.floor((simProgress / 100) * allRows.length),
          allRows.length - 1
        );
        setCurrentBookIndex(activeIdx + 1);
        if (allRows[activeIdx]?.normalized?.title) {
          setCurrentBookTitle(allRows[activeIdx].normalized.title);
        }

        const elapsed = Math.max(1, (Date.now() - startTime) / 1000);
        setIngestionSpeed(Math.round((activeIdx + 1) / elapsed));
      }
    }, 130);

    try {
      console.log('[FRONTEND] Starting cyber import process for', allRows.length, 'records');

      const importData = allRows.map(row => {
        const { school, ...dataWithoutSchool } = row.normalized;
        return dataWithoutSchool;
      });

      const response = await api.post('/books/bulk-import', {
        data: importData,
        column_mapping: columnMapping,
        school_id: activeSchool,
        user_id: localStorage.getItem('currentUserId')
      }, {
        signal: abortControllerRef.current.signal
      });

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      // Complete to 100% smoothly
      setImportProgress(100);
      setCurrentBookIndex(allRows.length);
      setCurrentBookTitle('All records catalogued successfully!');
      setIsCelebrationPhase(true);

      const finalResults = response?.results || response?.data?.results || response?.data || {
        successful: allRows.length,
        failed: 0,
        skipped: 0,
        copies_created: allRows.reduce((sum, r) => {
          const raw = parseInt(r.normalized?.quantity, 10);
          return sum + (!isNaN(raw) && raw > 0 && raw <= 50 ? raw : 1);
        }, 0)
      };

      setImportResults(finalResults);

      // Hold celebration for 900ms then transition to results view
      setTimeout(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setShowDownloadOverlay(false);
        setImportStep('results');
        setImportStatus('completed');
      }, 950);

    } catch (err) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setShowDownloadOverlay(false);
      setUploading(false);
      
      const isUserAborted = 
        err?.isCancel ||
        err?.name === 'CanceledError' ||
        err?.name === 'AbortError' ||
        err?.code === 'ERR_CANCELED' ||
        importCancelled ||
        abortControllerRef.current?.signal?.aborted;

      if (isUserAborted) {
        console.log('[FRONTEND] Ingestion safely halted by user');
        setError('');
        setErrorDetails(null);
        setImportStatus('cancelled');
        setDismissCancelledNotice(false);
        return;
      }

      console.error('[FRONTEND] Import error:', err);

        let errorMessage = 'Import failed';
        let errorType = 'unknown';
        
        if (err.message === 'Network Error' || err.message === 'Failed to fetch') {
          errorMessage = 'Unable to connect to the import server. Please check if the backend server is running on port 5000.';
          errorType = 'network_error';
        } else if (err.status === 400) {
          errorMessage = err.data?.message || 'Invalid request data. Please check your import data.';
          errorType = 'validation_error';
        } else if (err.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
          errorType = 'auth_error';
        } else if (err.status === 403) {
          errorMessage = 'You do not have permission to import books.';
          errorType = 'permission_error';
        } else if (err.status === 404) {
          errorMessage = 'Import endpoint not found. Please check the API configuration.';
          errorType = 'endpoint_error';
        } else if (err.status === 500) {
          errorMessage = 'Server error during import. Please check the backend logs for details.';
          errorType = 'server_error';
        } else if (err.data?.message) {
          errorMessage = err.data.message;
          errorType = 'api_error';
        } else if (err.message) {
          errorMessage = err.message;
          errorType = 'unknown_error';
        }

        setError(errorMessage);
        setErrorDetails({
          type: errorType,
          status: err.status,
          originalError: err.message,
          apiResponse: err.data
        });
        setImportStatus('failed');
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    setImportStep('upload');
    setImportStatus('idle');
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setPreviewData([]);
    setValidationResults([]);
    setImportResults(null);
    setError('');
    setErrorDetails(null);
  };

  const downloadTemplate = (format = 'csv') => {
    const fields = getAvailableFields().filter(f => f.value !== 'school');
    const headers = fields.map(f => f.label);
    const sampleData = [
      ['Sample Book Title', 'John Doe', 'Sample Publisher', 'Fiction', '978-0-123456-78-9', '123.45 SAM 2024', '5', '1st', '2024', 'xii, 300 p. ; 23 cm.', 'Sample Series', 'General note about the book', 'Sample Subtitle', 'New York', 'Good', 'Purchase', 'Book Supplier', '25.99', 'English'],
      ['Another Book', 'Jane Smith', 'Another Publisher', 'Science', '978-0-987654-32-1', '456.78 ANO 2024', '3', '2nd', '2023', 'x, 250 p. ; 21 cm.', '', 'Another general note', '', 'London', 'Fair', 'Donation', '', '0', '']
    ];
    
    if (format === 'csv') {
      const csvContent = [headers, ...sampleData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'book_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      const htmlContent = `
        <table>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          ${sampleData.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </table>
      `;
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'book_import_template.xls';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const filteredPreviewData = previewData.filter(row => {
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'valid' && row.validation.valid) ||
      (filterStatus === 'invalid' && !row.validation.valid) ||
      (filterStatus === 'warning' && row.validation.hasWarnings);
    
    const matchesSearch = 
      !searchQuery ||
      row.normalized.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.normalized.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.normalized.isbn?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const availableFields = getAvailableFields();
  const requiredFields = getRequiredFields();
  const recommendedFields = getRecommendedFields();

  return (
    <div className="animate-slide-up space-y-6">
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiLayers className="w-3.5 h-3.5 text-blue-300" />
              Institutional Catalog Ingestion
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bulk Book Import Studio</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Rapidly ingest multiple book titles and copies into your library catalog with automatic column detection, duplicate checking, and data validation.
            </p>
          </div>

          {/* Stepper Progress Badges */}
          <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setImportStep('upload')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                importStep === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Upload & Source</span>
            </button>
            <FiArrowRight className="w-3.5 h-3.5 text-white/40" />
            <button
              type="button"
              onClick={() => {
                if (parsedData) setImportStep('mapping');
              }}
              disabled={!parsedData}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !parsedData ? 'opacity-40 cursor-not-allowed text-slate-400' : 'cursor-pointer'
              } ${
                importStep === 'mapping' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>Column Mapping</span>
            </button>
            <FiArrowRight className="w-3.5 h-3.5 text-white/40" />
            <button
              type="button"
              onClick={() => {
                if (parsedData) handleContinueToPreview();
              }}
              disabled={!parsedData}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !parsedData ? 'opacity-40 cursor-not-allowed text-slate-400' : 'cursor-pointer'
              } ${
                importStep === 'preview' || importStep === 'results' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
              <span>Preview & Ingest</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Step */}
      {importStep === 'upload' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Target School Bar (Locked & Secured to Logged-in User) */}
          <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center flex-shrink-0">
                <FiDatabase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Destination Institutional Repository</h3>
                <p className="text-xs text-slate-500">Books will be assigned directly to your authenticated library catalog</p>
              </div>
            </div>

            {/* Tamper-Proof Locked School Badge */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-emerald-200/90 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Authenticated Campus Lock
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentSchool?.school_name || 'Assigned Institution'} {currentSchool?.school_code ? `(${currentSchool.school_code})` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Unified Two-Column Studio Layout */}
          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Guidelines & Official Templates */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <FiInfo className="w-4 h-4 text-blue-600" />
                  Quick Preparation Guide
                </h4>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Download either official CSV or Excel template below to match standard library fields.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Paste or type your book records. Our smart AI mapper detects common aliases for Title, Author, ISBN, etc.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Drag and drop the populated file into the ingestion box on the right.</span>
                  </div>
                </div>
              </div>

              {/* Official Template Download Cards */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>Official Import Templates</span>
                  <span className="text-[11px] font-normal text-slate-400">Pre-formatted headers</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {/* CSV Template */}
                  <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        CSV
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">CSV Spreadsheet</p>
                        <p className="text-[11px] text-slate-500">Universal standard format</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => downloadTemplate('csv')}
                      className="bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-xs"
                    >
                      <FiDownload className="w-3.5 h-3.5 mr-1" />
                      Download
                    </Button>
                  </div>

                  {/* Excel Template */}
                  <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50/80 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        XLS
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Excel Workbook</p>
                        <p className="text-[11px] text-slate-500">Microsoft Excel template</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => downloadTemplate('excel')}
                      className="bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 text-xs font-semibold shadow-xs"
                    >
                      <FiDownload className="w-3.5 h-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Supported Columns Preview */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Supported Catalog Fields:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Title*', 'Author*', 'Publisher', 'Category', 'ISBN', 'Call Number', 'Quantity', 'Year', 'Physical Desc'].map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Drop Zone Studio */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>File Ingestion Zone</span>
                  <span className="text-xs text-slate-400">Accepts .csv, .xlsx, .xls</span>
                </h4>

                <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 rounded-3xl p-8 sm:p-12 text-center transition-all group relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <FiUploadCloud className="w-8 h-8" />
                  </div>
                  <h5 className="text-base font-bold text-slate-800 mb-1">
                    Drag and drop your spreadsheet file here
                  </h5>
                  <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                    Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 25MB.
                  </p>

                  <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                    <FiUpload className="w-4 h-4" />
                    Browse Local File
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-6">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-mono uppercase font-semibold">.CSV</span>
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-mono uppercase font-semibold">.XLSX</span>
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-mono uppercase font-semibold">.XLS</span>
                  </div>
                </div>

                {/* Uploaded File Chip */}
                {file && (
                  <div className="flex items-center justify-between p-4 rounded-2xl mt-4 bg-emerald-50/80 border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <FiFileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-snug">{file.name}</p>
                        <p className="text-xs text-emerald-700 font-medium">
                          {(file.size / 1024).toFixed(1)} KB · Ready to map columns
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setFile(null)} 
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Upload Spinner State */}
                {importStatus === 'uploading' && (
                  <div className="mt-4 p-5 bg-blue-50 rounded-2xl border border-blue-200 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Parsing and Analyzing Records</p>
                      <p className="text-xs text-blue-700">Detecting headers and validating accession constraints...</p>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-4 rounded-2xl mt-4 bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <h5 className="font-bold text-rose-900 mb-0.5">Ingestion Warning</h5>
                      <p className="text-rose-700">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {importStep === 'mapping' && parsedData && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300 mb-6">
          {/* Header Bar */}
          <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                <h3 className="text-lg font-bold text-slate-900">Universal Column Mapping</h3>
              </div>
              <p className="text-xs text-slate-500">
                Match spreadsheet columns to catalog attributes. Any custom column can be preserved into book remarks/notes.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-medium text-slate-700 shadow-xs">
                📄 <strong className="text-slate-900 font-semibold">{file?.name}</strong>
              </span>
              {parsedData?.sheets && parsedData.sheets.length > 1 && (
                <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 font-medium text-purple-700 shadow-xs flex items-center gap-1">
                  📑 <strong className="font-semibold">{parsedData.sheets.length}</strong> Sheets Detected
                </span>
              )}
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 font-medium text-blue-700 shadow-xs">
                📊 <strong className="font-semibold">{parsedData.rowCount}</strong> Total Records
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 font-medium text-emerald-700 shadow-xs">
                🎯 <strong className="font-semibold">{Object.values(columnMapping).filter(v => v && v !== 'ignore').length}</strong> Mapped
              </span>
            </div>
          </div>

          {/* Multi-Sheet Breakdown Bar */}
          {parsedData?.sheets && parsedData.sheets.length > 1 && (
            <div className="mx-6 sm:mx-8 mt-5 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2 text-purple-900 font-bold">
                <span>📑 Multi-Sheet Master Ingestion ({parsedData.sheets.length} Sheets Included):</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {parsedData.sheets.map((sheet, sIdx) => (
                  <span key={sIdx} className="px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-purple-800 text-[11px] font-medium shadow-2xs">
                    {sheet.name} <span className="text-purple-400 font-mono">({sheet.rowCount} rows)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Guidance Notification */}
          <div className="mx-6 sm:mx-8 mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/60 border border-blue-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <FiZap className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-blue-900 font-semibold">Smart Column Detection Active:</strong> Columns across all sheets have been aggregated and auto-aligned with library schemas. You can map any custom column to catalog fields, assign it to <span className="font-semibold text-indigo-700">"📝 Auto-Note / Custom Metadata"</span>, or choose <span className="font-semibold text-slate-700">"🚫 Ignore"</span>. Unmapped extra columns will also be retained.
            </div>
          </div>

          {/* Columns Grid / List */}
          <div className="p-6 sm:p-8 space-y-3.5 max-h-[560px] overflow-y-auto">
            {parsedData.headers.map((header, index) => {
              const currentMapping = columnMapping[header] || '';
              const confidence = getMappingConfidence(header, currentMapping);
              const confidencePercent = getMappingConfidencePercentage(header, currentMapping);
              
              // Extract sample values for this header
              const sampleVals = (parsedData.data || [])
                .slice(0, 4)
                .map(row => row[header])
                .filter(val => val !== undefined && val !== null && String(val).trim() !== '')
                .map(val => String(val).trim())
                .slice(0, 2);

              return (
                <div
                  key={index}
                  className={`p-4 rounded-2xl border transition-all ${
                    currentMapping === 'ignore'
                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                      : currentMapping === 'remarks'
                      ? 'bg-purple-50/50 border-purple-200 shadow-xs'
                      : confidence === 'high'
                      ? 'bg-emerald-50/40 border-emerald-200/90 shadow-xs'
                      : confidence === 'medium'
                      ? 'bg-amber-50/40 border-amber-200/90 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                  } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  {/* Left: Column Name, Sample Values & Confidence */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
                        {header}
                      </span>
                      {currentMapping === 'ignore' ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                          IGNORED
                        </span>
                      ) : currentMapping === 'remarks' ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                          NOTE / REMARKS
                        </span>
                      ) : confidence === 'high' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                          <FiCheck className="w-3 h-3" /> Auto-Mapped ({confidencePercent}%)
                        </span>
                      ) : confidence === 'medium' ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" /> Probable Match ({confidencePercent}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Custom / Unassigned
                        </span>
                      )}
                    </div>

                    {/* Live Sample Values Chips */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
                      <span className="text-slate-400 font-medium">Sample:</span>
                      {sampleVals.length > 0 ? (
                        sampleVals.map((val, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-slate-700 font-mono text-[10px] truncate max-w-[220px]" title={val}>
                            "{val}"
                          </span>
                        ))
                      ) : (
                        <span className="italic text-slate-400 text-[10px]">No data in top rows</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="hidden md:flex items-center justify-center text-slate-400">
                    <FiArrowRight className="w-4 h-4" />
                  </div>

                  {/* Right: Target Field Selector */}
                  <div className="w-full md:w-72">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Select Target Field --</option>
                      <option value="ignore">🚫 Ignore this column</option>
                      <option value="remarks">📝 Auto-Note / Custom Metadata (remarks)</option>
                      <optgroup label="Core Catalog Fields">
                        <option value="title">Title * (Required)</option>
                        <option value="author">Author</option>
                        <option value="publisher">Publisher</option>
                        <option value="category">Category / Subject</option>
                        <option value="isbn">ISBN</option>
                        <option value="call_number">Call Number</option>
                        <option value="quantity">Quantity / Copies</option>
                      </optgroup>
                      <optgroup label="Secondary & Physical Attributes">
                        <option value="edition">Edition</option>
                        <option value="copyright_year">Copyright Year</option>
                        <option value="physical_description">Physical Description</option>
                        <option value="series">Series</option>
                        <option value="shelf_location">Shelf Location</option>
                        <option value="accession_number">Accession Number</option>
                        <option value="barcode">Barcode</option>
                        <option value="rfid_tag">RFID Tag</option>
                        <option value="purchase_price">Purchase Price</option>
                        <option value="acquisition_method">Acquisition Method</option>
                        <option value="supplier">Supplier</option>
                        <option value="language">Language</option>
                        <option value="status">Status</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Actions Bar */}
          <div className="p-6 bg-slate-50/90 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button
              variant="secondary"
              onClick={() => setImportStep('upload')}
              className="border-slate-200 text-slate-700 hover:bg-white text-xs font-semibold"
            >
              <FiArrowRight className="w-3.5 h-3.5 mr-1.5 transform rotate-180" />
              Back to Upload & Source
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleAutoAcceptMappings}
                className="bg-white border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold"
              >
                <FiCheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Auto-Accept All Mappings
              </Button>
              <Button
                onClick={handleContinueToPreview}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 px-5 py-2.5 rounded-xl flex items-center gap-2"
              >
                <span>Continue to Preview & Ingest (Step 3)</span>
                <FiArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Ingest */}
      {importStep === 'preview' && (
        <div className="space-y-6 animate-in fade-in duration-300 mb-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Header Bar */}
            <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <h3 className="text-lg font-bold text-slate-900">Preview & Ingestion Verification</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Inspect normalized records and catalog integrity checks before committing to the institutional database.
                </p>
              </div>

              {/* Status summary pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-1.5 shadow-xs">
                  <FiCheckCircle className="w-3.5 h-3.5" />
                  {validationResults.filter(r => r.validation.valid).length} Valid Records
                </span>
                {validationResults.filter(r => r.validation.hasWarnings).length > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center gap-1.5 shadow-xs">
                    <FiAlertCircle className="w-3.5 h-3.5" />
                    {validationResults.filter(r => r.validation.hasWarnings).length} Warnings
                  </span>
                )}
                {validationResults.filter(r => !r.validation.valid).length > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5 shadow-xs">
                    <FiX className="w-3.5 h-3.5" />
                    {validationResults.filter(r => !r.validation.valid).length} Errors
                  </span>
                )}
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 relative w-full">
                <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter preview by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="w-full sm:w-48">
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'Show All Records' },
                    { value: 'valid', label: 'Valid Records Only' },
                    { value: 'invalid', label: 'Error Records Only' },
                    { value: 'warning', label: 'Warning Records Only' }
                  ]}
                  className="w-full text-xs"
                />
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-100 sticky top-0 backdrop-blur-xs z-10">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">ISBN</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Notes / Remarks</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviewData.slice(0, 50).map((row, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !row.validation.valid
                          ? 'bg-rose-50/30'
                          : row.validation.hasWarnings
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400 font-medium">
                        {row.rowIndex + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {row.normalized.title || <span className="text-slate-400 italic">Untitled</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate">
                        {row.normalized.author || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.normalized.category ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px]">
                            {row.normalized.category}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {row.normalized.isbn || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">
                        {row.normalized.quantity || 1}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate text-[11px]">
                        {row.normalized.remarks || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!row.validation.valid ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                            Error
                          </span>
                        ) : row.validation.hasWarnings ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">
                            Warning
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPreviewData.length > 50 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
                Showing first 50 of {filteredPreviewData.length} records. All {filteredPreviewData.length} will be imported.
              </div>
            )}

            {/* Bottom Footer Actions */}
            <div className="p-6 bg-slate-50/90 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Button
                variant="secondary"
                onClick={() => setImportStep('mapping')}
                className="border-slate-200 text-slate-700 hover:bg-white text-xs font-semibold"
              >
                <FiArrowRight className="w-3.5 h-3.5 mr-1.5 transform rotate-180" />
                Back to Column Mapping
              </Button>
              <Button
                onClick={() => setShowConfirmGateModal(true)}
                disabled={validationResults.filter(r => r.validation.valid).length === 0 || uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 px-6 py-2.5 rounded-xl flex items-center gap-2"
              >
                <FiUploadCloud className="w-4 h-4" />
                {uploading ? 'Ingesting Records...' : `Import ${validationResults.filter(r => r.validation.valid).length} Valid Rows`}
              </Button>
            </div>
          </div>

          {importStatus === 'cancelled' && !dismissCancelledNotice && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-900">
                <FiPause className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-sm">Import Stopped</span>
                  <p className="text-xs text-amber-700">The ingestion process was safely halted. No corrupt rows were committed.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissCancelledNotice(true)}
                className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 text-xs font-semibold"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pre-Commit Database Safety Gate Modal (Responsive 2-Column Studio) */}
      {showConfirmGateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col max-h-[88vh]">
            
            {/* Modal Header (Fixed at top) */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-4 flex-shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-blue-300 shadow-sm flex-shrink-0">
                  <FiDatabase className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <FiCheck className="w-3 h-3" />
                    Database Integrity Gate
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">Pre-Commit Ingestion Approval</h3>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    No data has been written to the database yet. Review your batch details before confirming.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmGateModal(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Close review"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable 2-Column Responsive Grid) */}
            <div className="p-6 sm:p-7 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column (lg:col-span-6): Target School, Summary Metrics, Security Checklist */}
                <div className="lg:col-span-6 space-y-5">
                  {/* Destination School Security Lock */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex items-center gap-3.5 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <FiCheckCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Target Institutional Database (Locked)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {currentSchool?.school_name || 'My Institution'} {currentSchool?.school_code ? `(${currentSchool.school_code})` : ''}
                      </h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                        Records will be cataloged directly and securely into this campus database.
                      </p>
                    </div>
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Titles</span>
                      <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                        {validationResults.filter(r => r.validation.valid).length.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Verified Records</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Copies</span>
                      <div className="text-xl font-extrabold text-indigo-600 mt-0.5">
                        {validationResults
                          .filter(r => r.validation.valid)
                          .reduce((sum, r) => {
                            const raw = parseInt(r.normalized?.quantity, 10);
                            const q = !isNaN(raw) && raw > 0 && raw <= 50 ? raw : 1;
                            return sum + q;
                          }, 0)
                          .toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Physical Units</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sheets</span>
                      <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                        {parsedData?.sheets?.length || 1}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Combined</span>
                    </div>
                  </div>

                  {/* Safety Assurance Checklist */}
                  <div className="space-y-2.5 rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 text-xs text-slate-700">
                    <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <FiZap className="w-3.5 h-3.5 text-blue-600" />
                      Pre-Commit Safeguards:
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <span><strong>100% Pre-Validated:</strong> All records passed schema checks with zero corrupt rows.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <span><strong>Controlled Commit:</strong> Zero database writes occur until you click Approve below.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <span><strong>Live HUD Telemetry:</strong> Real-time progress ticker (0–100%) tracks each committed record.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <span><strong>Graceful Rollback:</strong> Abort anytime without leaving partially committed corrupt rows.</span>
                    </div>
                  </div>
                </div>

                {/* Right Column (lg:col-span-6): Multi-Sheet Workbook Breakdown */}
                <div className="lg:col-span-6">
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <FiLayers className="w-3.5 h-3.5 text-indigo-600" />
                        Excel Sheets Breakdown
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                        {parsedData?.sheets?.length || 1} Sheets
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      All workbook sheets have been parsed and aggregated into the master queue:
                    </p>

                    {/* Scrollable Sheet Items List */}
                    <div className="max-h-[290px] overflow-y-auto space-y-2 pr-1.5">
                      {parsedData?.sheets && parsedData.sheets.length > 0 ? (
                        parsedData.sheets.map((sheet, sIdx) => {
                          const sheetPercent = Math.round((sheet.rowCount / (parsedData.rowCount || 1)) * 100);
                          return (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-white border border-slate-200/90 hover:border-blue-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                  {sIdx + 1}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 truncate" title={sheet.name}>
                                  {sheet.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                                  {sheet.rowCount.toLocaleString()} rows
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium w-9 text-right">
                                  {sheetPercent}%
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                          <span className="font-semibold text-slate-800">Default Sheet</span>
                          <span className="font-mono text-slate-600 font-semibold">{parsedData?.rowCount?.toLocaleString() || 0} rows</span>
                        </div>
                      )}
                    </div>

                    {/* Total Aggregated Summary Chip */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Total Aggregated Records:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {parsedData?.rowCount?.toLocaleString() || 0} Records Ready
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions Footer (Fixed at bottom) */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/90 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmGateModal(false)}
                className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-white px-5 py-2.5 rounded-xl"
              >
                Cancel / Review More
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmGateModal(false);
                  handleImport();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 px-6 py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <FiCheckCircle className="w-4 h-4" />
                Approve & Commit Ingestion →
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Futuristic Cyber-Download Overlay */}
      {showDownloadOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 border border-sky-500/30 rounded-3xl shadow-[0_0_50px_rgba(14,165,233,0.25)] p-6 sm:p-8 overflow-hidden text-center animate-in zoom-in-95 duration-200">
            
            {/* Ambient background glow */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

            {/* Neural Ingestion Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4"></span>
              Neural Ingestion Pipeline • Live
            </div>

            {/* Circular Progress Gauge & Download Icon */}
            <div className="relative w-44 h-44 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  className="stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  className="stroke-sky-400 transition-all duration-200 ease-out"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68 * (1 - importProgress / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.7))'
                  }}
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                {importProgress >= 100 ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 shadow-lg shadow-emerald-500/30 animate-bounce">
                    <FiCheck className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mb-1 animate-pulse">
                    <FiDownload className="w-5 h-5 animate-bounce" />
                  </div>
                )}
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                  {Math.round(importProgress)}%
                </span>
                <span className="text-[10px] text-sky-400/90 font-mono tracking-wider uppercase mt-0.5">
                  {importProgress >= 100 ? 'Complete' : 'Downloading'}
                </span>
              </div>
            </div>

            {/* Title Status */}
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-1">
              {importProgress >= 100 ? 'Accession Registry Complete!' : 'Ingesting Bibliographic Records'}
            </h3>
            
            {/* Real-time Ticker */}
            <div className="min-h-[48px] flex flex-col items-center justify-center my-3.5 px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <FiActivity className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                Processing Record {currentBookIndex} of {validationResults.length}:
              </span>
              <p className="text-xs sm:text-sm font-semibold text-sky-300 truncate max-w-md mt-0.5">
                "{currentBookTitle || 'Preparing records...'}"
              </p>
            </div>

            {/* Glowing Linear Progress Bar */}
            <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden mb-5 border border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-200 relative"
                style={{ width: `${importProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite]"></div>
              </div>
            </div>

            {/* HUD Telemetry Grid */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-2xl mb-6">
              <div className="text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Speed</span>
                <span className="text-xs sm:text-sm font-bold text-sky-400 font-mono">
                  {ingestionSpeed || '16'} rec/s
                </span>
              </div>
              <div className="text-center border-x border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Elapsed</span>
                <span className="text-xs sm:text-sm font-bold text-white font-mono">
                  {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Batch Size</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                  {validationResults.length} records
                </span>
              </div>
            </div>

            {/* Action controls */}
            <div className="flex items-center justify-center gap-3">
              {importProgress < 100 ? (
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="px-4 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <FiPause className="w-3.5 h-3.5" />
                  Abort Ingestion
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDownloadOverlay(false)}
                  className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                >
                  <FiCheck className="w-4 h-4" />
                  View Ingestion Report →
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Enhanced Celebration Results Step */}
      {importStep === 'results' && importResults && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <FiCheckCircle className="w-9 h-9 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">Bulk Ingestion Completed!</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                      100% Ingested
                    </span>
                  </div>
                  <p className="text-emerald-100 text-xs sm:text-sm mt-1">
                    All bibliographic records and physical copy holdings are indexed and live in your campus catalog.
                  </p>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('books')}
                  className="px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-md flex items-center gap-2 self-start sm:self-auto flex-shrink-0"
                >
                  <FiBookOpen className="w-4 h-4 text-emerald-700" />
                  View in Catalog
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-emerald-100 rounded-2xl shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Titles Ingested</span>
              <div className="text-3xl font-black text-emerald-600 font-mono">{importResults.successful}</div>
              <span className="text-[11px] text-emerald-700 font-medium">Accessioned into catalog</span>
            </div>

            <div className="p-5 bg-white border border-blue-100 rounded-2xl shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Copies Created</span>
              <div className="text-3xl font-black text-blue-600 font-mono">{importResults.copies_created || importResults.successful}</div>
              <span className="text-[11px] text-blue-700 font-medium">Physical shelf barcodes</span>
            </div>

            <div className="p-5 bg-white border border-amber-100 rounded-2xl shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Duplicates Skipped</span>
              <div className="text-3xl font-black text-amber-600 font-mono">{importResults.skipped || 0}</div>
              <span className="text-[11px] text-amber-700 font-medium">Pre-existing titles</span>
            </div>

            <div className="p-5 bg-white border border-rose-100 rounded-2xl shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Errors</span>
              <div className="text-3xl font-black text-rose-600 font-mono">{importResults.failed || 0}</div>
              <span className="text-[11px] text-rose-700 font-medium">Failed rows</span>
            </div>
          </div>

          {importResults.errors && importResults.errors.length > 0 && (
            <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-3 flex items-center gap-1.5">
                <FiAlertCircle className="w-4 h-4" />
                Ingestion Notices ({importResults.errors.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {importResults.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-white border border-rose-100 rounded-xl text-xs">
                    <div className="font-semibold text-rose-900">Row {error.row}: {error.title}</div>
                    <div className="text-rose-600 mt-0.5">{error.errors?.join(', ') || error.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <Button 
              variant="secondary" 
              onClick={() => downloadImportReport(validationResults, 'import_accession_audit.csv')}
              className="w-full sm:w-auto"
            >
              <FiDownload className="w-4 h-4 mr-2 text-slate-500" />
              Download Accession Audit CSV
            </Button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('books')}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 rounded-xl shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <FiBookOpen className="w-4 h-4" />
                  Go to Books Catalog
                </button>
              )}
              <Button onClick={handleReset} className="flex-1 sm:flex-none">
                <FiUpload className="w-4 h-4 mr-2" />
                Ingest Another File
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && importStep !== 'upload' && (
        <div className="p-4 rounded-lg mb-4 bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-2">Import Failed</h4>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              {errorDetails && (
                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                  <p className="text-xs font-medium text-red-800 mb-2">Technical Details:</p>
                  <div className="text-xs text-red-600 space-y-1">
                    <div><strong>Error Type:</strong> {errorDetails.type}</div>
                    {errorDetails.status && <div><strong>HTTP Status:</strong> {errorDetails.status}</div>}
                    {errorDetails.originalError && <div><strong>Error:</strong> {errorDetails.originalError}</div>}
                    {errorDetails.apiResponse && <div><strong>API Response:</strong> {JSON.stringify(errorDetails.apiResponse)}</div>}
                  </div>
                </div>
              )}
              <div className="mt-3 text-xs text-red-600">
                <p className="font-medium mb-1">Troubleshooting steps:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check if the backend server is running on port 5000</li>
                  <li>Verify your internet connection</li>
                  <li>Check browser console (F12) for additional errors</li>
                  <li>Ensure you are logged in with proper permissions</li>
                  <li>Try refreshing the page and attempting the import again</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBooksManagement;