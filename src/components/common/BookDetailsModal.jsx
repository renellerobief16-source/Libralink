import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
import { getBookCoverUrl } from '../../utils/bookCoverUtils';

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
  
  // Extract DDC Classification (either direct property, tagged in remarks/general_note, or valid DDC call number)
  const ddc = (book.ddc && book.ddc !== 'Unknown')
    ? book.ddc
    : (book.remarks?.match(/\[DDC:\s*([^\]]+)\]/i)?.[1]?.trim()) 
      || (book.general_note?.match(/\[DDC:\s*([^\]]+)\]/i)?.[1]?.trim()) 
      || (callNumber && /^\d{3}(\.\d+)?/.test(callNumber.trim()) ? callNumber.trim().match(/^\d{3}(\.\d+)?/)?.[0] : null)
      || null;

  const physicalDesc = book.physical_description || null;
  const series = book.series || book.series_title || null;
  
  // Clean remarks: strip raw [DDC: ...] prefix if present for aesthetic display
  const rawRemarks = book.remarks || book.general_note || null;
  const remarks = rawRemarks ? rawRemarks.replace(/\[DDC:\s*[^\]]+\]\s*/gi, '').trim() : null;
  
  const bookId = book.id || book.book_id;
  const copies = Array.isArray(book.book_copies) ? book.book_copies : [];
  const mainAccessionNumber = book.accession_number || book.accessionNumber || (copies.length > 0 ? copies[0].accession_number : null);

  const totalCopies = Number(book.total_copies ?? (copies.length > 0 ? copies.length : 1));
  const availableCopies = Number(book.available_copies ?? totalCopies);
  const isAvailable = availableCopies > 0;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
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
              {(() => {
                const cover = getBookCoverUrl(book);
                return cover ? (
                  <>
                    <img
                      src={cover}
                      alt={title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentElement?.querySelector('.detail-cover-fallback');
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
                );
              })()}
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

          {/* Bibliographic Classification & Location Grid (Clean 4-column layout) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* DDC Classification */}
            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 relative group">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FiBookmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">DDC</span>
                </div>
                {ddc && (
                  <button
                    type="button"
                    onClick={() => handleCopy(ddc, 'ddc')}
                    className="text-amber-500 hover:text-amber-800 p-0.5 cursor-pointer transition-colors"
                    title="Copy DDC Number"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-amber-900 truncate">
                {ddc || '—'}
              </p>
              {copiedField === 'ddc' && (
                <span className="text-[10px] text-emerald-600 font-semibold absolute bottom-1 right-2">
                  Copied!
                </span>
              )}
            </div>

            {/* Call Number */}
            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 relative group">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FiHash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">Call Number</span>
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
            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 relative group">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FiTag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">ISBN</span>
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

            {/* Shelf Location */}
            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1 min-w-0">
                <FiMapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider truncate">Shelf Location</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate" title={location}>
                {location}
              </p>
            </div>

            {/* Physical Description */}
            {physicalDesc && (
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50">
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
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <FiBookmark className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Series</span>
                </div>
                <p className="text-xs font-medium text-slate-800 truncate">
                  {series}
                </p>
              </div>
            )}
          </div>

          {/* Campus & Library Branch Location / Pickup Counter */}
          <div className="p-4 rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <FiMapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                    Campus Library Unit & Pickup Desk
                  </h3>
                  <p className="text-[11px] text-blue-700/80 font-medium">
                    Designated circulation counter where this physical copy is shelved and claimed
                  </p>
                </div>
              </div>
              {(() => {
                const rawLibName = String(book?.libraries?.name || book?.library_name || '').toLowerCase();
                const rawLibType = String(book?.libraries?.library_type || book?.library_type || '').toLowerCase();
                const libId = Number(book?.library_id || 0);
                const isSHS = [10, 11].includes(libId) || rawLibName.includes('shs') || rawLibName.includes('senior high') || rawLibName.includes('high school') || rawLibType === 'senior_high_school';
                const schoolCode = book?.schools?.school_code || book?.school_code || (String(book?.school_id) === '1' ? 'SRC' : 'GNC');
                const pickupDesk = isSHS ? `${schoolCode} SHS Library Desk` : `${schoolCode} College Circulation Desk`;

                return (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    book.is_from_other_school
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : (isSHS
                          ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                          : "bg-blue-100 text-blue-900 border-blue-300 font-bold")
                  }`}>
                    {book.is_from_other_school ? "Inter-School Partner Campus" : (isSHS ? "🎒 Senior High School Library" : "🏛️ College Library")}
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl border border-blue-200/70 bg-white/90 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Campus
                </span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span className="truncate">{book.schools?.school_name || book.school_name || (String(book.school_id) === '1' ? 'Santa Rita College' : 'Guagua National Colleges')}</span>
                </span>
              </div>

              <div className="rounded-xl border border-blue-200/70 bg-white/90 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Library Branch / Unit
                </span>
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  {(() => {
                    const rawLibName = String(book?.libraries?.name || book?.library_name || '').toLowerCase();
                    const rawLibType = String(book?.libraries?.library_type || book?.library_type || '').toLowerCase();
                    const libId = Number(book?.library_id || 0);
                    const isSHS = [10, 11].includes(libId) || rawLibName.includes('shs') || rawLibName.includes('senior high') || rawLibName.includes('high school') || rawLibType === 'senior_high_school';
                    return (
                      <>
                        <span>{isSHS ? '🎒' : '📚'}</span>
                        <span className="truncate">
                          {book.libraries?.name || book.library_name || (isSHS ? 'Senior High School Library' : 'College Library')}
                        </span>
                      </>
                    );
                  })()}
                </span>
              </div>

              <div className="rounded-xl border border-blue-200/70 bg-white/90 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Pickup Counter
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5" title={(() => {
                  const rawLibName = String(book?.libraries?.name || book?.library_name || '').toLowerCase();
                  const rawLibType = String(book?.libraries?.library_type || book?.library_type || '').toLowerCase();
                  const libId = Number(book?.library_id || 0);
                  const isSHS = [10, 11].includes(libId) || rawLibName.includes('shs') || rawLibName.includes('senior high') || rawLibName.includes('high school') || rawLibType === 'senior_high_school';
                  const schoolCode = book?.schools?.school_code || book?.school_code || (String(book?.school_id) === '1' ? 'SRC' : 'GNC');
                  return `${schoolCode} ${isSHS ? 'SHS Library Desk' : 'College Circulation Desk'}`;
                })()}>
                  <span>📍</span>
                  <span className="truncate">
                    {(() => {
                      const rawLibName = String(book?.libraries?.name || book?.library_name || '').toLowerCase();
                      const rawLibType = String(book?.libraries?.library_type || book?.library_type || '').toLowerCase();
                      const libId = Number(book?.library_id || 0);
                      const isSHS = [10, 11].includes(libId) || rawLibName.includes('shs') || rawLibName.includes('senior high') || rawLibName.includes('high school') || rawLibType === 'senior_high_school';
                      const schoolCode = book?.schools?.school_code || book?.school_code || (String(book?.school_id) === '1' ? 'SRC' : 'GNC');
                      return `${schoolCode} ${isSHS ? 'SHS Desk' : 'College Desk'} (${location || 'Main Stacks'})`;
                    })()}
                  </span>
                </span>
              </div>
            </div>

            {/* If title has multiple holdings across campus libraries */}
            {Array.isArray(book.locations) && book.locations.length > 1 && (
              <div className="mt-2 pt-2 border-t border-blue-200/60">
                <span className="text-[10.5px] font-bold text-blue-950 block mb-1.5">
                  Other Library Holdings for this Title:
                </span>
                <div className="flex flex-wrap gap-2">
                  {book.locations.map((loc, idx) => (
                    <span 
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold border ${
                        loc.is_current 
                          ? "bg-blue-600 text-white border-blue-700 shadow-2xs" 
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{loc.library_name} ({loc.campus_code || 'GNC'}):</span>
                      <strong className={loc.is_current ? "text-white" : "text-emerald-700"}>{loc.available_copies} avail</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Physical Copy Holdings & Accession Registry */}
          <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <FiLayers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Physical Copies & Accession Numbers ({copies.length > 0 ? copies.length : totalCopies} { (copies.length > 0 ? copies.length : totalCopies) === 1 ? 'Copy' : 'Copies' })
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {availableCopies} Available on Shelf
              </span>
            </div>

            {copies.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Accession Number</th>
                      <th className="py-2 px-3">Barcode</th>
                      <th className="py-2 px-3">Shelf Location</th>
                      <th className="py-2 px-3">Condition</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {copies.map((copy, idx) => {
                      const copyStatus = copy.status || 'available';
                      const isCopyAvail = copyStatus === 'available';
                      const accNum = copy.accession_number || (idx === 0 ? mainAccessionNumber : null) || `ACC-${copy.copy_id || idx + 1}`;
                      return (
                        <tr key={copy.copy_id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                {accNum}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(accNum, `acc_${idx}`)}
                                className="text-slate-300 hover:text-blue-600 cursor-pointer p-0.5"
                                title="Copy Accession Number"
                              >
                                <FiCopy className="w-3 h-3" />
                              </button>
                              {copiedField === `acc_${idx}` && (
                                <span className="text-[9px] text-emerald-600 font-bold">Copied!</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500">
                            {copy.barcode || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {copy.shelf_location || location}
                          </td>
                          <td className="py-2 px-3 capitalize text-slate-600">
                            {copy.condition || 'Good'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCopyAvail 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isCopyAvail ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span className="capitalize">{copyStatus}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Primary Accession:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-xs">
                    {mainAccessionNumber || 'ACC-AUTO'}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {totalCopies} {totalCopies === 1 ? 'copy' : 'copies'} tracked
                </span>
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
    </div>,
    document.body
  );
}
