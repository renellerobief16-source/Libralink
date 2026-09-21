import React, { useState } from 'react';
import { 
  FiX, 
  FiBook, 
  FiBookmark, 
  FiCalendar, 
  FiMapPin, 
  FiHash, 
  FiTag, 
  FiUsers, 
  FiEdit, 
  FiCopy, 
  FiLayers,
  FiInfo
} from 'react-icons/fi';
import { getBackendAssetUrl } from '../../utils/api';

export default function BookDetailsModal({ 
  book, 
  onClose, 
  onOpenBorrowers, 
  onEdit 
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!book) return null;

  const title = book.title || 'Untitled Book';
  const author = book.author || 'Unknown Author';
  const publisher = book.publisher || null;
  const edition = book.edition || null;
  const year = book.year || book.publication_year || book.copyright_year || null;
  const category = book.category || book.categories?.category_name || 'General Collection';
  const location = book.location || book.shelf_location || 'Main Stacks';
  const callNumber = (book.callNumber && book.callNumber !== 'Unknown') 
    ? book.callNumber 
    : (book.call_number && book.call_number !== 'Unknown' ? book.call_number : null);
  const isbn = (book.isbn && book.isbn !== 'Unknown') ? book.isbn : null;
  const physicalDesc = book.physical_description || null;
  const series = book.series || book.series_title || null;
  const remarks = book.remarks || book.general_note || null;
  const bookId = book.id || book.book_id;

  const totalCopies = Number(book.total_copies ?? (Array.isArray(book.book_copies) ? book.book_copies.length : 1));
  const availableCopies = Number(book.available_copies ?? totalCopies);
  const isAvailable = availableCopies > 0;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <FiBook className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Book Details
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Catalog Record & Inventory Information
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close dialog (Esc)"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Top Showcase: Cover + Core Info */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* 3D Book Cover Presentation */}
            <div className="relative w-32 sm:w-36 h-44 sm:h-52 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-slate-900/15 border border-slate-200 bg-slate-900 mx-auto sm:mx-0">
              {book.cover_image ? (
                <>
                  <img
                    src={getBackendAssetUrl(book.cover_image)}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.detail-cover-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  {/* 3D Spine Overlay */}
                  <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-white/15 to-transparent pointer-events-none" />
                  <div className="hidden detail-cover-fallback absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 items-center justify-center p-3 text-center text-white flex-col gap-2">
                    <FiBook className="w-10 h-10 text-blue-200" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-100 line-clamp-3">
                      {title}
                    </span>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 flex flex-col items-center justify-center p-3 text-center text-white">
                  <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-white/20 to-transparent pointer-events-none" />
                  <FiBook className="w-10 h-10 text-blue-200 mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-100 line-clamp-3 leading-tight">
                    {title}
                  </span>
                </div>
              )}
            </div>

            {/* Core Info & Badges */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  <FiBookmark className="w-3.5 h-3.5 text-blue-600" />
                  <span>{category}</span>
                </span>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isAvailable 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{isAvailable ? `${availableCopies} of ${totalCopies} Available` : `All ${totalCopies} Loaned Out`}</span>
                </span>

                {bookId && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200">
                    ID: #{bookId}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {title}
                </h1>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  By <span className="text-slate-900 font-bold">{author}</span>
                </p>
              </div>

              {/* Publisher & Edition info line */}
              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                {publisher && (
                  <p>
                    <span className="font-semibold text-slate-700">Publisher:</span> {publisher}
                  </p>
                )}
                {edition && (
                  <p>
                    <span className="font-semibold text-slate-700">Edition:</span> {edition}
                  </p>
                )}
                {year && (
                  <p>
                    <span className="font-semibold text-slate-700">Publication Year:</span> {year}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bibliographic Classification & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Shelf Location */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <FiMapPin className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Shelf Location</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {location}
              </p>
            </div>

            {/* Call Number */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 relative group">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <div className="flex items-center gap-2">
                  <FiHash className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Call Number</span>
                </div>
                {callNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopy(callNumber, 'callNumber')}
                    className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                    title="Copy Call Number"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">
                {callNumber || '—'}
              </p>
              {copiedField === 'callNumber' && (
                <span className="text-[10px] text-emerald-600 font-semibold absolute bottom-1 right-2">
                  Copied!
                </span>
              )}
            </div>

            {/* ISBN */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 relative group">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <div className="flex items-center gap-2">
                  <FiTag className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">ISBN</span>
                </div>
                {isbn && (
                  <button
                    type="button"
                    onClick={() => handleCopy(isbn, 'isbn')}
                    className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                    title="Copy ISBN"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">
                {isbn ? `#${isbn}` : '—'}
              </p>
              {copiedField === 'isbn' && (
                <span className="text-[10px] text-emerald-600 font-semibold absolute bottom-1 right-2">
                  Copied!
                </span>
              )}
            </div>

            {/* Physical Description */}
            {physicalDesc && (
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <FiLayers className="w-4 h-4 text-indigo-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Physical Desc</span>
                </div>
                <p className="text-xs font-medium text-slate-800 line-clamp-2" title={physicalDesc}>
                  {physicalDesc}
                </p>
              </div>
            )}

            {/* Series */}
            {series && (
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <FiBookmark className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Series</span>
                </div>
                <p className="text-xs font-medium text-slate-800">
                  {series}
                </p>
              </div>
            )}
          </div>

          {/* Remarks / General Notes */}
          {remarks && (
            <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-500 mb-1.5">
                <FiInfo className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider">General Notes & Remarks</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {remarks}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenBorrowers && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBorrowers(book);
                }}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="View Borrowers, Reservations & History"
              >
                <FiUsers className="w-3.5 h-3.5" />
                <span>Borrowers & History</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(book);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Edit Book Record"
              >
                <FiEdit className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Book</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
