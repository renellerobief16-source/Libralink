import { useState, useEffect } from "react";
import { FiSearch, FiBook, FiMapPin, FiEdit, FiTrash2, FiGrid, FiList, FiMoreVertical, FiArchive } from "react-icons/fi";
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

        const normalizedBooks = (response.data || []).map((book) => ({
          id: book.book_id,
          title: book.title || 'Untitled',
          author: book.author || 'Unknown Author',
          publisher: book.publisher || 'Unknown Publisher',
          callNumber: book.call_number || 'Unknown',
          isbn: book.isbn || 'Unknown',
          year: book.publication_year || 'Unknown',
          location: book.shelf_location || 'Library',
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
      remarks: book.remarks || ''
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    
    setEditLoading(true);
    try {
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
      
      // Reload books to get updated data
      const schoolId = localStorage.getItem('schoolId');
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      
      const normalizedBooks = (response.data || []).map((book) => ({
        id: book.book_id,
        title: book.title || 'Untitled',
        author: book.author || 'Unknown Author',
        publisher: book.publisher || 'Unknown Publisher',
        callNumber: book.call_number || 'Unknown',
        isbn: book.isbn || 'Unknown',
        year: book.publication_year || 'Unknown',
        location: book.shelf_location || 'Library',
        edition: book.edition || '',
        physical_description: book.physical_description || '',
        series: book.series_title || '',
        remarks: book.general_note || ''
      }));
      
      setBooks(normalizedBooks);
      setShowEditForm(false);
      setEditingBook(null);
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
      {/* Header Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">Library Books</h1>
        <p className="text-[#64748B] text-sm">Manage and view all books in your library</p>
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
                    <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center">
                      <FiBook className="w-8 h-8 text-blue-600" />
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
                      <td className="p-4 text-[#0F172A] font-medium">{book.title || 'Untitled'}</td>
                      <td className="p-4 text-[#64748B]">{book.author || 'Unknown Author'}</td>
                      <td className="p-4 text-[#64748B]">{book.isbn || 'Unknown'}</td>
                      <td className="p-4 text-[#64748B]">{book.location || 'Library'}</td>
                      <td className="p-4 text-[#64748B]">{book.year || 'Unknown'}</td>
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

      {/* Edit Form Overlay */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Book</h2>
              <p className="text-sm text-gray-500 mt-1">Update book information</p>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
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
