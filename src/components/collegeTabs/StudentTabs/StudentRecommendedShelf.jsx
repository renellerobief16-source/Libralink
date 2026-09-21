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
import api from "../../../utils/api";
import { useDraggableScroll } from "../../../hooks/useDraggableScroll";
import {
  STUDENT_TOPICS,
  STUDENT_COURSES,
  getStudentPreferences,
  getRecommendedBooks,
  getTopicBookCover,
} from "../../../utils/studentRecommendations";
import { StudentPreferencesModal } from "./StudentPreferencesModal";

export function StudentRecommendedShelf({ books = [], onBookClick }) {
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
      const isNursing =
        prefs.course === "BSN" ||
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
            const mapped = res.data.data.map((b) => ({
              id: b.book_id,
              book_id: b.book_id,
              title: b.title || "Untitled",
              author: b.author || "Unknown Author",
              school_id: b.school_id,
              school_name: b.schools?.school_name || "Partner Campus",
              category: b.categories?.category_name || (isNursing ? "Medical & Health" : "Academic"),
              available_copies: b.available_copies ?? 1,
              real_time_status: b.available_copies > 0 || b.is_available ? "available" : "unavailable",
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
    const existingIds = new Set(books.map((b) => String(b.book_id || b.id)));
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
    <section className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-5 w-full text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100/80">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Recommended for You
            </h3>
            <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
              {preferences.course ? `Curated for ${selectedCourseObj?.code || preferences.course}` : "Personalized academic selection"}
            </p>
          </div>
        </div>

        {/* Actions & Arrows */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 hover:border-blue-200 transition-all active:scale-95"
            title="Edit your course and favorite topics"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span className="hidden sm:inline">Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/studentpage/search")}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition px-1"
          >
            Browse All →
          </button>

          {/* Desktop Left/Right navigation arrows */}
          <div className="hidden sm:flex items-center gap-1 border-l border-slate-200/80 pl-2">
            <button
              type="button"
              onClick={scrollLeftAction}
              disabled={!canScrollLeft}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous books"
              aria-label="Previous books"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={scrollRightAction}
              disabled={!canScrollRight}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next books"
              aria-label="Next books"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips / Topic Quick-Toggles */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
            activeFilter === "all"
              ? "bg-slate-900 text-white shadow-2xs"
              : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          All ({recommendedBooks.length})
        </button>

        {preferences.course && (
          <button
            type="button"
            onClick={() => setActiveFilter("course")}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              activeFilter === "course"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            <GraduationCap className="h-3 w-3" />
            {selectedCourseObj?.code || "My Course"}
          </button>
        )}

        {selectedTopicsList.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => setActiveFilter(topic.id)}
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              activeFilter === topic.id
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            {topic.badge}
          </button>
        ))}
      </div>

      {/* Books Shelf with Compact Minimalist Cards */}
      {filteredBooks.length === 0 ? (
        <div className="py-8 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200/80 my-2">
          <Book className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            No matching books found for this category
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
            Try switching to "All" or updating your topics in Preferences.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-2xs active:scale-95"
          >
            <Sparkles className="h-3 w-3" /> Set Favorite Topics
          </button>
        </div>
      ) : (
        <div className="relative group/shelf">
          <div
            ref={shelfRef}
            {...events}
            className={`flex gap-2.5 sm:gap-3 overflow-x-auto pb-2.5 pt-1 px-0.5 scrollbar-hide select-none transition-all ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ scrollSnapType: isDragging ? "none" : "x proximity" }}
          >
            {filteredBooks.map((book) => {
              const cover = getTopicBookCover(book);
              const categoryName = book.categories?.category_name || book.category || "General";
              const isAvailable = book.is_available || book.available || book.real_time_status === "available";

              return (
                <div
                  key={book.book_id || book.id}
                  onClick={() => {
                    if (onBookClick) onBookClick(book);
                    else navigate("/studentpage/search", { state: { query: book.title } });
                  }}
                  className="group flex flex-col justify-between w-[116px] sm:w-[128px] md:w-[138px] shrink-0 rounded-2xl bg-transparent p-0.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div>
                    {/* Clean Rounded Compact Cover */}
                    <div className="relative mb-2 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200/70 shadow-2xs transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-sm">
                      {cover ? (
                        <img
                          src={cover}
                          alt={book.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : null}

                      {/* Minimalist Graphic Fallback */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-2 text-center select-none">
                        <BookOpen className="h-5 w-5 text-slate-300 mb-1" />
                        <span className="text-[8px] font-semibold text-slate-400 line-clamp-1">
                          {categoryName}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4
                      className="text-[11px] sm:text-xs font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
                      title={book.title}
                    >
                      {book.title}
                    </h4>

                    {/* Author */}
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {book.author && book.author !== "Unknown Author" ? book.author : "Academic"}
                    </p>
                  </div>

                  {/* Clean Availability Indicator */}
                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100/80">
                    <span
                      className={`inline-flex items-center gap-1 text-[9.5px] font-semibold ${
                        isAvailable ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {isAvailable ? "Available" : "Checked Out"}
                    </span>

                    <span className="text-[9.5px] font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
                      View →
                    </span>
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

export default StudentRecommendedShelf;
