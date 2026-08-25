import { useState, useEffect } from 'react';
import { FiBook, FiFilter, FiSearch } from 'react-icons/fi';
import api from '../../../utils/api';
import { ConfirmationOverlay, LoadingOverlay, AlertOverlay } from '../../common';
import useAlert from '../../../hooks/useAlert';
import { PageHeader, Button, Card, Input, Select, Modal, StatusBadge, EmptyState, IconButton } from '../../ui';

function SuperAdminBooks({ darkMode }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    fetchBooks();
    fetchSchools();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await api.get('/books');
      setBooks(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching books:', error);
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSchool = filterSchool === 'all' || book.school_id == filterSchool;
    const matchesStatus = filterStatus === 'all' || book.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSchool && matchesStatus && matchesSearch;
  });

  return (
    <div className="animate-slide-up">
      <LoadingOverlay show={loading} text="Loading books..." />
      
      <PageHeader
        title="Library Books"
        description="View and monitor all books across schools"
      />

      {/* Search and Filter Section */}
      <Card padding="md" className="mb-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>

          {/* Filter Categories - Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 flex-shrink-0">
              <FiFilter className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Filters:</span>
            </div>
            
            {/* School Filter */}
            <Select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              options={[
                { value: 'all', label: 'All Schools' },
                ...schools.map((school) => ({ value: school.school_id, label: school.school_code }))
              ]}
              className="flex-shrink-0 w-48"
            />
            
            {/* Status Filter */}
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Available', label: 'Available' },
                { value: 'Borrowed', label: 'Borrowed' },
                { value: 'Overdue', label: 'Overdue' }
              ]}
              className="flex-shrink-0 w-40"
            />
          </div>
        </div>
      </Card>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <Card key={book.book_id} padding="md" className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-16 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiBook className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-slate-900">{book.title}</h3>
            <p className="text-sm mb-3 text-slate-600">by {book.author}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge status={book.school_code} variant="info" />
              <StatusBadge status={book.isbn || 'No ISBN'} variant="neutral" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <StatusBadge status={book.status || 'Unknown'} variant={book.status === 'Available' ? 'success' : 'error'} />
              <span className="text-xs text-slate-500">
                ID: {book.book_id}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && !loading && (
        <EmptyState
          icon={<FiBook className="w-10 h-10" />}
          title="No books found"
          description="Try adjusting your filter to see books"
        />
      )}

    </div>
  );
}

export default SuperAdminBooks;
