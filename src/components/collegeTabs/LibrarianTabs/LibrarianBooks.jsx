import { useState, useEffect } from "react";
import { FiSearch, FiBook, FiMapPin, FiEdit, FiTrash2, FiGrid, FiList, FiMoreVertical, FiArchive, FiPlus, FiImage, FiX } from "react-icons/fi";
import api from "../../../utils/api";
import Card from "../../ui/Card";
import SearchBar from "../../ui/SearchBar";
import EmptyState from "../../ui/EmptyState";
import Button from "../../ui/Button";
import ConfirmationOverlay from "../../common/ConfirmationOverlay";
import ActionMenu from "../../common/ActionMenu";
import UndoToast from "../../common/UndoToast";

function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [editingBook, setEditingBook] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    edition: '',
    copyright_year: '',
    physical_description: '',
    series: '',
    remarks: '',
    shelf_location: '',
    cover_image: null,
    quantity: 1
  });
  const [addLoading, setAddLoading] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [editCoverImagePreview, setEditCoverImagePreview] = useState(null);
  const [editCoverImageFile, setEditCoverImageFile] = useState(null);

  const handleArchive = async (book) => {
    setArchiveConfirmation(book);
  };

  const confirmArchive = async () => {
    if (!archiveConfirmation) return;
    
    const book = archiveConfirmation;
    setArchiveConfirmation(null);
    setLastAction({
      type: 'archive',
      book,
      timeout: setTimeout(async () => {
        try {
          await api.put(`/books/${book.id}/archive`);
          setBooks((prev) => prev.filter((b) => b.id !== book.id));
        } catch (error) {
          console.error('Error archiving book:', error);
          alert('Failed to archive book');
        } finally {
          setLastAction(null);
        }
      }, 5000),
    });
  };

  useEffect(() => {
    const loadBooks = async () => {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) {
        console.error('No schoolId found in localStorage');
        setBooks([]);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/books/school?school_id=${schoolId}`);

        console.log('[LOAD BOOKS] Response:', response);
        console.log('[LOAD BOOKS] Response data:', response.data);

        // Handle different response structures
        let booksData = [];
        if (response.data && response.data.data && response.data.data.books) {
          booksData = response.data.data.books;
        } else if (response.data && response.data.books && Array.isArray(response.data.books)) {
          booksData = response.data.books;
        } else if (response.data && Array.isArray(response.data)) {
          booksData = response.data;
        }

        console.log('[LOAD BOOKS] Books data array:', booksData);

        const normalizedBooks = booksData.map((book) => ({
          id: book.book_id,
          title: book.title || 'Untitled',
          author: book.author || 'Unknown Author',
          publisher: book.publisher || 'Unknown Publisher',
          callNumber: book.call_number || 'Unknown',
          isbn: book.isbn || 'Unknown',
          year: book.publication_year || '',
          location: book.shelf_location || 'Library',
          cover_image: book.cover_image || ''
        }));

        setBooks(normalizedBooks);
        setLoading(false);
      } catch (error) {
        console.error('Unable to load books:', error);
        setBooks([]);
        setLoading(false);
      }
    };

    void loadBooks();
  }, []);

  const filteredBooks = books.filter(book =>
    book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (book) => {
    setEditingBook(book);
    setEditFormData({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      call_number: book.callNumber || '',
      edition: book.edition || '',
      copyright_year: book.year || '',
      physical_description: book.physical_description || '',
      series: book.series || '',
      remarks: book.remarks || '',
      cover_image: book.cover_image || ''
    });
    setEditCoverImagePreview(book.cover_image || null);
    setEditCoverImageFile(null);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    
    setEditLoading(true);
    try {
      // If there's a new cover image file, use FormData
      if (editCoverImageFile) {
        const formData = new FormData();
        formData.append('title', editFormData.title);
        formData.append('author', editFormData.author);
        if (editFormData.isbn) formData.append('isbn', editFormData.isbn);
        if (editFormData.call_number) formData.append('call_number', editFormData.call_number);
        if (editFormData.edition) formData.append('edition', editFormData.edition);
        if (editFormData.copyright_year) formData.append('copyright_year', parseInt(editFormData.copyright_year));
        if (editFormData.physical_description) formData.append('physical_description', editFormData.physical_description);
        if (editFormData.series) formData.append('series_title', editFormData.series);
        if (editFormData.remarks) formData.append('general_note', editFormData.remarks);
        formData.append('cover_image', editCoverImageFile);

        console.log('[FRONTEND] Sending update with FormData');
        await api.put(`/books/${editingBook.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Only send fields that actually exist on the books table
        const updateData = {};
        if (editFormData.title) updateData.title = editFormData.title;
        if (editFormData.author) updateData.author = editFormData.author;
        if (editFormData.isbn) updateData.isbn = editFormData.isbn;
        if (editFormData.call_number) updateData.call_number = editFormData.call_number;
        if (editFormData.edition) updateData.edition = editFormData.edition;
        if (editFormData.copyright_year) updateData.copyright_year = editFormData.copyright_year;
        if (editFormData.physical_description) updateData.physical_description = editFormData.physical_description;
        if (editFormData.series) updateData.series_title = editFormData.series;
        if (editFormData.remarks) updateData.general_note = editFormData.remarks;

        console.log('[FRONTEND] Sending update data:', updateData);
        console.log('[FRONTEND] Book ID:', editingBook.id);
        
        await api.put(`/books/${editingBook.id}`, updateData);
      }
      
      // Reload books to get updated data
      const schoolId = localStorage.getItem('schoolId');
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      
      console.log('[EDIT SUBMIT] Response:', response);
      console.log('[EDIT SUBMIT] Response data:', response.data);
      
      let booksData = [];
      if (response.data && response.data.data && response.data.data.books) {
        booksData = response.data.data.books;
      } else if (response.data && Array.isArray(response.data)) {
        booksData = response.data;
      } else if (response.data && response.data.books && Array.isArray(response.data.books)) {
        booksData = response.data.books;
      }
      
      console.log('[EDIT SUBMIT] Books data array:', booksData);
      
      const normalizedBooks = booksData.map((book) => ({
        id: book.book_id,
        title: book.title || 'Untitled',
        author: book.author || 'Unknown Author',
        publisher: book.publisher || 'Unknown Publisher',
        callNumber: book.call_number || 'Unknown',
        isbn: book.isbn || 'Unknown',
        year: book.publication_year || '',
        location: book.shelf_location || 'Library',
        edition: book.edition || '',
        physical_description: book.physical_description || '',
        series: book.series_title || '',
        remarks: book.general_note || '',
        cover_image: book.cover_image || ''
      }));
      
      setBooks(normalizedBooks);
      setShowEditForm(false);
      setEditingBook(null);
      setEditCoverImagePreview(null);
      setEditCoverImageFile(null);
    } catch (error) {
      console.error('Error updating book:', error);
      alert('Failed to update book: ' + (error.response?.data?.message || error.message));
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
    setEditingBook(null);
    setEditFormData({});
    setEditCoverImagePreview(null);
    setEditCoverImageFile(null);
  };

  const handleAddBook = () => {
    setShowAddForm(true);
    setAddFormData({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      edition: '',
      copyright_year: '',
      physical_description: '',
      series: '',
      remarks: '',
      shelf_location: '',
      cover_image: null,
      quantity: 1
    });
    setCoverImagePreview(null);
  };

  const handleAddCancel = () => {
    setShowAddForm(false);
    setAddFormData({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      edition: '',
      copyright_year: '',
      physical_description: '',
      series: '',
      remarks: '',
      shelf_location: '',
      cover_image: null,
      quantity: 1
    });
    setCoverImagePreview(null);
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      setAddFormData({ ...addFormData, cover_image: file });
      const previewUrl = URL.createObjectURL(file);
      console.log('Preview URL created:', previewUrl);
      setCoverImagePreview(previewUrl);
    }
  };

  const handleEditCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Edit file selected:', file.name, file.type, file.size);
      setEditCoverImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      console.log('Edit preview URL created:', previewUrl);
      setEditCoverImagePreview(previewUrl);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const schoolId = localStorage.getItem('schoolId');
      
      if (!schoolId) {
        alert('School ID not found. Please log in again.');
        setAddLoading(false);
        return;
      }

      if (!addFormData.title || !addFormData.title.trim()) {
        alert('Title is required');
        setAddLoading(false);
        return;
      }

      if (!addFormData.author || !addFormData.author.trim()) {
        alert('Author is required');
        setAddLoading(false);
        return;
      }

      const formData = new FormData();
      
      // Required fields
      formData.append('title', addFormData.title);
      formData.append('author', addFormData.author);
      formData.append('school_id', parseInt(schoolId));
      formData.append('quantity', parseInt(addFormData.quantity));
      
      // Optional fields
      if (addFormData.isbn) formData.append('isbn', addFormData.isbn);
      if (addFormData.publisher) formData.append('publisher', addFormData.publisher);
      if (addFormData.edition) formData.append('edition', addFormData.edition);
      if (addFormData.copyright_year) formData.append('copyright_year', parseInt(addFormData.copyright_year));
      if (addFormData.physical_description) formData.append('physical_description', addFormData.physical_description);
      if (addFormData.series) formData.append('series_title', addFormData.series);
      if (addFormData.remarks) formData.append('general_note', addFormData.remarks);
      if (addFormData.shelf_location) formData.append('shelf_location', addFormData.shelf_location);
      if (addFormData.cover_image) formData.append('cover_image', addFormData.cover_image);

      console.log('Submitting book with school_id:', parseInt(schoolId));
      console.log('FormData entries:', Array.from(formData.entries()));

      await api.post('/books', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reload books
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      
      console.log('[ADD SUBMIT] Response:', response);
      console.log('[ADD SUBMIT] Response data:', response.data);
      
      let booksData = [];
      if (response.data && response.data.data && response.data.data.books) {
        booksData = response.data.data.books;
      } else if (response.data && Array.isArray(response.data)) {
        booksData = response.data;
      } else if (response.data && response.data.books && Array.isArray(response.data.books)) {
        booksData = response.data.books;
      }
      
      console.log('[ADD SUBMIT] Books data array:', booksData);

      const normalizedBooks = booksData.map((book) => ({
        id: book.book_id,
        title: book.title || 'Untitled',
        author: book.author || 'Unknown Author',
        publisher: book.publisher || 'Unknown Publisher',
        callNumber: book.call_number || 'Unknown',
        isbn: book.isbn || 'Unknown',
        year: book.publication_year || '',
        location: book.shelf_location || 'Library',
        cover_image: book.cover_image || ''
      }));

      setBooks(normalizedBooks);
      setShowAddForm(false);
      handleAddCancel();
    } catch (error) {
      console.error('Error adding book:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to add book: ' + (error.response?.data?.message || error.message));
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (book) => {
    setDeleteConfirmation(book);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    const book = deleteConfirmation;
    setDeleteConfirmation(null);
    setLastAction({
      type: 'delete',
      book,
      timeout: setTimeout(async () => {
        try {
          await api.delete(`/books/${book.id}`);
          setBooks((prev) => prev.filter((b) => b.id !== book.id));
        } catch (error) {
          console.error('Error deleting book:', error);
          alert('Failed to delete book');
        } finally {
          setLastAction(null);
        }
      }, 5000),
    });
  };

  const handleUndo = () => {
    if (!lastAction) return;
    clearTimeout(lastAction.timeout);
    setLastAction(null);
  };

  return (
    <div className="animate-slide-up">
      {/* Add Books Button */}
      <div className="mb-6">
        <Button
          variant="primary"
          onClick={handleAddBook}
          className="w-full sm:w-auto"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Add Books
        </Button>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchBar
              placeholder="Search books by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'card' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <FiGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <FiList className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FiBook className="w-10 h-10 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-[#0F172A] mb-2">Loading books...</div>
        </div>
      ) : (
        <>
          {/* Results Count */}
          <div className="mb-6 text-[#64748B] text-sm font-medium">
            {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <Card 
                  key={book.id} 
                  className="hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {book.cover_image ? (
                      <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={`http://localhost:5000${book.cover_image}`}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('.card-fallback');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-sm card-fallback" style={{ display: book.cover_image ? 'none' : 'flex' }}>
                      <div className="absolute inset-y-0 left-0 w-1.5 bg-white/15" />
                      <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/10" />
                      <div className="relative flex h-full w-full items-center justify-center">
                        <FiBook className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1 line-clamp-2 text-[#0F172A]">
                        {book.title || 'Untitled'}
                      </h3>
                      <p className="text-sm text-[#64748B]">
                        {book.author || 'Unknown Author'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-[#F8FAFC]">
                      <FiMapPin className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                      <span className="text-[#0F172A]">{book.location || 'Library'}</span>
                    </div>
                    <div className="text-sm p-2 rounded-lg bg-[#F8FAFC]">
                      <span className="font-medium text-[#64748B]">ISBN:</span> 
                      <span className="text-[#0F172A]"> {book.isbn || 'Unknown'}</span>
                    </div>
                    <div className="text-sm p-2 rounded-lg bg-[#F8FAFC]">
                      <span className="font-medium text-[#64748B]">Year:</span> 
                      <span className="text-[#0F172A]"> {book.year || 'Unknown'}</span>
                    </div>
                    <div className="text-sm p-2 rounded-lg bg-[#F8FAFC]">
                      <span className="font-medium text-[#64748B]">Call Number:</span> 
                      <span className="text-[#0F172A]"> {book.callNumber || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <ActionMenu
                      trigger={
                        <Button
                          variant="secondary"
                          size="sm"
                          className="p-2"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: "Archive",
                          icon: <FiArchive className="w-4 h-4" />,
                          onClick: () => handleArchive(book),
                        },
                        {
                          label: "Edit",
                          icon: <FiEdit className="w-4 h-4" />,
                          onClick: () => handleEdit(book),
                        },
                        {
                          label: "Delete",
                          icon: <FiTrash2 className="w-4 h-4" />,
                          onClick: () => handleDelete(book),
                          danger: true,
                        },
                      ]}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">Cover</th>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">Title</th>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">Author</th>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">ISBN</th>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">Location</th>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">Year</th>
                    <th className="text-left p-4 font-semibold text-[#0F172A]">Call Number</th>
                    <th className="text-right p-4 font-semibold text-[#0F172A]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="p-4">
                        {book.cover_image ? (
                          <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
                            <img
                              src={`http://localhost:5000${book.cover_image}`}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.parentElement.querySelector('.table-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-sm table-fallback" style={{ display: book.cover_image ? 'none' : 'flex' }}>
                          <div className="absolute inset-y-0 left-0 w-1 bg-white/15" />
                          <div className="relative flex h-full w-full items-center justify-center">
                            <FiBook className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-[#0F172A] font-medium">{book.title || 'Untitled'}</td>
                      <td className="p-4 text-[#64748B]">{book.author || 'Unknown Author'}</td>
                      <td className="p-4 text-[#64748B]">{book.isbn || 'Unknown'}</td>
                      <td className="p-4 text-[#64748B]">{book.location || 'Library'}</td>
                      <td className="p-4 text-[#64748B]">{book.year || ''}</td>
                      <td className="p-4 text-[#64748B]">{book.callNumber || 'Unknown'}</td>
                      <td className="p-4 text-right">
                        <ActionMenu
                          trigger={
                            <Button
                              variant="secondary"
                              size="sm"
                              className="p-2"
                            >
                              <FiMoreVertical className="w-4 h-4" />
                            </Button>
                          }
                          items={[
                            {
                              label: "Archive",
                              icon: <FiArchive className="w-4 h-4" />,
                              onClick: () => handleArchive(book),
                            },
                            {
                              label: "Edit",
                              icon: <FiEdit className="w-4 h-4" />,
                              onClick: () => handleEdit(book),
                            },
                            {
                              label: "Delete",
                              icon: <FiTrash2 className="w-4 h-4" />,
                              onClick: () => handleDelete(book),
                              danger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {!loading && filteredBooks.length === 0 && (
        <EmptyState
          icon={<FiSearch />}
          title="No books found"
          description="Try adjusting your search criteria"
        />
      )}

      {/* Archive Confirmation Overlay */}
      <ConfirmationOverlay
        show={!!archiveConfirmation}
        title="Archive Book"
        message={`Are you sure you want to archive "${archiveConfirmation?.title}"? This will remove the book from the active list but preserve the data.`}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveConfirmation(null)}
      />

      {/* Delete Confirmation Overlay */}
      <ConfirmationOverlay
        show={!!deleteConfirmation}
        title="Delete Book"
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation(null)}
      />

      {/* Add Book Form Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Book</h2>
                <p className="text-sm text-gray-500 mt-1">Fill in the book information</p>
              </div>
              <button
                type="button"
                onClick={handleAddCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>  
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book Cover Image</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-44 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {coverImagePreview ? (
                      <img
                        src={coverImagePreview}
                        alt="Book cover preview"
                        className="w-full h-full object-cover"
                        onLoad={() => console.log('Image loaded successfully')}
                        onError={() => console.log('Image failed to load')}
                      />
                    ) : (
                      <FiImage className="w-8 h-8 text-gray-400" />
                    )}
                    {coverImagePreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCoverImagePreview(null);
                          setAddFormData({ ...addFormData, cover_image: null });
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 300x400px, max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Required Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={addFormData.title}
                    onChange={(e) => setAddFormData({...addFormData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Book title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={addFormData.author}
                    onChange={(e) => setAddFormData({...addFormData, author: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Author name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addFormData.quantity}
                    onChange={(e) => setAddFormData({...addFormData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Number of copies"
                  />
                </div>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={addFormData.isbn}
                    onChange={(e) => setAddFormData({...addFormData, isbn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ISBN number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={addFormData.publisher}
                    onChange={(e) => setAddFormData({...addFormData, publisher: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Publisher name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edition</label>
                  <input
                    type="text"
                    value={addFormData.edition}
                    onChange={(e) => setAddFormData({...addFormData, edition: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2nd Edition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Year</label>
                  <input
                    type="number"
                    value={addFormData.copyright_year}
                    onChange={(e) => setAddFormData({...addFormData, copyright_year: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={addFormData.shelf_location}
                    onChange={(e) => setAddFormData({...addFormData, shelf_location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., A-101"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Description</label>
                <textarea
                  value={addFormData.physical_description}
                  onChange={(e) => setAddFormData({...addFormData, physical_description: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., xiv, 350 pages : illustrations ; 24 cm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                <input
                  type="text"
                  value={addFormData.series}
                  onChange={(e) => setAddFormData({...addFormData, series: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Series name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / General Note</label>
                <textarea
                  value={addFormData.remarks}
                  onChange={(e) => setAddFormData({...addFormData, remarks: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes or remarks"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddCancel}
                  disabled={addLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={addLoading}
                >
                  {addLoading ? 'Adding...' : 'Add Book'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Form Overlay */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Book</h2>
              <p className="text-sm text-gray-500 mt-1">Update book information</p>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book Cover Image</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-44 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {editCoverImagePreview ? (
                      <img
                        src={editCoverImagePreview}
                        alt="Book cover preview"
                        className="w-full h-full object-cover"
                        onLoad={() => console.log('Edit image loaded successfully')}
                        onError={() => console.log('Edit image failed to load')}
                      />
                    ) : (
                      <FiImage className="w-8 h-8 text-gray-400" />
                    )}
                    {editCoverImagePreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditCoverImagePreview(null);
                          setEditCoverImageFile(null);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditCoverImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 300x400px, max 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                <input
                  type="text"
                  required
                  value={editFormData.author}
                  onChange={(e) => setEditFormData({...editFormData, author: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={editFormData.isbn}
                  onChange={(e) => setEditFormData({...editFormData, isbn: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Number</label>
                <input
                  type="text"
                  value={editFormData.call_number}
                  onChange={(e) => setEditFormData({...editFormData, call_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edition</label>
                <input
                  type="text"
                  value={editFormData.edition}
                  onChange={(e) => setEditFormData({...editFormData, edition: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Year</label>
                <input
                  type="number"
                  value={editFormData.copyright_year}
                  onChange={(e) => setEditFormData({...editFormData, copyright_year: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Description</label>
                <textarea
                  value={editFormData.physical_description}
                  onChange={(e) => setEditFormData({...editFormData, physical_description: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                <input
                  type="text"
                  value={editFormData.series}
                  onChange={(e) => setEditFormData({...editFormData, series: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({...editFormData, remarks: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleEditCancel}
                  disabled={editLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lastAction && (
        <UndoToast
          message={
            lastAction.type === 'archive'
              ? `"${lastAction.book.title}" has been archived`
              : `"${lastAction.book.title}" has been deleted`
          }
          onUndo={handleUndo}
        />
      )}
    </div>
  );
}

export default AdminBooks;
