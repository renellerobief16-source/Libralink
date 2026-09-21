import { useState } from "react";
import { Book, BookOpen } from "lucide-react";
import { getBackendAssetUrl } from "../../../utils/api";
import { getTopicBookCover } from "../../../utils/studentRecommendations";

/**
 * Returns a tasteful book cover gradient based on category or title
 */
function getCoverTheme(book) {
  const text = `${book?.category || ""} ${book?.title || ""}`.toLowerCase();
  if (text.includes("nurs") || text.includes("health") || text.includes("medic") || text.includes("bio")) {
    return {
      gradient: "from-emerald-600 via-teal-700 to-cyan-900",
      accent: "bg-emerald-400/20",
    };
  }
  if (text.includes("tech") || text.includes("computer") || text.includes("prog") || text.includes("code") || text.includes("data") || text.includes("ai")) {
    return {
      gradient: "from-blue-600 via-indigo-700 to-slate-900",
      accent: "bg-blue-400/20",
    };
  }
  if (text.includes("busin") || text.includes("acc") || text.includes("manag") || text.includes("econ") || text.includes("finan")) {
    return {
      gradient: "from-amber-600 via-orange-700 to-stone-900",
      accent: "bg-amber-400/20",
    };
  }
  if (text.includes("fict") || text.includes("novel") || text.includes("liter") || text.includes("poem")) {
    return {
      gradient: "from-rose-600 via-pink-700 to-purple-950",
      accent: "bg-pink-400/20",
    };
  }
  if (text.includes("law") || text.includes("crim") || text.includes("justic")) {
    return {
      gradient: "from-slate-700 via-zinc-800 to-neutral-950",
      accent: "bg-slate-400/20",
    };
  }
  return {
    gradient: "from-sky-700 via-blue-800 to-indigo-950",
    accent: "bg-white/15",
  };
}

/**
 * CartBookCover
 * Sleek 44x60px (or custom size) book cover thumbnail with
 * automatic backend URL resolution, error recovery, and aesthetic fallback.
 */
export default function CartBookCover({ book, className = "h-[60px] w-[44px] shrink-0" }) {
  const [imgError, setImgError] = useState(false);

  const rawCover =
    book?.cover_image ||
    book?.image ||
    book?.cover ||
    book?.image_url ||
    book?.cover_url ||
    book?.coverPic;

  let coverUrl = null;
  if (rawCover && typeof rawCover === "string" && rawCover.trim() !== "") {
    coverUrl = getBackendAssetUrl(rawCover);
  } else {
    // Check topic cover resolver
    coverUrl = getTopicBookCover ? getTopicBookCover(book) : null;
  }

  const theme = getCoverTheme(book);
  const showImage = Boolean(coverUrl) && !imgError;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200/90 shadow-2xs select-none transition-transform duration-200 ${className}`}
      title={book?.title || "Book"}
    >
      {/* 1. Real Image Cover */}
      {showImage && (
        <img
          src={coverUrl}
          alt={book?.title || "Book cover"}
          className="absolute inset-0 h-full w-full object-cover z-[2]"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      )}

      {/* 2. Elegant Stylized Fallback Cover (Mini Hardcover) */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-1 bg-gradient-to-br ${theme.gradient} text-white z-[1]`}
      >
        {/* Book spine highlight */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-white/25 shadow-xs" />

        {/* Top spine header */}
        <div className="pl-1.5 flex items-center justify-between">
          <div className={`h-1 w-2.5 rounded-full ${theme.accent}`} />
        </div>

        {/* Middle Icon */}
        <div className="flex flex-col items-center justify-center pl-1">
          <Book className="h-4 w-4 text-white/90 drop-shadow-xs" />
        </div>

        {/* Bottom Title / Category Pill */}
        <div className="pl-1">
          <div className="bg-black/30 backdrop-blur-xs rounded px-1 py-0.5 text-center">
            <span className="block text-[7px] font-bold text-white/95 uppercase tracking-wider truncate leading-tight">
              {book?.category || "Book"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
