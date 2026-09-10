import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Book,
  GraduationCap,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { API_ORIGIN } from "../../../utils/api";
import { useDraggableScroll } from "../../../hooks/useDraggableScroll";
import {
  STUDENT_TOPICS,
  STUDENT_COURSES,
  getStudentPreferences,
  getRecommendedBooks,
  getTopicBookCover,
} from "../../../utils/studentRecommendations";
import { StudentPreferencesModal } from "./StudentPreferencesModal";

export function StudentRecommendedShelf({ books = [], onBookClick, onBorrowClick }) {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState(getStudentPreferences());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "course" | topic.id
  const [networkBooks, setNetworkBooks] = useState([]);

  const {
    ref: shelfRef,
    isDragging,
    canScrollLeft,
    canScrollRight,
    scrollLeftAction,
    scrollRightAction,
    events,
  } = useDraggableScroll({ scrollAmount: 480 });

  // Listen to preference updates
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setPreferences(e.detail);
      } else {
        setPreferences(getStudentPreferences());
      }
    };

    window.addEventListener("libralink-preferences-updated", handleUpdate);
    return () => window.removeEventListener("libralink-preferences-updated", handleUpdate);
  }, []);

  // Fetch network topic books (e.g. Nursing, Medical) across connected schools
  useEffect(() => {
    const fetchNetworkBooks = async () => {
      const prefs = preferences;
      const isNursing = prefs.course === "BSN" || 
        (prefs.course && prefs.course.toLowerCase().includes("nursing")) || 
        prefs.favorite_topics?.includes("science_health");

      let queryTerm = "";
      if (isNursing) queryTerm = "nursing";
      else if (prefs.course === "BSIT" || prefs.favorite_topics?.includes("tech_coding")) queryTerm = "technology";
      else if (prefs.course === "BSBA" || prefs.favorite_topics?.includes("business_finance")) queryTerm = "management";

      if (queryTerm) {
        try {
          const res = await api.get(`/books?q=${encodeURIComponent(queryTerm)}&limit=30&group=true`);
          if (res.data?.data && Array.isArray(res.data.data)) {
            const mapped = res.data.data.map(b => ({
              id: b.book_id,
              book_id: b.book_id,
              title: b.title || "Untitled",
              author: b.author || "Unknown Author",
              school_id: b.school_id,
              school_name: b.schools?.school_name || "Partner Campus",
              category: b.categories?.category_name || (isNursing ? "Medical & Health" : "Academic"),
              available_copies: b.available_copies ?? 1,
              real_time_status: (b.available_copies > 0 || b.is_available) ? "available" : "unavailable",
              cover_image: b.cover_image || "",
              is_partner_book: true,
            }));
            setNetworkBooks(mapped);
          }
        } catch (err) {
          console.error("Error fetching network books:", err);
        }
      }
    };
    fetchNetworkBooks();
  }, [preferences]);

  // Merge local books with network books (preventing duplicates)
  const allBooksPool = React.useMemo(() => {
    const existingIds = new Set(books.map(b => String(b.book_id || b.id)));
    const merged = [...books];
    for (const nb of networkBooks) {
      if (!existingIds.has(String(nb.book_id || nb.id))) {
        merged.push(nb);
      }
    }
    return merged;
  }, [books, networkBooks]);

  const recommendedBooks = getRecommendedBooks(allBooksPool, preferences, 24);

  // Filter books based on active tab
  const filteredBooks = recommendedBooks.filter((book) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "course") {
      const courseCode = preferences.course?.toLowerCase();
      const bCourse = (book.course || "").toLowerCase();
      const bSubj = (book.subject || "").toLowerCase();
      const bTitle = (book.title || "").toLowerCase();
      return bCourse.includes(courseCode) || bSubj.includes(courseCode) || bTitle.includes(courseCode);
    }
    // Filter by topic ID
    const topic = STUDENT_TOPICS.find((t) => t.id === activeFilter);
    if (!topic) return true;
    const bCat = (book.category_name || book.category || "").toLowerCase();
    const bSubj = (book.subject || "").toLowerCase();
    const bTitle = (book.title || "").toLowerCase();
    return topic.categoryKeywords.some(
      (kw) => bCat.includes(kw) || bSubj.includes(kw) || bTitle.includes(kw)
    );
  });

  const selectedCourseObj = STUDENT_COURSES.find(
    (c) => c.code === preferences.course || c.name === preferences.course
  );
  const selectedTopicsList = STUDENT_TOPICS.filter((t) =>
    preferences.favorite_topics?.includes(t.id)
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Personalized Reading
            </p>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Recommended for You
          </h3>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {preferences.course ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                {selectedCourseObj?.code || preferences.course}
              </span>
            ) : null}

            {selectedTopicsList.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                {selectedTopicsList.slice(0, 3).map((t) => t.badge).join(", ")}
                {selectedTopicsList.length > 3 ? ` +${selectedTopicsList.length - 3}` : ""}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Choose your topics to tailor recommendations
              </span>
            )}
          </div>
        </div>

        {/* Actions & Arrows */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition active:scale-95"
            title="Edit your course and favorite topics"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            Preferences
          </button>

          <button
            type="button"
            onClick={() => navigate("/studentpage/search")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition mr-1"
          >
            Browse All →
          </button>

          {/* Desktop Left/Right navigation arrows */}
          <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={scrollLeftAction}
              disabled={!canScrollLeft}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous books"
              aria-label="Previous books"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={scrollRightAction}
              disabled={!canScrollRight}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next books"
              aria-label="Next books"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips / Topic Quick-Toggles */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            activeFilter === "all"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>All Recommendations ({recommendedBooks.length})</span>
          </span>
        </button>

        {preferences.course && (
          <button
            type="button"
            onClick={() => setActiveFilter("course")}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "course"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            {selectedCourseObj?.code || "My Course"}
          </button>
        )}

        {selectedTopicsList.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => setActiveFilter(topic.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === topic.id
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {topic.badge}
          </button>
        ))}
      </div>

      {/* Books Shelf with PICTURES - Horizontal Draggable Carousel */}
      {filteredBooks.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
          <Book className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            No matching books found for this category
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Try switching to "All Recommendations" or adding more topics in Preferences.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
          >
            <Sparkles className="h-3.5 w-3.5" /> Set Favorite Topics
          </button>
        </div>
      ) : (
        <div className="relative group/shelf">
          <div
            ref={shelfRef}
            {...events}
            className={`flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide select-none transition-all ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ scrollSnapType: isDragging ? "none" : "x proximity" }}
          >
            {filteredBooks.map((book) => {
              const cover = getTopicBookCover(book);
              const ownerName =
                book.schools?.school_name || book.school_name || "Campus Library";
              const categoryName =
                book.categories?.category_name || book.category || "General";
              const isAvailable =
                book.is_available || book.available || book.real_time_status === "available";

              return (
                <div
                  key={book.book_id || book.id}
                  onClick={() => {
                    if (onBookClick) onBookClick(book);
                    else navigate("/studentpage/search", { state: { query: book.title } });
                  }}
                  className="group flex flex-col justify-between w-[150px] sm:w-[170px] md:w-[185px] shrink-0 rounded-2xl bg-transparent p-1 transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 cursor-pointer"
                  style={{ scrollSnapAlign: "start" }}
                >
                <div>
                  {/* Book Picture with Hover Animation & Badges */}
                  <div className="relative mb-2 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs group-hover:shadow-md transition">
                    {cover ? (
                      <img
                        src={cover}
                        alt={book.title}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-300 z-[1]"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : null}

                    {/* Grey L.png Fallback if no photo */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-2 text-center select-none z-0">
                      <img
                        src="/L.png"
                        alt="Libralink"
                        className="h-10 w-10 sm:h-12 sm:w-12 object-contain grayscale opacity-35 drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="mt-1.5 line-clamp-1 max-w-[85%] text-center text-[9px] font-semibold text-slate-400">
                        {categoryName}
                      </span>
                    </div>

                    {/* 3D Spine crease */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/20 to-transparent z-[2]" />

                    {/* Top Reason Badge */}
                    {book.recommendationReason && (
                      <div className="absolute top-1.5 left-1.5 right-1.5">
                        <span className="block truncate rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[8.5px] font-bold text-white backdrop-blur-xs">
                          {book.recommendationReason}
                        </span>
                      </div>
                    )}

                    {/* Bottom Category Badge */}
                    <div className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-md bg-blue-950/60 px-1.5 py-0.5 text-[8.5px] font-semibold text-white backdrop-blur-xs">
                      {categoryName}
                    </div>
                  </div>

                  {/* Campus Library Badge */}
                  <div className="mb-1">
                    <span className="inline-block max-w-full truncate rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      {ownerName}
                    </span>
                  </div>

                  {/* Title & Author */}
                  <h4
                    className="h-8 overflow-hidden text-ellipsis text-xs font-bold leading-4 text-slate-900 line-clamp-2 group-hover:text-blue-600 transition"
                    title={book.title}
                  >
                    {book.title}
                  </h4>
                  <p className="text-slate-500 text-[11px] truncate mt-0.5">
                    {book.author || "Unknown Author"}
                  </p>
                </div>

                {/* Status & Arrow */}
                <div className="mt-2 flex items-center justify-between pt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                      isAvailable ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAvailable ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {isAvailable ? "Available" : "Requested"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Preferences Dialog */}
      <StudentPreferencesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPreferences={preferences}
        onSaved={(newPrefs) => setPreferences(newPrefs)}
      />
    </section>
  );
}
