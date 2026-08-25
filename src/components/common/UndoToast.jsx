import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiRotateCcw } from 'react-icons/fi';

function UndoToast({ message, onUndo, duration = 5000 }) {
  const [timeLeft, setTimeLeft] = useState(duration / 1000);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExiting(true);
          setTimeout(() => onUndo(null), 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onUndo]);

  const handleUndo = () => {
    setIsExiting(true);
    setTimeout(() => onUndo('undo'), 300);
  };

  if (timeLeft === 0 && isExiting) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[420px] -translate-x-1/2 transition-all duration-300 ${
        isExiting ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="relative flex items-center gap-3 overflow-hidden rounded-full border border-white/50 bg-white/35 px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-[11px] font-bold text-slate-700">
          <FiCheck className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-slate-800">{message}</div>
        </div>

        <button
          type="button"
          onClick={handleUndo}
          className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
        >
          <FiRotateCcw className="h-3 w-3" />
          Undo
        </button>

        <button
          type="button"
          onClick={() => onUndo(null)}
          className="ml-1 text-slate-500 transition hover:text-slate-700"
          aria-label="Close notification"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default UndoToast;
