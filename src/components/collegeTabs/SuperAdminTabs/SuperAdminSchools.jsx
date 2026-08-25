import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiSearch, FiGlobe, FiBook, FiX, FiGrid, FiList } from 'react-icons/fi';
import api, { API_BASE_URL } from '../../../utils/api';
import { AlertOverlay, LoadingOverlay } from '../../common';
import useAlert from '../../../hooks/useAlert';
import { PageHeader, Button, Card, Input, Modal, StatusBadge, EmptyState, DataTable, SearchBar, IconButton, Select } from '../../ui';

function SuperAdminSchools({ darkMode }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [formData, setFormData] = useState({ school_name: '', school_code: '', address: '', contact_number: '', email: '', status: 'active', logo: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [showBooksModal, setShowBooksModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolBooks, setSchoolBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const { alert, showSuccess, showError, hideAlert } = useAlert();

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  const getLogoUrl = (logo) => {
    if (!logo) return '';
    // If logo is already an absolute URL or a data/blob URL, return as-is
    if (
      logo.startsWith('http://') ||
      logo.startsWith('https://') ||
      logo.startsWith('data:') ||
      logo.startsWith('blob:')
    ) {
      return logo;
    }

    // If logo is a relative path like '/uploads/logos/..', prefix backend origin
    if (logo.startsWith('/')) return `${apiOrigin}${logo}`;
    return `${apiOrigin}/${logo}`;
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      console.log('Fetching schools...');
      const response = await api.get('/schools');
      console.log('Schools response:', response);
      console.log('Schools data:', response.data);
      if (response.data && response.data.length > 0) {
        response.data.forEach((school, index) => {
          console.log(`School ${index} (${school.school_name}): logo exists = ${!!school.logo}, logo length = ${school.logo?.length || 0}`);
        });
      }
      setSchools(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schools:', error);
      console.error('Error details:', error.response?.data);
      setLoading(false);
    }
  };

  const handleAddSchool = async () => {
    try {
      console.log('Adding school with data:', formData);
      // First create the school via JSON (server expects JSON for creation)
      const payload = {
        school_name: formData.school_name,
        school_code: formData.school_code,
        address: formData.address,
        contact_number: formData.contact_number,
        email: formData.email,
        status: formData.status,
      };

      const response = await api.post('/schools', payload);
      console.log('Create school response:', response);

      if (response && response.success) {
        const createdId = response.school_id;
        // If a logo file was selected, upload it to the dedicated logo endpoint
        if (logoFile && createdId) {
          const logoForm = new FormData();
          logoForm.append('logo', logoFile);
          try {
            const uploadResp = await api.post(`/schools/${createdId}/logo`, logoForm, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            console.log('Logo upload response:', uploadResp);
          } catch (uploadErr) {
            console.error('Logo upload failed:', uploadErr);
            // don't fail the whole flow for logo upload; show a warning
            showError('School created but logo upload failed.');
          }
        }

        await fetchSchools();
        setShowAddModal(false);
        setFormData({ school_name: '', school_code: '', address: '', contact_number: '', email: '', status: 'active', logo: '' });
        setLogoFile(null);
        setLogoPreview('');
        showSuccess('School added successfully!');
      } else {
        showError(response?.message || 'Failed to add school. Please try again.');
      }
    } catch (error) {
      console.error('Error adding school:', error);
      console.error('Error response data:', error.data || error);
      console.error('Error status:', error.status);
      showError(`Failed to add school. ${error.data?.message || error.message || 'Please try again.'}`);
    }
  };

  const handleEditSchool = (school) => {
    setEditingSchool(school);
    setFormData({ 
      school_name: school.school_name, 
      school_code: school.school_code, 
      address: school.address,
      contact_number: school.contact_number || '',
      email: school.email || '',
      status: school.status,
      logo: school.logo || ''
    });
    setLogoPreview(school.logo || '');
    setShowAddModal(true);
  };

  const handleUpdateSchool = async () => {
    if (!editingSchool?.school_id) {
      showError('No school selected for update.');
      return;
    }

    try {
      console.log('Updating school:', editingSchool.school_id, formData);
      // Update school fields via JSON (server expects JSON for update)
      const payload = {
        school_name: formData.school_name,
        school_code: formData.school_code,
        address: formData.address,
        contact_number: formData.contact_number,
        email: formData.email,
        status: formData.status,
      };

      const response = await api.put(`/schools/${editingSchool.school_id}`, payload);
      console.log('School update response:', response);

      if (response && response.success) {
        // If a new logo file was selected, upload via the dedicated endpoint
        if (logoFile) {
          const logoForm = new FormData();
          logoForm.append('logo', logoFile);
          try {
            const uploadResp = await api.post(`/schools/${editingSchool.school_id}/logo`, logoForm, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            console.log('Logo upload response:', uploadResp);
          } catch (uploadErr) {
            console.error('Logo upload failed:', uploadErr);
            showError('School updated but logo upload failed.');
          }
        }

        await fetchSchools();
        setShowAddModal(false);
        setEditingSchool(null);
        setFormData({ school_name: '', school_code: '', address: '', contact_number: '', email: '', status: 'active', logo: '' });
        setLogoFile(null);
        setLogoPreview('');
        showSuccess('School updated successfully!');
      } else {
        showError(response?.message || 'Failed to update school. Please try again.');
      }
    } catch (error) {
      console.error('Error updating school:', error);
      console.error('Error response data:', error.data || error);
      console.error('Error status:', error.status);
      showError(`Failed to update school. ${error.data?.message || error.message || 'Please try again.'}`);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setFormData({ ...formData, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewSchoolBooks = async (school) => {
    setSelectedSchool(school);
    setShowBooksModal(true);
    setLoadingBooks(true);
    setBookSearchQuery('');
    try {
      const response = await api.get(`/books/school?school_id=${school.school_id}`);
      console.log('School books response:', response);
      console.log('School books data:', response.data);
      setSchoolBooks(response.data || []);
    } catch (error) {
      console.error('Error fetching school books:', error);
      setSchoolBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <LoadingOverlay show={loading} text="Loading schools..." />
      
      <PageHeader
        title="School Management"
        description="Manage all schools in the system"
      />

      {/* Search Section */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-auto">
            <SearchBar placeholder="Search schools..." />
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={<FiPlus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
              variant="primary"
              title="Add School"
            />
            <IconButton
              icon={<FiGrid className="w-4 h-4" />}
              onClick={() => setViewMode('card')}
              variant={viewMode === 'card' ? 'primary' : 'ghost'}
              title="Card View"
            />
            <IconButton
              icon={<FiList className="w-4 h-4" />}
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              title="List View"
            />
          </div>
        </div>
      </Card>

      {/* Schools Display */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <Card
              key={school.school_id}
              padding="md"
              onClick={() => handleViewSchoolBooks(school)}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {school.logo && school.logo.length > 0 ? (
                    <img src={getLogoUrl(school.logo)} alt="School Logo" className="w-full h-full object-contain" onError={(e) => { console.error('Logo load error: src=', e.target.src, 'event=', e); e.target.style.display = 'none'; }} />
                  ) : (
                    <FiGlobe className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    icon={<FiEdit className="w-4 h-4" />}
                    onClick={() => handleEditSchool(school)}
                    variant="ghost"
                  />
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-1 text-slate-900">{school.school_name}</h3>
              <p className="text-sm mb-3 font-mono text-blue-600">{school.school_code}</p>

              <div className="space-y-2 mb-3">
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Address:</span> {school.address || 'Not specified'}
                </div>
                {school.contact_number && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Contact:</span> {school.contact_number}
                  </div>
                )}
                {school.email && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Email:</span> {school.email}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <StatusBadge status={school.status} variant={school.status === 'active' ? 'success' : 'error'} />
                <span className="text-xs text-slate-500">
                  ID: {school.school_id}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            { header: 'School Name', accessor: 'school_name', cell: (row) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {row.logo && row.logo.length > 0 ? (
                    <img src={getLogoUrl(row.logo)} alt="School Logo" className="w-full h-full object-contain" onError={(e) => { console.error('Logo load error: src=', e.target.src, 'event=', e); e.target.style.display = 'none'; }} />
                  ) : (
                    <FiGlobe className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="font-medium text-slate-900">{row.school_name}</div>
              </div>
            )},
            { header: 'Code', accessor: 'school_code', cell: (row) => <span className="text-sm font-mono text-blue-600">{row.school_code}</span> },
            { header: 'Address', accessor: 'address', cell: (row) => <span className="text-sm text-slate-700">{row.address || 'Not specified'}</span> },
            { header: 'Contact', accessor: 'contact_number', cell: (row) => <span className="text-sm text-slate-700">{row.contact_number || row.email || 'N/A'}</span> },
            { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} variant={row.status === 'active' ? 'success' : 'error'} /> },
            { header: 'ID', accessor: 'school_id', cell: (row) => <span className="text-sm text-slate-500">{row.school_id}</span> },
            { header: 'Actions', cell: (row) => (
              <div className="flex items-center justify-end gap-2">
                <IconButton icon={<FiEdit className="w-4 h-4" />} onClick={() => handleEditSchool(row)} variant="ghost" />
              </div>
            )},
          ]}
          data={schools}
        />
      )}

      {schools.length === 0 && (
        <EmptyState
          icon={<FiGlobe className="w-10 h-10" />}
          title="No schools found"
          description="Add a new school to get started"
          action={{ label: 'Add School', onClick: () => setShowAddModal(true) }}
        />
      )}

      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingSchool(null);
            setFormData({ school_name: '', school_code: '', address: '', contact_number: '', email: '', status: 'active', logo: '' });
            setLogoFile(null);
            setLogoPreview('');
          }}
          title={editingSchool ? 'Edit School' : 'Add New School'}
          description={editingSchool ? 'Update school information' : 'Fill in the school details below'}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => {
                setShowAddModal(false);
                setEditingSchool(null);
                setFormData({ school_name: '', school_code: '', address: '', contact_number: '', email: '', status: 'active', logo: '' });
                setLogoFile(null);
                setLogoPreview('');
              }}>
                Cancel
              </Button>
              <Button onClick={editingSchool ? handleUpdateSchool : handleAddSchool}>
                {editingSchool ? 'Update School' : 'Add School'}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-slate-700">School Logo</label>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img src={logoPreview} alt="Logo Preview" className="w-32 h-32 object-contain mx-auto rounded-lg" />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview('');
                        setLogoFile(null);
                        setFormData({ ...formData, logo: '' });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-10"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <FiGlobe className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600">Click to upload logo</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label="School Name *"
                placeholder="Enter school name"
                value={formData.school_name}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
              />
            </div>

            <div>
              <Input
                label="School Code *"
                placeholder="e.g., SRC, GNC"
                value={formData.school_code}
                onChange={(e) => setFormData({ ...formData, school_code: e.target.value })}
              />
            </div>

            <div>
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Address"
                placeholder="School address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <Input
                label="Contact Number"
                placeholder="Phone number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              />
            </div>

            <div>
              <Input
                label="Email"
                type="email"
                placeholder="School email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* School Books Modal */}
      {showBooksModal && (
        <Modal
          isOpen={showBooksModal}
          onClose={() => {
            setShowBooksModal(false);
            setSelectedSchool(null);
            setSchoolBooks([]);
          }}
          title={`Books for ${selectedSchool?.school_name}`}
          description={`School Code: ${selectedSchool?.school_code}`}
          size="full"
          footer={
            <Button onClick={() => {
              setShowBooksModal(false);
              setSelectedSchool(null);
              setSchoolBooks([]);
            }}>
              Close
            </Button>
          }
        >
          <div className="mb-6">
            <SearchBar
              placeholder="Search books by title, author, or ISBN..."
              value={bookSearchQuery}
              onChange={(e) => setBookSearchQuery(e.target.value)}
              onClear={() => setBookSearchQuery('')}
            />
          </div>

          {loadingBooks ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Loading books...</p>
            </div>
          ) : schoolBooks.length === 0 ? (
            <EmptyState
              icon={<FiBook className="w-10 h-10" />}
              title="No books found"
              description="This school doesn't have any books yet"
            />
          ) : (
            <DataTable
              columns={[
                { header: 'Title', accessor: 'title', cell: (row) => <span className="text-slate-900">{row.title}</span> },
                { header: 'Author', accessor: 'author', cell: (row) => <span className="text-slate-600">{row.author}</span> },
                { header: 'Category', accessor: 'category', cell: (row) => <StatusBadge status={row.category || 'General'} variant="neutral" /> },
                { header: 'ISBN', accessor: 'isbn', cell: (row) => <span className="text-slate-600">{row.isbn || 'N/A'}</span> },
                { header: 'Status', accessor: 'available_copies', cell: (row) => {
                  const availableCopies = row.available_copies || 0;
                  return <StatusBadge status={availableCopies > 0 ? `Available (${availableCopies})` : 'Borrowed'} variant={availableCopies > 0 ? 'success' : 'error'} />;
                }},
              ]}
              data={schoolBooks.filter(book => {
                const searchLower = bookSearchQuery.toLowerCase();
                return !bookSearchQuery || 
                  book.title?.toLowerCase().includes(searchLower) ||
                  book.author?.toLowerCase().includes(searchLower) ||
                  book.isbn?.toLowerCase().includes(searchLower);
              })}
              emptyMessage="No books match your search"
            />
          )}
        </Modal>
      )}


      <AlertOverlay
        show={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={hideAlert}
      />
    </div>
  );
}

export default SuperAdminSchools;
