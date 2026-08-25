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
    <div className="relative" ref={menuRef}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>

      {open && (
        <div className="absolute right-0 top-8 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                item.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
