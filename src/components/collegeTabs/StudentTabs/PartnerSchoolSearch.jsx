import { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, Book, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getPartnerSchoolsForBook } from '../../../utils/api';

function PartnerSchoolSearch({ book, onSelectSchool, onClose }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);

  useEffect(() => {
    loadPartnerSchools();
  }, [book]);

  const loadPartnerSchools = async () => {
    if (!book?.book_id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getPartnerSchoolsForBook(book.book_id);
      if (response.error) {
        setError(response.error.message || 'Failed to load partner schools');
        setSchools([]);
      } else {
        setSchools(response.data || []);
      }
    } catch (err) {
      setError('Failed to load partner schools');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.school_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSchool = (school) => {
    setSelectedSchool(school);
    if (onSelectSchool) {
      onSelectSchool(school);
    }
  };

  const handleConfirm = () => {
    if (selectedSchool && onSelectSchool) {
      onSelectSchool(selectedSchool);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Partner Schools</h2>
          <p className="text-gray-600 text-sm">
            Select a partner school that has this book available for inter-school borrowing
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Book Info */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
        <div className="flex gap-4">
          <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex-shrink-0 flex items-center justify-center">
            <Book className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">{book?.title}</h3>
            <p className="text-sm text-blue-700">{book?.author}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by school name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Searching for partner schools...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && filteredSchools.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No partner schools found</h3>
          <p className="text-sm text-gray-600">
            {searchQuery ? 'Try adjusting your search' : 'This book is not available at any partner schools'}
          </p>
        </div>
      )}

      {/* School List */}
      {!loading && !error && filteredSchools.length > 0 && (
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {filteredSchools.map((school) => (
            <div
              key={school.school_id}
              onClick={() => handleSelectSchool(school)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedSchool?.school_id === school.school_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{school.school_name}</h4>
                    {selectedSchool?.school_id === school.school_id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{school.address || 'Address not available'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      <span className="font-medium">Available Copies:</span>{' '}
                      <span className="text-green-600 font-semibold">{school.available_copies}</span>
                    </span>
                    <span className="text-gray-600">
                      <span className="font-medium">Code:</span> {school.school_code}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectSchool(school);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedSchool?.school_id === school.school_id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedSchool?.school_id === school.school_id ? 'Selected' : 'Select'}
                </button>
              </div>

              {/* Borrowing Requirements */}
              {school.borrowing_requirements && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Requirements:</span> {school.borrowing_requirements}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {selectedSchool && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Confirm Selection
          </button>
        </div>
      )}

      {/* Info Note */}
      {!loading && !error && filteredSchools.length > 0 && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Navigation className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">Library Use Only</p>
              <p className="text-orange-700">
                Books borrowed from partner schools must be used within the partner library premises
                and cannot be taken home. A permission letter will be required.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartnerSchoolSearch;
