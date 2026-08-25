import { useState, useEffect } from 'react';
import { FiBook, FiEdit, FiTrash2, FiPlus, FiUpload, FiDownload, FiFilter, FiX } from 'react-icons/fi';
import api from '../../../utils/api';
import { ConfirmationOverlay, LoadingOverlay, AlertOverlay } from '../../common';
import useAlert from '../../../hooks/useAlert';
import Card from "../../ui/Card";
import Input from "../../ui/Input";

function LibrarianAdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    author: '', 
    publisher: '', 
    isbn: '', 
    call_number: '', 
    edition: '', 
    publication_year: '', 
    physical_description: '', 
    series_title: '', 
    general_note: '', 
    shelf_location: '', 
    remarks: '' 
  });
  const { alert, showSuccess, showError, hideAlert } = useAlert();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  
  // Import state
  const [importFile, setImportFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  
  const schoolId = localStorage.getItem('schoolId');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await api.get(`/books/school/${schoolId}`);
      setBooks(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching books:', error);
      setLoading(false);
    }
  };

  const handleAddBook = async () => {
    try {
      const bookData = {
        ...formData,
        school_id: schoolId
      };
      await api.post('/books', bookData);
      await fetchBooks();
      setShowAddModal(false);
      resetForm();
      showSuccess('Book added successfully!');
    } catch (error) {
      console.error('Error adding book:', error);
      showError('Failed to add book. Please try again.');
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      isbn: book.isbn,
      call_number: book.call_number,
      edition: book.edition,
      publication_year: book.publication_year,
      physical_description: book.physical_description,
      series_title: book.series_title,
      general_note: book.general_note,
      shelf_location: book.shelf_location,
      remarks: book.remarks
    });
    setShowAddModal(true);
  };

  const handleUpdateBook = async () => {
    try {
      await api.put(`/books/${editingBook.id}`, formData);
      await fetchBooks();
      setShowAddModal(false);
      setEditingBook(null);
      resetForm();
      showSuccess('Book updated successfully!');
    } catch (error) {
      console.error('Error updating book:', error);
      showError('Failed to update book. Please try again.');
    }
  };

  const handleDeleteBook = (book) => {
    setBookToDelete(book);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      await api.delete(`/books/${bookToDelete.id}`);
      await fetchBooks();
      showSuccess('Book deleted successfully!');
    } catch (error) {
      console.error('Error deleting book:', error);
      showError('Failed to delete book. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      author: '', 
      publisher: '', 
      isbn: '', 
      call_number: '', 
      edition: '', 
      publication_year: '', 
      physical_description: '', 
      series_title: '', 
      general_note: '', 
      shelf_location: '', 
      remarks: '' 
    });
  };

  // Import functionality
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validExtensions = ['.csv', '.xlsx'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setImportError('Please upload a CSV or Excel (.xlsx) file');
        setImportFile(null);
        return;
      }
      setImportFile(selectedFile);
      setImportError('');
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!importFile) {
      setImportError('Please select a file first');
      return;
    }

    setUploading(true);
    setImportError('');
    setImportResult(null);

    try {
      // Parse the file locally first
      const { parseImportFile, detectColumnMapping, normalizeBookData, validateImportRow } = await import('../../../utils/bookImportUtils');
      
      const parsed = await parseImportFile(importFile);
      
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
        setImportError('No valid rows to import');
        setUploading(false);
        return;
      }

      const response = await api.post('/books/bulk-import', {
        data: validRows,
        column_mapping: autoMapping,
        school_id: schoolId,
        user_id: localStorage.getItem('currentUserId')
      });

      const data = await response.json();
      
      if (data.success) {
        setImportResult({
          imported: data.results?.successful || 0,
          errors: data.results?.errors || [],
          success: true
        });
        await fetchBooks();
        showSuccess(`${data.results?.successful || 0} books imported successfully!`);
      } else {
        throw new Error(data.message || 'Import failed');
      }
    } catch (err) {
      setImportError('Import failed: ' + err.message);
      showError('Import failed. Please try again.');
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
      <LoadingOverlay show={loading} text="Loading books..." />
      
      {/* Header Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">Books Management</h2>
            <p className="text-[#64748B] text-sm">Manage library books for your school</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#2563EB] rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              <FiUpload className="w-4 h-4" />
              <span className="text-sm">Import Books</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              <FiPlus className="w-4 h-4" />
              <span className="text-sm">Add Book</span>
            </button>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <div
            key={book.book_id || book.id || `${book.isbn}-${book.title}`}
            className="rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border-2 bg-white border-[#E2E8F0] hover:border-[#2563EB] group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiBook className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditBook(book)}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteBook(book)}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-[#0F172A]">{book.title}</h3>
            <p className="text-sm mb-3 text-[#64748B]">by {book.author}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {book.isbn || 'No ISBN'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {book.call_number || 'No Call Number'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
              <span className="text-xs font-medium text-[#64748B]">
                ID: {book.id}
              </span>
            </div>
          </div>
        ))}
      </div>

      {books.length === 0 && !loading && (
        <Card>
          <div className="rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiBook className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#0F172A]">No books found</h3>
            <p className="text-sm text-[#64748B]">Add your first book or import books in bulk</p>
          </div>
        </Card>
      )}

      {/* Add/Edit Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">
                {editingBook ? 'Edit Book' : 'Add New Book'}
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                {editingBook ? 'Update book information' : 'Fill in the book details below'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Book Title *</label>
                  <Input
                    type="text"
                    placeholder="Enter book title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Author *</label>
                  <Input
                    type="text"
                    placeholder="Author name"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Publisher</label>
                  <Input
                    type="text"
                    placeholder="Publisher name"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">ISBN</label>
                  <Input
                    type="text"
                    placeholder="ISBN number"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Call Number</label>
                  <Input
                    type="text"
                    placeholder="Call number"
                    value={formData.call_number}
                    onChange={(e) => setFormData({ ...formData, call_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Edition</label>
                  <Input
                    type="text"
                    placeholder="Edition"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Publication Year</label>
                  <Input
                    type="text"
                    placeholder="Year"
                    value={formData.publication_year}
                    onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Physical Description</label>
                  <Input
                    type="text"
                    placeholder="e.g., xii, 300 p. ; 23 cm."
                    value={formData.physical_description}
                    onChange={(e) => setFormData({ ...formData, physical_description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Series Title</label>
                  <Input
                    type="text"
                    placeholder="Series title"
                    value={formData.series_title}
                    onChange={(e) => setFormData({ ...formData, series_title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Shelf Location</label>
                  <Input
                    type="text"
                    placeholder="e.g., A-101"
                    value={formData.shelf_location}
                    onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">General Note</label>
                  <Input
                    type="text"
                    placeholder="General notes about the book"
                    value={formData.general_note}
                    onChange={(e) => setFormData({ ...formData, general_note: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Remarks</label>
                  <Input
                    type="text"
                    placeholder="Additional remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBook(null);
                  resetForm();
                }}
                className="px-6 py-2.5 rounded-xl border-2 border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingBook ? handleUpdateBook : handleAddBook}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all font-medium"
              >
                {editingBook ? 'Update Book' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Books Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Import Books</h3>
                <p className="text-blue-100 text-sm mt-1">Bulk import books from CSV or Excel</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="rounded-xl p-4 bg-[#F8FAFC]">
                <h4 className="font-semibold mb-3 text-[#0F172A]">Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-[#64748B]">
                  <li>Download the CSV or Excel template below</li>
                  <li>Fill in the book data following the template format</li>
                  <li>Upload the completed file (CSV or Excel)</li>
                  <li>Review the import results</li>
                </ol>
              </div>

              <div className="rounded-xl p-4 bg-[#F8FAFC]">
                <h4 className="font-semibold mb-3 text-[#0F172A]">Download Template</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadTemplate('csv')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiDownload className="w-4 h-4" />
                    <span className="text-sm font-medium">CSV Template</span>
                  </button>
                  <button
                    onClick={() => downloadTemplate('excel')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FiDownload className="w-4 h-4" />
                    <span className="text-sm font-medium">Excel Template</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-4 bg-[#F8FAFC]">
                <h4 className="font-semibold mb-3 text-[#0F172A]">Upload File</h4>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-[#0F172A]"
                />
                
                {importFile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg mt-3 bg-blue-50">
                    <span className="text-sm text-[#0F172A]">{importFile.name}</span>
                    <span className="text-xs text-[#64748B]">({(importFile.size / 1024).toFixed(2)} KB)</span>
                  </div>
                )}

                {importError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg mt-3 bg-red-100 text-red-700">
                    <span className="text-sm">{importError}</span>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!importFile || uploading}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiUpload className="w-4 h-4" />
                  <span className="text-sm font-medium">{uploading ? 'Importing...' : 'Import Books'}</span>
                </button>
              </div>

              {importResult && (
                <div className="rounded-xl p-4 bg-green-50">
                  <h4 className="font-semibold mb-3 text-[#0F172A]">Import Results</h4>
                  <p className="text-lg font-bold mb-2 text-green-700">
                    {importResult.imported} books imported successfully
                  </p>
                  {importResult.errors.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-2 text-[#0F172A]">
                        Errors ({importResult.errors.length}):
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-red-700">
                        {importResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationOverlay
        show={showDeleteConfirm}
        title="Delete Book"
        message={`Are you sure you want to delete "${bookToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Book"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteBook}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setBookToDelete(null);
        }}
      />

      <AlertOverlay
        show={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={hideAlert}
      />
    </div>
  );
}

export default LibrarianAdminBooks;
