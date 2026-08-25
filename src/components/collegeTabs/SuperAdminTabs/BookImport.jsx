import { useState, useEffect } from 'react';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText } from 'react-icons/fi';
import api from '../../../utils/api';
import { PageHeader, Button, Card, Select, StatusBadge } from '../../ui';

function BookImport({ darkMode }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(true);

  useEffect(() => {
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validExtensions = ['.csv', '.xlsx'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Please upload a CSV or Excel (.xlsx) file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (!selectedSchool) {
      setError('Please select a school first');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      // Parse the file locally first
      const { parseImportFile, detectColumnMapping, normalizeBookData, validateImportRow } = await import('../../../utils/bookImportUtils');
      
      const parsed = await parseImportFile(file);
      
      // Auto-detect column mappings
      const autoMapping = {};
      parsed.headers.forEach(header => {
        const detectedField = detectColumnMapping(header);
        if (detectedField) {
          autoMapping[header] = detectedField;
        }
      });
      
      // Normalize data
      const normalizedData = parsed.data.map((row, index) => {
        const normalizedRow = normalizeBookData(row, autoMapping);
        const validation = validateImportRow(normalizedRow, index, []);
        return {
          normalized: normalizedRow,
          validation: validation
        };
      });
      
      // Filter valid rows
      const validRows = normalizedData.filter(r => r.validation.valid).map(r => r.normalized);
      
      if (validRows.length === 0) {
        setError('No valid rows to import');
        setUploading(false);
        return;
      }

      const response = await api.post('/books/bulk-import', {
        data: validRows,
        column_mapping: autoMapping,
        school_id: selectedSchool,
        user_id: localStorage.getItem('currentUserId')
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          imported: data.results?.successful || 0,
          errors: data.results?.errors || [],
          success: true
        });
      } else {
        throw new Error(data.message || 'Import failed');
      }
    } catch (err) {
      setError('Import failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (format = 'csv') => {
    const headers = ['title', 'author', 'publisher', 'isbn', 'call_number', 'edition', 'publication_year', 'physical_description', 'series_title', 'general_note', 'shelf_location', 'remarks'];
    const sampleData = [
      ['Sample Book Title', 'John Doe', 'Sample Publisher', '978-0-123456-78-9', '123.45 SAM 2024', '1st', '2024', 'xii, 300 p. ; 23 cm.', 'Sample Series', 'General note about the book', 'A-101', 'Additional remarks'],
      ['Another Book', 'Jane Smith', 'Another Publisher', '978-0-987654-32-1', '456.78 ANO 2024', '2nd', '2023', 'x, 250 p. ; 21 cm.', '', 'Another general note', 'B-201', '']
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
      // For Excel, we'll create a simple HTML table that Excel can open
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

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Import Books"
        description="Bulk import books from CSV or Excel files"
      />

      <Card padding="md" className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-slate-700">
          <li>Select a school from the dropdown</li>
          <li>Download the CSV or Excel template below</li>
          <li>Fill in the book data following the template format</li>
          <li>Upload the completed file (CSV or Excel)</li>
          <li>Review the import results</li>
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload CSV File</h3>
        
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

        <div className="mb-4">
          <label htmlFor="csv_file" className="block text-sm font-medium text-slate-700 mb-2">
            Select CSV or Excel File
          </label>
          <input
            id="csv_file"
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-200"
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-slate-100">
            <FiFileText className="w-5 h-5 text-slate-600" />
            <span className="text-sm text-slate-900">{file.name}</span>
            <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(2)} KB)</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-red-50 text-red-700">
            <FiAlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || uploading}>
          <FiUpload className="w-4 h-4" />
          {uploading ? 'Importing...' : 'Import Books'}
        </Button>
      </Card>

      {result && (
        <Card padding="md">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-green-500" />
            Import Results
          </h3>
          
          <div className="p-4 rounded-lg mb-4 bg-green-50">
            <p className="text-lg font-bold text-green-700">
              {result.imported} books imported successfully
            </p>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">
                Errors ({result.errors.length}):
              </h4>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {result.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default BookImport;
