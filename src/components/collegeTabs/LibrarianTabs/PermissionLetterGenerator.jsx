import { useState, useEffect } from 'react';
import { FileText, Printer, Download, X, CheckCircle, AlertCircle, User, Book, MapPin, Calendar, School } from 'lucide-react';
import { generatePermissionLetter } from '../../../utils/api';

function PermissionLetterGenerator({ request, onClose, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [letterData, setLetterData] = useState({
    librarian_name: '',
    librarian_position: '',
    issuing_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    special_instructions: '',
  });

  useEffect(() => {
    // Set default valid until date (30 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setLetterData(prev => ({
      ...prev,
      valid_until: validUntil.toISOString().split('T')[0],
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLetterData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    // Validation
    if (!letterData.librarian_name.trim()) {
      setError('Librarian name is required');
      return;
    }
    if (!letterData.librarian_position.trim()) {
      setError('Librarian position is required');
      return;
    }
    if (!letterData.valid_until) {
      setError('Valid until date is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would generate a PDF
      // For now, we'll simulate the generation and update the request
      const letterUrl = `/uploads/permission-letters/${request.request_id}.pdf`;
      
      const response = await generatePermissionLetter(request.request_id, letterUrl);
      
      if (response.error) {
        setError(response.error.message || 'Failed to generate permission letter');
      } else {
        if (onGenerated) {
          onGenerated(response.data);
        }
        alert('Permission letter generated successfully!');
      }
    } catch (err) {
      setError('Failed to generate permission letter');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real implementation, this would download the PDF
    alert('Downloading permission letter...');
  };

  if (!request) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Request Selected</h3>
          <p className="text-sm text-gray-600">Please select a borrowing request to generate a permission letter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Letter</h2>
          <p className="text-gray-600 text-sm">Generate permission letter for inter-school borrowing</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Request Info */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-600 mb-1">Request ID</p>
            <p className="font-medium text-blue-900">{request.request_id}</p>
          </div>
          <div>
            <p className="text-blue-600 mb-1">Student</p>
            <p className="font-medium text-blue-900">
              {request.student?.firstname} {request.student?.lastname}
            </p>
          </div>
          <div>
            <p className="text-blue-600 mb-1">Partner School</p>
            <p className="font-medium text-blue-900">
              {request.items?.[0]?.partner_school?.school_name || 'Multiple Schools'}
            </p>
          </div>
          <div>
            <p className="text-blue-600 mb-1">Books</p>
            <p className="font-medium text-blue-900">{request.items?.length || 0} items</p>
          </div>
        </div>
      </div>

      {/* Letter Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Librarian Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="librarian_name"
              value={letterData.librarian_name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
              placeholder="Juan Dela Cruz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Librarian Position <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="librarian_position"
              value={letterData.librarian_position}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
              placeholder="Head Librarian"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issuing Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="issuing_date"
              value={letterData.issuing_date}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="valid_until"
              value={letterData.valid_until}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            name="special_instructions"
            value={letterData.special_instructions}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white border-gray-200 resize-none"
            placeholder="Any special conditions or instructions for the partner school..."
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Letter Preview */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Letter Preview
        </h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-sm">
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-gray-900 mb-2">LIBRARY PERMISSION LETTER</h4>
            <p className="text-gray-600">Inter-School Borrowing Authorization</p>
          </div>

          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Date:</strong> {new Date(letterData.issuing_date).toLocaleDateString()}
            </p>
            <p>
              <strong>To:</strong> The Librarian,<br />
              {request.items?.[0]?.partner_school?.school_name || 'Partner School Library'}
            </p>
            <p className="mt-4">
              <strong>Subject:</strong> Permission for Inter-School Library Use
            </p>
            <p className="mt-4">
              Dear Librarian,
            </p>
            <p className="mt-4">
              This letter serves to authorize <strong>{request.student?.firstname} {request.student?.lastname}</strong> 
              (Student Number: {request.student?.student_number}) to borrow books from your library for 
              <strong> library use only</strong>.
            </p>
            <p className="mt-4">
              The student is permitted to borrow the following book(s):
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {request.items?.map((item, index) => (
                <li key={item.item_id}>
                  {item.book?.title} by {item.book?.author}
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <strong>Important Conditions:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Books must be used within your library premises only</li>
              <li>Books cannot be taken home by the student</li>
              <li>This permission is valid until {new Date(letterData.valid_until).toLocaleDateString()}</li>
              <li>The student must present this letter along with their QR code</li>
            </ul>
            {letterData.special_instructions && (
              <p className="mt-4">
                <strong>Special Instructions:</strong> {letterData.special_instructions}
              </p>
            )}
            <p className="mt-6">
              Thank you for your cooperation in facilitating inter-school library access.
            </p>
            <div className="mt-8">
              <p>Sincerely,</p>
              <p className="mt-2 font-semibold">{letterData.librarian_name || '[Librarian Name]'}</p>
              <p className="text-gray-600">{letterData.librarian_position || '[Position]'}</p>
              <p className="text-gray-600">Home Library</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Generate Letter
            </>
          )}
        </button>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">Important Note</p>
            <p className="text-orange-700">
              Once generated, the permission letter will be available for download and printing. 
              The student must present this letter to the partner school librarian along with their QR code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PermissionLetterGenerator;
