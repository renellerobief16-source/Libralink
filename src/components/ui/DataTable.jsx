import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 text-sm text-slate-700">
                    {column.cell ? column.cell(row, rowIndex) : row[column.accessor]}
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
