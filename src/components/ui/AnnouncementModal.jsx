import { useState } from 'react';
import Button from './Button';
import Modal from './Modal';
import { createAnnouncement } from '../../utils/api';

/**
 * A modal for creating an announcement from the Super Admin or Librarian Admin
 * portals.
 *
 * The announcement scope is determined server-side from the caller's role:
 * - Super Admin → global (all schools)
 * - Librarian Admin → that librarian admin's school only
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setContent('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Both a title and message are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { data, error: apiError } = await createAnnouncement(title.trim(), content.trim());

    if (apiError) {
      setError(apiError.response?.data?.message || 'Failed to create the announcement. Please try again.');
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
      title="Create Announcement"
      description={
        superAdmin
          ? 'This will be broadcast to all schools and every active user in LibraLink.'
          : 'This will be broadcast to every active user at your school.'
      }
      size="md"
      footer={
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Announcement'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Library Closed for Maintenance"
            className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Provide the full announcement text…"
            rows={5}
            className="w-full resize-y rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </Modal>
  );
};

export default AnnouncementModal;