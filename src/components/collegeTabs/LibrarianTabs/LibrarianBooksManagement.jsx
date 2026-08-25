import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText, FiArrowRight, FiX, FiEye, FiFilter, FiSearch, FiLoader, FiPause } from 'react-icons/fi';
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

function AdminBooksManagement({ darkMode }) {
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
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      setSelectedSchool(schoolId);
      fetchExistingAccessionNumbers(schoolId);
    }
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data || []);
      setLoadingSchools(false);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setLoadingSchools(false);
    }
  };

  const fetchExistingAccessionNumbers = async (schoolId) => {
    try {
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      const accessionNumbers = response.data?.map(book => book.accession_number).filter(Boolean) || [];
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
      
      // Auto-advance to preview if all required fields are mapped
      // Note: School comes from dropdown selection, not from file
      // Be more lenient - skip mapping step if we have the required fields even with some unmapped columns
      if (mappedRequired.length === requiredFields.length) {
        console.log('[FRONTEND] All required fields auto-mapped, skipping to preview');
        setImportStep('preview');
      } else {
        console.log('[FRONTEND] Showing mapping step for review');
        setImportStep('mapping');
      }
      
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
      setImportCancelled(true);
      setImportStatus('cancelled');
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedSchool) {
      setError('Please select a school first');
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
    setImportStatus('importing');
    setImportProgress(0);
    setImportCancelled(false);
    abortControllerRef.current = new AbortController();

    try {
      console.log('[FRONTEND] Starting import process');
      console.log('[FRONTEND] Total rows:', allRows.length);
      console.log('[FRONTEND] School ID:', selectedSchool);
      console.log('[FRONTEND] Column mapping:', columnMapping);

      const importData = allRows.map(row => {
        // Remove school from row since it comes from dropdown
        const { school, ...dataWithoutSchool } = row.normalized;
        console.log('[FRONTEND] Row data:', row.normalized);
        console.log('[FRONTEND] Author in row:', row.normalized.author);
        return dataWithoutSchool;
      });
      
      console.log('[FRONTEND] Sample import data:', importData[0]);
      console.log('[FRONTEND] Author in sample:', importData[0]?.author);
      
      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 500);

      const response = await api.post('/books/bulk-import', {
        data: importData,
        column_mapping: columnMapping,
        school_id: selectedSchool,
        user_id: localStorage.getItem('currentUserId')
      }, {
        signal: abortControllerRef.current.signal
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      console.log('[FRONTEND] Import response received:', response);

      setImportResults(response.results);
      setImportStep('results');
      setImportStatus('completed');
    } catch (err) {
      clearInterval(progressInterval);
      
      if (err.name === 'AbortError' || importCancelled) {
        console.log('[FRONTEND] Import cancelled by user');
        setError('Import was cancelled');
        setImportStatus('cancelled');
      } else {
        console.error('[FRONTEND] Import error:', err);
        console.error('[FRONTEND] Error details:', {
          message: err.message,
          status: err.status,
          data: err.data,
          response: err.response
        });

        // Determine specific error message
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
      }
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
    <div className="animate-slide-up">
      <PageHeader
        title="Books Management"
        description="Bulk import books from CSV or Excel files"
      />

      {/* Upload Step */}
      {importStep === 'upload' && (
        <>
          <Card padding="md" className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>Download the CSV or Excel template below</li>
              <li>Fill in the book data (column names can vary - system will auto-detect)</li>
              <li>Upload the completed file (CSV or Excel)</li>
              <li>Review and adjust column mappings if needed</li>
              <li>Preview and validate data before importing</li>
            </ol>
          </Card>

          <Card padding="md" className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Download Template</h3>
            <div className="flex gap-3">
              <Button onClick={() => downloadTemplate('csv')}>
                <FiDownload className="w-4 h-4" />
                Download CSV Template
              </Button>
              <Button variant="secondary" onClick={() => downloadTemplate('excel')}>
                <FiDownload className="w-4 h-4" />
                Download Excel Template
              </Button>
            </div>
          </Card>

          <Card padding="md" className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload File</h3>
            
            <div className="mb-4">
              <Select
                label="Select School"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                disabled={loadingSchools}
                options={[
                  { value: '', label: '-- Select a School --' },
                  ...schools.map((school) => ({ value: school.school_id, label: `${school.school_name} (${school.school_code})` }))
                ]}
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FiUpload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-700 font-medium mb-2">Drag & Drop your file here</p>
                <p className="text-slate-500 text-sm mb-4">or Browse Files</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
                  <FiUpload className="w-4 h-4" />
                  Select File
                </div>
                <p className="text-slate-400 text-xs mt-4">.csv, .xlsx, .xls</p>
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 rounded-lg mt-4 bg-slate-100">
                <div className="flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-900">{file.name}</span>
                  <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            )}

            {importStatus === 'uploading' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Uploading and parsing file...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg mt-4 bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800 mb-1">Upload Failed</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Column Mapping Step */}
      {importStep === 'mapping' && parsedData && (
        <Card padding="md" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Column Mapping</h3>
            <div className="text-sm text-slate-600">
              File: {file.name} | Rows detected: {parsedData.rowCount}
            </div>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Smart Auto-Mapping:</strong> The system has automatically detected and mapped your columns using AI-powered pattern recognition. 
              High-confidence mappings are shown in green. Review unmapped columns (if any) and click "Auto-Accept All" to proceed, or adjust manually.
            </p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {parsedData.headers.map((header, index) => {
              const currentMapping = columnMapping[header] || '';
              const confidence = getMappingConfidence(header, currentMapping);
              const confidencePercent = getMappingConfidencePercentage(header, currentMapping);
              const detected = detectColumnMapping(header);
              
              return (
                <div key={index} className={`flex items-center gap-4 p-3 rounded-lg ${
                  currentMapping === 'ignore' ? 'bg-slate-100' : 
                  confidence === 'high' ? 'bg-green-50' : 
                  confidence === 'medium' ? 'bg-yellow-50' : 
                  confidence === 'low' ? 'bg-orange-50' : 'bg-slate-50'
                }`}>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{header}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      {confidence === 'high' && (
                        <>
                          <span className="text-green-600">✓ Auto-mapped ({confidencePercent}%)</span>
                          <span className="text-green-500">High confidence</span>
                        </>
                      )}
                      {confidence === 'medium' && (
                        <>
                          <span className="text-yellow-600">⚠ Probable match ({confidencePercent}%)</span>
                          <span className="text-yellow-500">Medium confidence</span>
                        </>
                      )}
                      {confidence === 'low' && (
                        <>
                          <span className="text-orange-600">⚠ Possible match ({confidencePercent}%)</span>
                          <span className="text-orange-500">Low confidence</span>
                        </>
                      )}
                      {!confidence && (
                        <>
                          <span className="text-slate-400">✕ Unrecognized</span>
                          <span className="text-slate-400">No match found</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <FiArrowRight className="w-4 h-4 text-slate-400" />
                  
                  <div className="flex-1">
                    <Select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      options={[
                        { value: '', label: '-- Select Field --' },
                        { value: 'ignore', label: 'Ignore Column' },
                        ...availableFields
                      ]}
                      className="text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={handleReset}>
              <FiX className="w-4 h-4" />
              Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleAutoAcceptMappings}>
                <FiCheckCircle className="w-4 h-4 mr-2" />
                Auto-Accept All
              </Button>
              <Button onClick={handleContinueToPreview}>
                Continue to Preview
                <FiArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Preview Step */}
      {importStep === 'preview' && (
        <>
          <Card padding="md" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Preview Data</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {validationResults.filter(r => r.validation.valid).length} valid
                </span>
                <span className="text-yellow-600 font-medium">
                  {validationResults.filter(r => r.validation.hasWarnings).length} warnings
                </span>
                <span className="text-red-600 font-medium">
                  {validationResults.filter(r => !r.validation.valid).length} errors
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Rows' },
                  { value: 'valid', label: 'Valid Only' },
                  { value: 'invalid', label: 'Errors Only' },
                  { value: 'warning', label: 'Warnings Only' }
                ]}
                className="w-40"
              />
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Row</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Title</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Author</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Category</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">ISBN</th>
                     <th className="px-4 py-2 text-left font-medium text-slate-700">Quantity</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewData.slice(0, 50).map((row, index) => (
                    <tr key={index} className={`border-t border-slate-100 ${!row.validation.valid ? 'bg-red-50' : row.validation.hasWarnings ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-2 text-slate-600">{row.rowIndex + 1}</td>
                      <td className="px-4 py-2 text-slate-900 font-medium">{row.normalized.title || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{row.normalized.author || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{row.normalized.category || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{row.normalized.isbn || '-'}</td>
                       <td className="px-4 py-2 text-slate-600">{row.normalized.quantity || '-'}</td>
                      <td className="px-4 py-2">
                        {!row.validation.valid ? (
                          <span className="text-red-600 text-xs">Error</span>
                        ) : row.validation.hasWarnings ? (
                          <span className="text-yellow-600 text-xs">Warning</span>
                        ) : (
                          <span className="text-green-600 text-xs">Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPreviewData.length > 50 && (
              <p className="text-sm text-slate-500 mt-2">Showing first 50 of {filteredPreviewData.length} rows</p>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setImportStep('mapping')}>
              <FiArrowRight className="w-4 h-4 mr-2 transform rotate-180" />
              Back to Mapping
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validationResults.filter(r => r.validation.valid).length === 0 || uploading}
            >
              <FiUpload className="w-4 h-4 mr-2" />
              {uploading ? 'Importing...' : `Import ${validationResults.filter(r => r.validation.valid).length} Valid Rows`}
            </Button>
          </div>

          {importStatus === 'importing' && (
            <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <FiLoader className="w-6 h-6 text-blue-600 animate-spin" />
                    <div className="absolute inset-0 w-6 h-6 border-2 border-blue-200 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">Importing Books</h4>
                    <p className="text-xs text-blue-600">Processing {validationResults.length} records...</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-700">{Math.round(importProgress)}%</div>
                  <div className="text-xs text-blue-500">Complete</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${importProgress}%` }}
                  >
                    <div className="h-full w-full animate-pulse bg-white/20"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <FiFileText className="w-4 h-4" />
                  <span>{file?.name}</span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleCancelImport}
                  className="bg-white/80 hover:bg-white border-red-200 text-red-600 hover:text-red-700"
                >
                  <FiPause className="w-4 h-4 mr-2" />
                  Cancel Import
                </Button>
              </div>
            </div>
          )}

          {importStatus === 'cancelled' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800">
                <FiPause className="w-5 h-5" />
                <div>
                  <span className="font-medium">Import Cancelled</span>
                  <p className="text-sm text-yellow-600">The import process was cancelled by the user.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Results Step */}
      {importStep === 'results' && importResults && (
        <Card padding="md" className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Import Completed</h3>
              <p className="text-sm text-slate-600">Review the results below</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">{importResults.successful}</div>
              <div className="text-sm text-green-600">Successfully Imported</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{importResults.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-700">{importResults.skipped}</div>
              <div className="text-sm text-yellow-600">Skipped/Duplicates</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">{importResults.copies_created}</div>
              <div className="text-sm text-blue-600">Copies Created</div>
            </div>
          </div>

          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Errors ({importResults.errors.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {importResults.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg text-sm">
                    <div className="font-medium text-red-800">Row {error.row}: {error.title}</div>
                    <div className="text-red-600">{error.errors.join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => downloadImportReport(validationResults, 'import_error_report.csv')}>
              <FiDownload className="w-4 h-4 mr-2" />
              Download Error Report
            </Button>
            <Button onClick={handleReset}>
              <FiUpload className="w-4 h-4 mr-2" />
              Import Another File
            </Button>
          </div>
        </Card>
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