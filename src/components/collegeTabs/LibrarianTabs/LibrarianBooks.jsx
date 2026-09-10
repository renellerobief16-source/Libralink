import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FiSearch, FiBook, FiMapPin, FiEdit, FiTrash2, FiGrid, FiList, 
  FiMoreVertical, FiArchive, FiPlus, FiImage, FiX, FiCheckCircle, 
  FiAlertCircle, FiLayers, FiTag, FiCalendar, FiHash, FiUploadCloud,
  FiBookOpen, FiInfo, FiFolder, FiCheck, FiFileText, FiRefreshCw
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";
import Card from "../../ui/Card";
import SearchBar from "../../ui/SearchBar";
import EmptyState from "../../ui/EmptyState";
import Button from "../../ui/Button";
import ConfirmationOverlay from "../../common/ConfirmationOverlay";
import ActionMenu from "../../common/ActionMenu";
import UndoToast from "../../common/UndoToast";

const CATEGORY_PRESETS = [
  'General Collection',
  'Computer Science & IT',
  'Engineering & Technology',
  'Nursing & Health Sciences',
  'Business & Accountancy',
  'Education & Teaching',
  'Literature & Languages',
  'Criminology & Law',
  'Social Sciences & History',
  'Mathematics & Natural Sciences',
  'Hospitality & Tourism'
];

const LOCATION_PRESETS = [
  'Main Stacks',
  'Reference Section',
  'Filipiniana',
  'Reserve Desk',
  'Periodicals',
  'Circulation Desk'
];

function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("all"); // 'all', 'in-stock', 'out-of-stock'
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
    call_number: '',
    publisher: '',
    edition: '',
    copyright_year: '',
    physical_description: '',
    series: '',
    remarks: '',
    shelf_location: 'Main Stacks',
    category: 'General Collection',
    cover_image: null,
    quantity: 1
  });
  const [addLoading, setAddLoading] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [editCoverImagePreview, setEditCoverImagePreview] = useState(null);
  const [editCoverImageFile, setEditCoverImageFile] = useState(null);
  const [isDraggingAdd, setIsDraggingAdd] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);

  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

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
          id: book.book_id || book.id,
          title: book.title || 'Untitled',
          author: book.author || 'Unknown Author',
          publisher: book.publisher || '',
          callNumber: book.call_number && book.call_number !== 'Unknown' ? book.call_number : '',
          isbn: book.isbn && book.isbn !== 'Unknown' ? book.isbn : '',
          year: book.publication_year || book.copyright_year || '',
          location: book.shelf_location && book.shelf_location !== 'Unknown' ? book.shelf_location : 'Main Library',
          cover_image: book.cover_image || '',
          category: book.category || book.genre || 'General Collection',
          available_copies: book.available_copies ?? book.quantity ?? 1,
          total_copies: book.total_copies ?? book.quantity ?? 1,
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

  const categories = useMemo(() => {
    const set = new Set();
    books.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return ['All', ...Array.from(set)];
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return books.filter(book => {
      const matchesSearch = !q ||
        (book.title || '').toLowerCase().includes(q) ||
        (book.author || '').toLowerCase().includes(q) ||
        (book.isbn || '').toLowerCase().includes(q) ||
        (book.callNumber || '').toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || book.category === selectedCategory;
      const isAvailable = (book.available_copies ?? 1) > 0;
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'in-stock' && isAvailable) || 
        (stockFilter === 'out-of-stock' && !isAvailable);

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [books, searchTerm, selectedCategory, stockFilter]);

  const handleEdit = (book) => {
    setEditingBook(book);
    setEditFormData({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      call_number: book.callNumber || '',
      publisher: book.publisher || '',
      edition: book.edition || '',
      copyright_year: book.year || '',
      physical_description: book.physical_description || '',
      series: book.series || '',
      remarks: book.remarks || '',
      shelf_location: book.location || 'Main Stacks',
      category: book.category || 'General Collection',
      cover_image: book.cover_image || '',
      quantity: book.total_copies || 1
    });
    setEditCoverImagePreview(book.cover_image ? getBackendAssetUrl(book.cover_image) : null);
    setEditCoverImageFile(null);
    setIsDraggingEdit(false);
    setShowEditForm(true);
  };

  const handleCoverDrop = (e, isEdit = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEdit) setIsDraggingEdit(false);
    else setIsDraggingAdd(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, or WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      if (isEdit) {
        setEditCoverImageFile(file);
        setEditCoverImagePreview(previewUrl);
      } else {
        setAddFormData(prev => ({ ...prev, cover_image: file }));
        setCoverImagePreview(previewUrl);
      }
    }
  };

  const handleCoverFileInputChange = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, or WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      if (isEdit) {
        setEditCoverImageFile(file);
        setEditCoverImagePreview(previewUrl);
      } else {
        setAddFormData(prev => ({ ...prev, cover_image: file }));
        setCoverImagePreview(previewUrl);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    
    setEditLoading(true);
    try {
      if (editCoverImageFile) {
        const formData = new FormData();
        formData.append('title', (editFormData.title || '').trim());
        formData.append('author', (editFormData.author || '').trim());
        if (editFormData.isbn) formData.append('isbn', editFormData.isbn.trim());
        if (editFormData.call_number) formData.append('call_number', editFormData.call_number.trim());
        if (editFormData.shelf_location) formData.append('shelf_location', editFormData.shelf_location.trim());
        if (editFormData.category) formData.append('category', editFormData.category.trim());
        if (editFormData.publisher) formData.append('publisher', editFormData.publisher.trim());
        if (editFormData.edition) formData.append('edition', editFormData.edition.trim());
        if (editFormData.copyright_year) formData.append('copyright_year', parseInt(editFormData.copyright_year));
        if (editFormData.physical_description) formData.append('physical_description', editFormData.physical_description.trim());
        if (editFormData.series) formData.append('series_title', editFormData.series.trim());
        if (editFormData.remarks) formData.append('general_note', editFormData.remarks.trim());
        formData.append('cover_image', editCoverImageFile);

        await api.put(`/books/${editingBook.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        const updateData = {};
        if (editFormData.title) updateData.title = editFormData.title.trim();
        if (editFormData.author) updateData.author = editFormData.author.trim();
        if (editFormData.isbn) updateData.isbn = editFormData.isbn.trim();
        if (editFormData.call_number) updateData.call_number = editFormData.call_number.trim();
        if (editFormData.shelf_location) updateData.shelf_location = editFormData.shelf_location.trim();
        if (editFormData.category) updateData.category = editFormData.category.trim();
        if (editFormData.publisher) updateData.publisher = editFormData.publisher.trim();
        if (editFormData.edition) updateData.edition = editFormData.edition.trim();
        if (editFormData.copyright_year) updateData.copyright_year = parseInt(editFormData.copyright_year);
        if (editFormData.physical_description) updateData.physical_description = editFormData.physical_description.trim();
        if (editFormData.series) updateData.series_title = editFormData.series.trim();
        if (editFormData.remarks) updateData.general_note = editFormData.remarks.trim();

        await api.put(`/books/${editingBook.id}`, updateData);
      }
      
      const schoolId = localStorage.getItem('schoolId');
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      
      let booksData = [];
      if (response.data && response.data.data && response.data.data.books) {
        booksData = response.data.data.books;
      } else if (response.data && Array.isArray(response.data)) {
        booksData = response.data;
      } else if (response.data && response.data.books && Array.isArray(response.data.books)) {
        booksData = response.data.books;
      }
      
      const normalizedBooks = booksData.map((book) => ({
        id: book.book_id || book.id,
        title: book.title || 'Untitled',
        author: book.author || 'Unknown Author',
        publisher: book.publisher || '',
        callNumber: book.call_number && book.call_number !== 'Unknown' ? book.call_number : '',
        isbn: book.isbn && book.isbn !== 'Unknown' ? book.isbn : '',
        year: book.publication_year || book.copyright_year || '',
        location: book.shelf_location && book.shelf_location !== 'Unknown' ? book.shelf_location : 'Main Library',
        edition: book.edition || '',
        physical_description: book.physical_description || '',
        series: book.series_title || '',
        remarks: book.general_note || '',
        cover_image: book.cover_image || '',
        category: book.categories?.category_name || book.category || 'General Collection',
        available_copies: book.available_copies ?? book.quantity ?? 1,
        total_copies: book.total_copies ?? book.quantity ?? 1,
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
    setIsDraggingEdit(false);
  };

  const handleAddBook = () => {
    setShowAddForm(true);
    setAddFormData({
      title: '',
      author: '',
      isbn: '',
      call_number: '',
      publisher: '',
      edition: '',
      copyright_year: '',
      physical_description: '',
      series: '',
      remarks: '',
      shelf_location: 'Main Stacks',
      category: 'General Collection',
      cover_image: null,
      quantity: 1
    });
    setCoverImagePreview(null);
    setIsDraggingAdd(false);
  };

  const handleAddCancel = () => {
    setShowAddForm(false);
    setAddFormData({
      title: '',
      author: '',
      isbn: '',
      call_number: '',
      publisher: '',
      edition: '',
      copyright_year: '',
      physical_description: '',
      series: '',
      remarks: '',
      shelf_location: 'Main Stacks',
      category: 'General Collection',
      cover_image: null,
      quantity: 1
    });
    setCoverImagePreview(null);
    setIsDraggingAdd(false);
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
      formData.append('title', addFormData.title.trim());
      formData.append('author', addFormData.author.trim());
      formData.append('school_id', parseInt(schoolId));
      formData.append('quantity', parseInt(addFormData.quantity) || 1);
      
      // Optional fields
      if (addFormData.isbn) formData.append('isbn', addFormData.isbn.trim());
      if (addFormData.call_number) formData.append('call_number', addFormData.call_number.trim());
      if (addFormData.publisher) formData.append('publisher', addFormData.publisher.trim());
      if (addFormData.edition) formData.append('edition', addFormData.edition.trim());
      if (addFormData.copyright_year) formData.append('copyright_year', parseInt(addFormData.copyright_year));
      if (addFormData.physical_description) formData.append('physical_description', addFormData.physical_description.trim());
      if (addFormData.series) formData.append('series_title', addFormData.series.trim());
      if (addFormData.remarks) formData.append('general_note', addFormData.remarks.trim());
      if (addFormData.shelf_location) formData.append('shelf_location', addFormData.shelf_location.trim());
      if (addFormData.category) formData.append('category', addFormData.category.trim());
      if (addFormData.cover_image) formData.append('cover_image', addFormData.cover_image);

      await api.post('/books', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reload books
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      
      let booksData = [];
      if (response.data && response.data.data && response.data.data.books) {
        booksData = response.data.data.books;
      } else if (response.data && Array.isArray(response.data)) {
        booksData = response.data;
      } else if (response.data && response.data.books && Array.isArray(response.data.books)) {
        booksData = response.data.books;
      }
      
      const normalizedBooks = booksData.map((book) => ({
        id: book.book_id || book.id,
        title: book.title || 'Untitled',
        author: book.author || 'Unknown Author',
        publisher: book.publisher || '',
        callNumber: book.call_number && book.call_number !== 'Unknown' ? book.call_number : '',
        isbn: book.isbn && book.isbn !== 'Unknown' ? book.isbn : '',
        year: book.publication_year || book.copyright_year || '',
        location: book.shelf_location && book.shelf_location !== 'Unknown' ? book.shelf_location : 'Main Library',
        edition: book.edition || '',
        physical_description: book.physical_description || '',
        series: book.series_title || '',
        remarks: book.general_note || '',
        cover_image: book.cover_image || '',
        category: book.categories?.category_name || book.category || 'General Collection',
        available_copies: book.available_copies ?? book.quantity ?? 1,
        total_copies: book.total_copies ?? book.quantity ?? 1,
      }));

      setBooks(normalizedBooks);
      setShowAddForm(false);
      handleAddCancel();
    } catch (error) {
      console.error('Error adding book:', error);
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
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic & Glassmorphism Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-blue-50/20 to-white p-5 sm:p-6 shadow-xs backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 border border-blue-200 text-blue-800">
                <FiBook className="w-3 h-3 text-blue-600" />
                Library Catalog & Inventory
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Campus Holdings</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Campus Book Catalog</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
              Manage library shelf records, track copy availability, inspect accession numbers, and organize catalog classifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Stats Pills */}
            <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
              <div className="px-3 py-1 text-center border-r border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Titles</span>
                <span className="text-sm font-black text-slate-900">{books.length}</span>
              </div>
              <div className="px-3 py-1 text-center border-r border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">In Stock</span>
                <span className="text-sm font-black text-emerald-600">
                  {books.filter(b => (b.available_copies ?? 1) > 0).length}
                </span>
              </div>
              <div className="px-3 py-1 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Categories</span>
                <span className="text-sm font-black text-blue-600">{categories.length - 1}</span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleAddBook}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add New Book</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search books by title, author, ISBN, or call number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stock Filter Pills & View Switcher */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStockFilter('in-stock')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  stockFilter === 'in-stock' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setStockFilter('out-of-stock')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  stockFilter === 'out-of-stock' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Out of Stock
              </button>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-xl border transition-all ${
                  viewMode === 'card'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
                title="Card Grid View"
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl border transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
                title="Table List View"
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills Carousel */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <FiTag className="w-3 h-3" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-all text-xs ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 animate-pulse">
            <FiBook className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-900 mb-1">Loading Catalog...</div>
          <p className="text-xs text-slate-500">Fetching book records from library database</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FiBook className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No Books Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No library books match the current search or filters. Try adjusting your search query or reset the filters.
          </p>
        </div>
      ) : (
        <>
          {/* Results Count Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>
              Showing <strong className="text-slate-900">{filteredBooks.length}</strong> of <strong className="text-slate-900">{books.length}</strong> catalog titles
            </span>
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBooks.map((book) => {
                const isAvail = (book.available_copies ?? 1) > 0;
                return (
                  <div 
                    key={book.id} 
                    className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Category Pill & Stock Status */}
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-[140px]">
                          {book.category}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isAvail ? `${book.available_copies ?? 1} Available` : 'Out of Stock'}
                        </span>
                      </div>

                      {/* Header with Cover & Title */}
                      <div className="flex items-start gap-3.5 mb-4">
                        {book.cover_image ? (
                          <div className="relative w-16 h-22 flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
                            <img
                              src={getBackendAssetUrl(book.cover_image)}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.parentElement.querySelector('.card-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="hidden card-fallback absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 items-center justify-center p-1 text-center">
                              <FiBook className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-16 h-22 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-800 shadow-sm flex items-center justify-center border border-slate-200 text-white">
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-white/20" />
                            <FiBook className="w-6 h-6" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {book.title || 'Untitled'}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                            {book.author || 'Unknown Author'}
                          </p>
                          {book.publisher && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {book.publisher}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Clean Metadata Chips - No "Unknown" */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {book.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-lg">
                            <FiMapPin className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[120px]">{book.location}</span>
                          </span>
                        )}

                        {book.isbn && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-lg">
                            <FiHash className="w-3 h-3 text-slate-400 shrink-0" />
                            {book.isbn}
                          </span>
                        )}

                        {book.year && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-lg">
                            <FiCalendar className="w-3 h-3 text-slate-400 shrink-0" />
                            {book.year}
                          </span>
                        )}

                        {book.callNumber && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-lg">
                            Call: {book.callNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: #{book.id}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(book)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 border border-slate-200"
                        >
                          <FiEdit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        <ActionMenu
                          trigger={
                            <Button
                              variant="secondary"
                              size="sm"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800"
                            >
                              <FiMoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          }
                          items={[
                            {
                              label: "Archive Book",
                              icon: <FiArchive className="w-4 h-4" />,
                              onClick: () => handleArchive(book),
                            },
                            {
                              label: "Delete Record",
                              icon: <FiTrash2 className="w-4 h-4" />,
                              onClick: () => handleDelete(book),
                              danger: true,
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
                          <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-sm border border-slate-200">
                            <img
                              src={getBackendAssetUrl(book.cover_image)}
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

      {/* Add Book Form Studio Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Fixed Top Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 via-white to-sky-50/40 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                  <FiBookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Add New Book</h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200">
                      Catalog Studio
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Register an accession entry into the campus library holdings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddCancel}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close dialog"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Two-Column Studio Body */}
            <form id="addBookForm" onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Book Cover Studio & Live Card Preview */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Cover Upload Dropzone */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FiImage className="w-3.5 h-3.5 text-sky-600" />
                        Book Cover Art
                      </span>
                      <span className="text-[11px] text-slate-400">Max 5MB</span>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => handleCoverFileInputChange(e, false)}
                    />

                    {coverImagePreview ? (
                      /* Cover with preview & 3D realistic styling */
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-lg flex items-center justify-center max-h-64">
                        <img
                          src={coverImagePreview}
                          alt="Book Cover Preview"
                          className="w-full h-64 object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 gap-2">
                          <button
                            type="button"
                            onClick={() => addFileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-colors"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCoverImagePreview(null);
                              setAddFormData(prev => ({ ...prev, cover_image: null }));
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Interactive Drag & Drop Area */
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingAdd(true); }}
                        onDragLeave={() => setIsDraggingAdd(false)}
                        onDrop={(e) => handleCoverDrop(e, false)}
                        onClick={() => addFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 min-h-[210px] ${
                          isDraggingAdd 
                            ? 'border-sky-500 bg-sky-50/70 scale-[0.99]' 
                            : 'border-slate-300 hover:border-sky-400 hover:bg-white bg-slate-100/50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
                          <FiUploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Drag & drop book cover here
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            or <span className="text-sky-600 font-medium underline">browse image files</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          PNG, JPG, WebP (300×400px recommended)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Live Catalog Card Preview Box */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <FiLayers className="w-3.5 h-3.5 text-indigo-600" />
                      Live Catalog Preview
                    </span>
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex gap-3 items-center">
                      <div className="w-12 h-16 rounded-md bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {coverImagePreview ? (
                          <img src={coverImagePreview} alt="Thumb" className="w-full h-full object-cover" />
                        ) : (
                          <FiBook className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {addFormData.title || 'Untitled Book'}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          by {addFormData.author || 'Author Name'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="text-[10px] font-medium bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200">
                            {addFormData.category || 'General'}
                          </span>
                          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                            {addFormData.quantity || 1} copies
                          </span>
                          {addFormData.shelf_location && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {addFormData.shelf_location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Shelf Location Presets */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Quick Shelf Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {LOCATION_PRESETS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setAddFormData(prev => ({ ...prev, shelf_location: loc }))}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            addFormData.shelf_location === loc
                              ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Structured Metadata Form */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* Group 1: Bibliographic Information */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiBook className="w-3.5 h-3.5 text-sky-600" />
                        Core Bibliographic Info
                      </span>
                      <span className="text-[11px] text-slate-400">Step 1</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Book Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addFormData.title}
                        onChange={(e) => setAddFormData({...addFormData, title: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                        placeholder="e.g. Introduction to Computer Science & Algorithms"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Author(s) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={addFormData.author}
                          onChange={(e) => setAddFormData({...addFormData, author: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                          placeholder="e.g. Alan Turing, Donald Knuth"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Academic Category
                        </label>
                        <select
                          value={addFormData.category}
                          onChange={(e) => setAddFormData({...addFormData, category: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-700"
                        >
                          {CATEGORY_PRESETS.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Series Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={addFormData.series}
                        onChange={(e) => setAddFormData({...addFormData, series: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                        placeholder="e.g. Computer Science Monographs Series Vol. 4"
                      />
                    </div>
                  </div>

                  {/* Group 2: Classification & Publication */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiHash className="w-3.5 h-3.5 text-blue-600" />
                        Classification & Publication
                      </span>
                      <span className="text-[11px] text-slate-400">Step 2</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ISBN
                        </label>
                        <input
                          type="text"
                          value={addFormData.isbn}
                          onChange={(e) => setAddFormData({...addFormData, isbn: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400 font-mono text-xs"
                          placeholder="978-0-123456-47-2"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Call Number (DDC / Dewey)
                        </label>
                        <input
                          type="text"
                          value={addFormData.call_number}
                          onChange={(e) => setAddFormData({...addFormData, call_number: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400 font-mono text-xs"
                          placeholder="QA 76.6 .T87 2024"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Publisher
                        </label>
                        <input
                          type="text"
                          value={addFormData.publisher}
                          onChange={(e) => setAddFormData({...addFormData, publisher: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                          placeholder="Pearson / McGraw-Hill"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Edition
                        </label>
                        <input
                          type="text"
                          value={addFormData.edition}
                          onChange={(e) => setAddFormData({...addFormData, edition: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                          placeholder="e.g. 3rd Global Ed."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Copyright Year
                        </label>
                        <input
                          type="number"
                          min="1800"
                          max="2100"
                          value={addFormData.copyright_year}
                          onChange={(e) => setAddFormData({...addFormData, copyright_year: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                          placeholder="2024"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Inventory & Shelf Holdings */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiMapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Holdings & Shelf Location
                      </span>
                      <span className="text-[11px] text-slate-400">Step 3</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Initial Copies / Quantity <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="1000"
                          value={addFormData.quantity}
                          onChange={(e) => setAddFormData({...addFormData, quantity: parseInt(e.target.value) || 1})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-semibold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Shelf Location
                        </label>
                        <input
                          type="text"
                          value={addFormData.shelf_location}
                          onChange={(e) => setAddFormData({...addFormData, shelf_location: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                          placeholder="e.g. Aisle 3, Shelf B-12"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Physical Description
                      </label>
                      <input
                        type="text"
                        value={addFormData.physical_description}
                        onChange={(e) => setAddFormData({...addFormData, physical_description: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                        placeholder="e.g. xxiv, 512 pages : illustrations, charts ; 25 cm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Accession Remarks & Notes
                      </label>
                      <textarea
                        rows={2}
                        value={addFormData.remarks}
                        onChange={(e) => setAddFormData({...addFormData, remarks: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400 resize-none"
                        placeholder="Special accession notes, donation references, or handling conditions..."
                      />
                    </div>
                  </div>

                </div>
              </div>
            </form>

            {/* Sticky Bottom Action Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-sm flex flex-col sm:flex-row sm:justify-between items-center gap-3 flex-shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>Fields with <span className="text-rose-500 font-bold">*</span> are required for catalog registry</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddCancel}
                  disabled={addLoading}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="addBookForm"
                  disabled={addLoading}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 rounded-xl shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {addLoading ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Entry...</span>
                    </>
                  ) : (
                    <>
                      <FiPlus className="w-4 h-4" />
                      <span>Add Book to Catalog</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Book Form Studio Overlay */}
      {showEditForm && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Fixed Top Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                  <FiEdit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Edit Book Details</h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200">
                      Editor Studio
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Update catalog metadata and holding information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEditCancel}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close dialog"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Two-Column Studio Body */}
            <form id="editBookForm" onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Cover Studio & Live Card Preview */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Cover Upload Dropzone */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FiImage className="w-3.5 h-3.5 text-blue-600" />
                        Book Cover Art
                      </span>
                      <span className="text-[11px] text-slate-400">Max 5MB</span>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => handleCoverFileInputChange(e, true)}
                    />

                    {editCoverImagePreview ? (
                      /* Cover with preview & realistic styling */
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-lg flex items-center justify-center max-h-64">
                        <img
                          src={editCoverImagePreview}
                          alt="Book Cover Preview"
                          className="w-full h-64 object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 gap-2">
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-colors"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditCoverImagePreview(null);
                              setEditCoverImageFile(null);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Interactive Drag & Drop Area */
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingEdit(true); }}
                        onDragLeave={() => setIsDraggingEdit(false)}
                        onDrop={(e) => handleCoverDrop(e, true)}
                        onClick={() => editFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 min-h-[210px] ${
                          isDraggingEdit 
                            ? 'border-blue-500 bg-blue-50/70 scale-[0.99]' 
                            : 'border-slate-300 hover:border-blue-400 hover:bg-white bg-slate-100/50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                          <FiUploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Drag & drop new book cover
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            or <span className="text-blue-600 font-medium underline">browse image files</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          PNG, JPG, WebP (300×400px recommended)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Live Catalog Card Preview Box */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <FiLayers className="w-3.5 h-3.5 text-indigo-600" />
                      Live Catalog Preview
                    </span>
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex gap-3 items-center">
                      <div className="w-12 h-16 rounded-md bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {editCoverImagePreview ? (
                          <img src={editCoverImagePreview} alt="Thumb" className="w-full h-full object-cover" />
                        ) : (
                          <FiBook className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {editFormData.title || 'Untitled Book'}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          by {editFormData.author || 'Author Name'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="text-[10px] font-medium bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200">
                            {editFormData.category || 'General'}
                          </span>
                          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                            {editFormData.quantity || 1} copies
                          </span>
                          {editFormData.shelf_location && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {editFormData.shelf_location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Shelf Location Presets */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Quick Shelf Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {LOCATION_PRESETS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setEditFormData(prev => ({ ...prev, shelf_location: loc }))}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            editFormData.shelf_location === loc
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Structured Metadata Form */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* Group 1: Bibliographic Information */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiBook className="w-3.5 h-3.5 text-blue-600" />
                        Core Bibliographic Info
                      </span>
                      <span className="text-[11px] text-slate-400">Step 1</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Book Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.title || ''}
                        onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        placeholder="e.g. Introduction to Computer Science & Algorithms"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Author(s) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editFormData.author || ''}
                          onChange={(e) => setEditFormData({...editFormData, author: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          placeholder="e.g. Alan Turing, Donald Knuth"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Academic Category
                        </label>
                        <select
                          value={editFormData.category || 'General Collection'}
                          onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                        >
                          {CATEGORY_PRESETS.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Series Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={editFormData.series || ''}
                        onChange={(e) => setEditFormData({...editFormData, series: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        placeholder="e.g. Computer Science Monographs Series Vol. 4"
                      />
                    </div>
                  </div>

                  {/* Group 2: Classification & Publication */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiHash className="w-3.5 h-3.5 text-blue-600" />
                        Classification & Publication
                      </span>
                      <span className="text-[11px] text-slate-400">Step 2</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ISBN
                        </label>
                        <input
                          type="text"
                          value={editFormData.isbn || ''}
                          onChange={(e) => setEditFormData({...editFormData, isbn: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 font-mono text-xs"
                          placeholder="978-0-123456-47-2"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Call Number (DDC / Dewey)
                        </label>
                        <input
                          type="text"
                          value={editFormData.call_number || ''}
                          onChange={(e) => setEditFormData({...editFormData, call_number: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 font-mono text-xs"
                          placeholder="QA 76.6 .T87 2024"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Publisher
                        </label>
                        <input
                          type="text"
                          value={editFormData.publisher || ''}
                          onChange={(e) => setEditFormData({...editFormData, publisher: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          placeholder="Pearson / McGraw-Hill"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Edition
                        </label>
                        <input
                          type="text"
                          value={editFormData.edition || ''}
                          onChange={(e) => setEditFormData({...editFormData, edition: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          placeholder="e.g. 3rd Global Ed."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Copyright Year
                        </label>
                        <input
                          type="number"
                          min="1800"
                          max="2100"
                          value={editFormData.copyright_year || ''}
                          onChange={(e) => setEditFormData({...editFormData, copyright_year: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          placeholder="2024"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Inventory & Shelf Holdings */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiMapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Holdings & Shelf Location
                      </span>
                      <span className="text-[11px] text-slate-400">Step 3</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Total Copies / Quantity
                        </label>
                        <input
                          type="number"
                          disabled
                          value={editFormData.quantity || 1}
                          className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-semibold"
                          title="Copy inventory is managed via Book Copies"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Shelf Location
                        </label>
                        <input
                          type="text"
                          value={editFormData.shelf_location || ''}
                          onChange={(e) => setEditFormData({...editFormData, shelf_location: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          placeholder="e.g. Aisle 3, Shelf B-12"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Physical Description
                      </label>
                      <input
                        type="text"
                        value={editFormData.physical_description || ''}
                        onChange={(e) => setEditFormData({...editFormData, physical_description: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        placeholder="e.g. xxiv, 512 pages : illustrations, charts ; 25 cm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Accession Remarks & Notes
                      </label>
                      <textarea
                        rows={2}
                        value={editFormData.remarks || ''}
                        onChange={(e) => setEditFormData({...editFormData, remarks: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
                        placeholder="Special accession notes, condition notes, or edition updates..."
                      />
                    </div>
                  </div>

                </div>
              </div>
            </form>

            {/* Sticky Bottom Action Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-sm flex flex-col sm:flex-row sm:justify-between items-center gap-3 flex-shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Modifying catalog entry for: <strong className="text-slate-700 font-semibold">{editingBook?.title}</strong></span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleEditCancel}
                  disabled={editLoading}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="editBookForm"
                  disabled={editLoading}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

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
