import { useState, useEffect, useMemo } from 'react';
import { 
  FiGlobe, FiEdit3, FiSearch, FiPlus, FiGrid, FiList, 
  FiBook, FiMapPin, FiMail, FiPhone, FiCheckCircle, 
  FiActivity, FiLayers, FiRefreshCw, FiX, FiExternalLink, FiUploadCloud
} from 'react-icons/fi';
import api, { getBackendAssetUrl } from '../../../utils/api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { LoadingOverlay } from '../../../components/common/Loading';
import EmptyState from '../../../components/ui/EmptyState';
import useAlert from '../../../hooks/useAlert';

function SuperAdminSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  
  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [formData, setFormData] = useState({ 
    school_name: '', 
    school_code: '', 
    address: '', 
    contact_number: '', 
    email: '', 
    status: 'active', 
    logo: '' 
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoVersion, setLogoVersion] = useState(Date.now());

  // Books Modal
  const [showBooksModal, setShowBooksModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolBooks, setSchoolBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState('all');

  const { showSuccess, showError } = useAlert();

  const getLogoUrl = (logo) => {
    if (!logo) return '';
    const url = getBackendAssetUrl(logo);
    if (logo.startsWith('/uploads/')) {
      return `${url}?v=${logoVersion}`;
    }
    return url;
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/schools');
      const schoolList = response.data || (Array.isArray(response) ? response : []);
      setSchools(schoolList);
    } catch (error) {
      console.error('Error fetching schools:', error);
      showError('Failed to load schools directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingSchool(null);
    setFormData({ 
      school_name: '', 
      school_code: '', 
      address: '', 
      contact_number: '', 
      email: '', 
      status: 'active', 
      logo: '' 
    });
    setLogoFile(null);
    setLogoPreview('');
    setShowAddModal(true);
  };

  const handleEditSchool = (school, e) => {
    if (e) e.stopPropagation();
    setEditingSchool(school);
    setFormData({ 
      school_name: school.school_name || '', 
      school_code: school.school_code || '', 
      address: school.address || '', 
      contact_number: school.contact_number || '', 
      email: school.email || '', 
      status: school.status || 'active', 
      logo: school.logo || '' 
    });
    setLogoPreview(school.logo ? getLogoUrl(school.logo) : '');
    setLogoFile(null);
    setShowAddModal(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSchool = async (e) => {
    e?.preventDefault();
    if (!formData.school_name.trim()) {
      showError('School name is required');
      return;
    }
    if (!formData.school_code.trim()) {
      showError('School code is required (e.g. SRC, GNC)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        school_name: formData.school_name.trim(),
        school_code: formData.school_code.trim().toUpperCase(),
        address: formData.address.trim(),
        contact_number: formData.contact_number.trim(),
        email: formData.email.trim(),
        status: formData.status,
      };

      if (editingSchool) {
        const response = await api.put(`/schools/${editingSchool.school_id}`, payload);
        if (response && response.success) {
          if (logoFile) {
            const logoForm = new FormData();
            logoForm.append('logo', logoFile);
            await api.post(`/schools/${editingSchool.school_id}/logo`, logoForm, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setLogoVersion(Date.now());
          }
          showSuccess(`${formData.school_name} updated successfully!`);
          setShowAddModal(false);
          await fetchSchools();
        } else {
          showError(response?.message || 'Failed to update school.');
        }
      } else {
        const response = await api.post('/schools', payload);
        if (response && response.success) {
          const createdId = response.school_id;
          if (logoFile && createdId) {
            try {
              const logoForm = new FormData();
              logoForm.append('logo', logoFile);
              await api.post(`/schools/${createdId}/logo`, logoForm, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              setLogoVersion(Date.now());
            } catch (err) {
              console.error('Logo upload warning:', err);
            }
          }
          showSuccess(`${formData.school_name} registered into consortium!`);
          setShowAddModal(false);
          await fetchSchools();
        } else {
          showError(response?.message || 'Failed to add school.');
        }
      }
    } catch (error) {
      console.error('Error saving school:', error);
      showError(error?.data?.message || error?.message || 'Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSchoolBooks = async (school) => {
    setSelectedSchool(school);
    setShowBooksModal(true);
    setLoadingBooks(true);
    setBookSearchQuery('');
    setBookCategoryFilter('all');
    try {
      const response = await api.get(`/books/school?school_id=${school.school_id}`);
      setSchoolBooks(response.data || (Array.isArray(response) ? response : []));
    } catch (error) {
      console.error('Error fetching school books:', error);
      setSchoolBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      const matchesSearch = 
        !searchTerm.trim() ||
        school.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.school_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || 
        (school.status || 'active').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [schools, searchTerm, statusFilter]);

  const activeCount = schools.filter(s => s.status === 'active').length;
  const inactiveCount = schools.filter(s => s.status !== 'active').length;

  const bookCategories = useMemo(() => {
    const cats = new Set(schoolBooks.map(b => b.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [schoolBooks]);

  const filteredSchoolBooks = useMemo(() => {
    return schoolBooks.filter(book => {
      const q = bookSearchQuery.toLowerCase();
      const matchesSearch = !q ||
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q) ||
        book.isbn?.toLowerCase().includes(q);
      const matchesCategory = bookCategoryFilter === 'all' || book.category === bookCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [schoolBooks, bookSearchQuery, bookCategoryFilter]);

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      <LoadingOverlay show={loading} text="Loading consortium campuses..." />

      {/* ─────────────────────────────────────────────────────────────
          1. CONSORTIUM CAMPUSES HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30 mb-2">
            <FiGlobe className="w-3.5 h-3.5 text-blue-400" />
            Consortium Multi-Campus Network
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Campus Directory & Nodes
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Configure universities, partner colleges, autonomous library nodes, and inter-library lending status across the Libralink consortium.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={fetchSchools}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
            title="Refresh schools"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Button
            onClick={handleOpenAddModal}
            className="!bg-blue-600 hover:!bg-blue-500 !text-white !font-semibold !rounded-xl !px-4 !py-2.5 !shadow-lg !shadow-blue-600/30 flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Register New Campus
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY KPI CHIPS (Clean White Surfaces)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Campuses</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{schools.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
            <FiGlobe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Nodes</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            <FiCheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive Nodes</div>
            <div className="text-2xl font-black text-slate-500 mt-1">{inactiveCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
            <FiActivity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cross-Lending</div>
            <div className="text-2xl font-black text-blue-600 mt-1">Enabled</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
            <FiLayers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH, STATUS FILTER & VIEW TOGGLE (Clean White Surface)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campus by name, code, city..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-sm border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            {['all', 'active', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 font-semibold rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* View Mode */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card View"
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List View"
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CAMPUS CARDS (Clean Crisp White Surfaces)
      ───────────────────────────────────────────────────────────── */}
      {filteredSchools.length === 0 ? (
        <Card padding="lg" className="text-center py-12">
          <EmptyState
            icon={<FiGlobe className="w-12 h-12 text-slate-400" />}
            title={searchTerm || statusFilter !== 'all' ? 'No matching campuses found' : 'No campuses registered yet'}
            description={
              searchTerm || statusFilter !== 'all'
                ? 'Try clearing your search query or status filter.'
                : 'Get started by onboarding the first university or campus node to the consortium.'
            }
            action={{
              label: searchTerm ? 'Clear Filters' : 'Register First Campus',
              onClick: () => {
                if (searchTerm || statusFilter !== 'all') {
                  setSearchTerm('');
                  setStatusFilter('all');
                } else {
                  handleOpenAddModal();
                }
              }
            }}
          />
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchools.map((school) => {
            const isActive = school.status === 'active';
            const logoSrc = school.logo ? getLogoUrl(school.logo) : null;
            const initials = (school.school_code || school.school_name?.slice(0, 2) || 'CL').toUpperCase();

            return (
              <div
                key={school.school_id}
                onClick={() => handleViewSchoolBooks(school)}
                className="group relative bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden p-1 shadow-xs">
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt={`${school.school_name} Logo`}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="font-black text-lg text-blue-600">
                            {initials}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                          {school.school_code || 'CODE'}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          ID: #{school.school_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleEditSchool(school, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit campus settings"
                      >
                        <FiEdit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                    {school.school_name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{school.address || 'Address not configured'}</span>
                    </div>
                    {school.email && (
                      <div className="flex items-center gap-2">
                        <FiMail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{school.email}</span>
                      </div>
                    )}
                    {school.contact_number && (
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{school.contact_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isActive ? 'Active Node' : 'Suspended'}
                  </span>

                  <span className="text-xs font-medium text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <FiBook className="w-3.5 h-3.5" />
                    Catalog
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Campus / Institution</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Node Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map((school) => {
                  const isActive = school.status === 'active';
                  const logoSrc = school.logo ? getLogoUrl(school.logo) : null;
                  const initials = (school.school_code || school.school_name?.slice(0, 2) || 'CL').toUpperCase();

                  return (
                    <tr 
                      key={school.school_id}
                      onClick={() => handleViewSchoolBooks(school)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {logoSrc ? (
                              <img src={logoSrc} alt="" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <span className="font-bold text-xs text-blue-600">{initials}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">
                              {school.school_name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">ID: #{school.school_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {school.school_code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs">
                        {school.address || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs">
                        <div>{school.email || '—'}</div>
                        {school.contact_number && <div className="text-slate-400 mt-0.5">{school.contact_number}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleViewSchoolBooks(school)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <FiBook className="w-3.5 h-3.5" />
                            Books
                          </button>
                          <button
                            onClick={(e) => handleEditSchool(school, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                            title="Edit"
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. ADD / EDIT SCHOOL MODAL
      ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={editingSchool ? `Configure Campus: ${editingSchool.school_name}` : 'Onboard New Consortium Campus'}
          description="Enter institutional identity, unique consortium code, and local contact specifications."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSchool}
                disabled={isSubmitting}
                className="!bg-blue-600 hover:!bg-blue-500 !text-white flex items-center gap-2"
              >
                {isSubmitting && <FiRefreshCw className="w-4 h-4 animate-spin" />}
                {editingSchool ? 'Save Campus Changes' : 'Register Campus Node'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveSchool} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Campus Crest / Official Logo
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs relative">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <FiGlobe className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-sm font-medium text-slate-900 mb-1">
                    Upload PNG, JPG, or SVG emblem
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Recommended dimensions 400x400. Transparent background preferred.
                  </p>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors">
                    <FiUploadCloud className="w-3.5 h-3.5 text-blue-500" />
                    Browse Logo File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview('');
                        setLogoFile(null);
                        setFormData({ ...formData, logo: '' });
                      }}
                      className="ml-2 text-xs text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campus / Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  placeholder="e.g. Saint Rita College"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Consortium Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.school_code}
                  onChange={(e) => setFormData({ ...formData, school_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SRC"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold tracking-wider uppercase border border-slate-200 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Campus Physical Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Quiapo, Manila, Metro Manila"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Library Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="library@school.edu.ph"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="+63 912 345 6789"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Consortium Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="active">Active Node</option>
                  <option value="inactive">Suspended Node</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. CAMPUS BOOKS CATALOG MODAL
      ───────────────────────────────────────────────────────────── */}
      {showBooksModal && (
        <Modal
          isOpen={showBooksModal}
          onClose={() => {
            setShowBooksModal(false);
            setSelectedSchool(null);
            setSchoolBooks([]);
          }}
          title={
            <div className="flex items-center gap-3">
              <span>{selectedSchool?.school_name}</span>
              <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-700">
                {selectedSchool?.school_code}
              </span>
            </div>
          }
          description={`Catalog index showing ${schoolBooks.length} titles registered to this campus node.`}
          size="full"
          footer={
            <Button 
              variant="secondary"
              onClick={() => {
                setShowBooksModal(false);
                setSelectedSchool(null);
                setSchoolBooks([]);
              }}
            >
              Close Catalog
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  placeholder="Filter by title, author, ISBN..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl text-sm border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {bookSearchQuery && (
                  <button
                    onClick={() => setBookSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {bookCategories.length > 2 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Category:</span>
                  <select
                    value={bookCategoryFilter}
                    onChange={(e) => setBookCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-700"
                  >
                    {bookCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loadingBooks ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Querying campus catalog node...</p>
              </div>
            ) : filteredSchoolBooks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FiBook className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="font-semibold text-slate-700">No books found</div>
                <p className="text-xs text-slate-500 mt-1">
                  {bookSearchQuery ? 'Try adjusting your search criteria.' : 'This campus has not added any book titles to its catalog.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Author</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">ISBN</th>
                      <th className="px-4 py-3 text-center">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchoolBooks.map((book) => {
                      const avail = book.available_copies ?? 0;
                      return (
                        <tr key={book.book_id || book.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {book.title}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {book.author || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                              {book.category || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {book.isbn || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              avail > 0 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {avail > 0 ? `${avail} copies` : 'Borrowed Out'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SuperAdminSchools;
