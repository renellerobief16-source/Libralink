import { FiLoader } from 'react-icons/fi';

function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <FiLoader className="w-full h-full text-blue-600" />
      </div>
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {text}
        </p>
      )}
    </div>
  );
}

function LoadingOverlay({ 
  show = false, 
  text = 'Loading...', 
  size = 'md',
  transparent = false 
}) {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none ${transparent ? 'bg-transparent' : 'bg-white/80 backdrop-blur-sm'}`}>
      <div className="flex flex-col items-center gap-4 pointer-events-auto">
        <LoadingSpinner size={size} text={text} />
      </div>
    </div>
  );
}

function PageLoader({ 
  text = 'Loading...' 
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 animate-spin">
          <FiLoader className="w-full h-full text-blue-600" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {text}
        </p>
      </div>
    </div>
  );
}

function CardLoader({ 
  count = 3, 
  height = 'h-24' 
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton ${height} rounded-xl animate-pulse`}
        />
      ))}
    </div>
  );
}

function TableLoader({ 
  rows = 5, 
  columns = 4 
}) {
  return (
    <div className="space-y-2">
      <div className="skeleton h-10 rounded animate-pulse" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="skeleton h-12 flex-1 rounded animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export { 
  LoadingSpinner, 
  LoadingOverlay, 
  PageLoader, 
  CardLoader, 
  TableLoader 
};