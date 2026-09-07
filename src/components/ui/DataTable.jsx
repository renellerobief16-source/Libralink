import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  striped = false,
}) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const renderCellValue = (row, column, rowIndex) => {
    if (column.cell) {
      return column.cell(row, rowIndex);
    }

    const value = row[column.accessor];
    return value ?? '—';
  };

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden ${className}`}>
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
          <p className="text-xs text-slate-500 mt-1">There are no records matching your query.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200/80">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={[
                    'px-5 py-3.5 text-left',
                    'text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500',
                    alignmentClasses[column.align] || 'text-left',
                  ].join(' ')}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`transition-all duration-150 ${
                  striped && rowIndex % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                } hover:bg-blue-50/50 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={[
                      'px-5 py-3.5 text-sm text-slate-700 align-middle',
                      alignmentClasses[column.align] || 'text-left',
                      column.className || '',
                    ].join(' ')}
                    style={{
                      width: column.width,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    {renderCellValue(row, column, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
