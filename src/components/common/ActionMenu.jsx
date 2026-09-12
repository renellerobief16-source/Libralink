import { useState, useRef, useEffect } from "react";

function ActionMenu({ trigger, items }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">{trigger}</div>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 z-50 min-w-[165px] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick?.();
                setOpen(false);
              }}
              className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                item.danger
                  ? "text-rose-600 hover:bg-rose-50/80 active:bg-rose-100"
                  : "text-slate-700 hover:bg-slate-50 active:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.icon && <span className="flex-shrink-0 text-current">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
