import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Heart,
  History as ClockIcon,
  Mail,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";

const studentSearchFeatures = [
  ["Search books", "Find books by title, author, or subject", "/studentpage/search", Search],
  ["Favorites", "View your saved books", "/studentpage/favorites", Heart],
  ["Inbox", "View notifications and updates", "/studentpage/inbox", Mail],
  ["History", "View your borrowing history", "/studentpage/history", ClockIcon],
  ["Profile", "Manage your personal information", "/studentpage/profile", User],
  ["Settings", "Manage your account settings", "/studentpage/settings", Settings],
];

export function StudentHeaderSearch({ className = "" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryView = searchParams.get("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (categoryView) {
      setShowSuggestions(false);
    }
  }, [categoryView]);

  const goToSearch = () => {
    if (!searchQuery.trim()) return;
    navigate("/studentpage/search", { state: { query: searchQuery.trim() } });
    setShowSuggestions(false);
  };

  const matchingFeatures = studentSearchFeatures.filter(([label, description]) => {
    if (!searchQuery.trim()) return true;
    return `${label} ${description}`.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center text-slate-700">
        <Search className="h-5 w-5" />
      </div>
      <input
        type="text"
        value={searchQuery}
        placeholder="Search books, authors, or ISBN"
        aria-label="Search student portal"
        onChange={(event) => {
          const nextQuery = event.target.value;
          setSearchQuery(nextQuery);
          setShowSuggestions(!categoryView && nextQuery.length > 0);
        }}
        onKeyDown={(event) => event.key === "Enter" && goToSearch()}
        onFocus={() => !categoryView && searchQuery.length > 0 && setShowSuggestions(true)}
        onBlur={() => window.setTimeout(() => setShowSuggestions(false), 200)}
        className="h-12 w-full rounded-[50px] border-0 bg-[#E7E7E4] pl-12 pr-12 text-[16px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-600 focus:bg-[#E7E7E4] md:h-[54px] md:pr-14 md:text-base lg:h-[54px] lg:text-base"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setShowSuggestions(false);
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-black/5 hover:text-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {!categoryView && showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
          <div className="border-b border-[#EEF2F6] px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Student page</p>
          </div>
          <div className="p-2">
            {matchingFeatures.map(([label, description, path, FeatureIcon]) => (
              <button
                key={path}
                type="button"
                onClick={() => {
                  setShowSuggestions(false);
                  navigate(path, path === "/studentpage/search" ? { state: { query: searchQuery.trim() } } : undefined);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#DDE6EF] text-[#2563EB]">
                  <FeatureIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#0F172A]">{label}</span>
                  <span className="block truncate text-xs text-[#64748B]">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
              </button>
            ))}
            <button
              type="button"
              onClick={goToSearch}
              className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-[#EEF2F6] px-3 py-2.5 text-left text-sm font-medium text-[#2563EB] hover:bg-[#F8FAFC]"
            >
              <Search className="h-4 w-4" />
              Search for “{searchQuery}” in books
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
