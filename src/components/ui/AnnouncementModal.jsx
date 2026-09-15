import { useState } from 'react';
import Button from './Button';
import Modal from './Modal';
import { createAnnouncement } from '../../utils/api';
import { FiUsers, FiAlertCircle, FiCheck, FiBell, FiShield, FiUser } from 'react-icons/fi';

/**
 * A modal for creating an announcement from the Super Admin or Librarian Admin portals.
 *
 * @param {object} props
 * @param {boolean} props.open        Whether the modal is open
 * @param {() => void} props.onClose   Close handler
 * @param {(data: object) => void} props.onCreated  Called with created announcement
 * @param {boolean} props.superAdmin  Whether the current editor is a Super Admin
 */
const AnnouncementModal = ({ open, onClose, onCreated, superAdmin = false }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setContent('');
    setTargetAudience('all');
    setPriority('normal');
    setError('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Both an announcement title and message are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { data, error: apiError } = await createAnnouncement(
      title.trim(), 
      content.trim(),
      targetAudience,
      priority
    );

    if (apiError) {
      setError(apiError.response?.data?.message || 'Failed to publish the announcement. Please try again.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    reset();
    onClose();
    if (onCreated) onCreated(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Create Campus Announcement"
      description={
        superAdmin
          ? 'Broadcast an official announcement to all institutions and active users across LibraLink.'
          : 'Broadcast an official library announcement to students and librarians at your school.'
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FiBell className="w-3.5 h-3.5 text-blue-600" />
            <span>Instant notification broadcast</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Audience Target & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FiUsers className="w-3.5 h-3.5 text-blue-600" />
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTargetAudience('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetAudience === 'all'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Users
              </button>
              <button
                type="button"
                onClick={() => setTargetAudience('students')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetAudience === 'students'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Students
              </button>
              <button
                type="button"
                onClick={() => setTargetAudience('librarians')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetAudience === 'librarians'
                    ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Librarians
              </button>
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FiAlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Priority Level
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  priority === 'normal'
                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  priority === 'urgent'
                    ? 'bg-rose-50 text-rose-700 shadow-xs border border-rose-200 font-bold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                🚨 Urgent Alert
              </button>
            </div>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Announcement Title <span className="text-rose-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midterm Book Return Drive & Extended Library Hours"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Announcement Details <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Provide clear details, instructions, dates, or policy updates for readers..."
            rows={5}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all leading-relaxed"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AnnouncementModal;