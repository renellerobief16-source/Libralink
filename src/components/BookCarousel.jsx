import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiBookOpen, FiChevronLeft, FiChevronRight, FiStar } from "react-icons/fi";
import "../styles/BookCarousel.css";

const realisticBooks = [
  {
    id: 1,
    title: "Relativity: The Special & General Theory",
    author: "Albert Einstein",
    course: "Physics & Natural Science",
    rating: "5.0",
    coverImage: "/books/einstein.jpg",
    edition: "Classic Physics",
    tag: "PHYSICS & RELATIVITY"
  },
  {
    id: 2,
    title: "Shakespeare: The Complete Works",
    author: "William Shakespeare",
    course: "Literature & Humanities",
    rating: "4.9",
    coverImage: "/books/shakespeare.jpg",
    edition: "Scholarly Edition",
    tag: "LITERATURE & DRAMA"
  },
  {
    id: 3,
    title: "Introduction to Algorithms & Data Structures",
    author: "Dr. Eliza Vance & Prof. Liam Chen",
    course: "Computer Science / BSIT",
    rating: "4.9",
    coverImage: "/books/algorithms.jpg",
    edition: "4th Edition",
    tag: "COMPUTER SCIENCE"
  },
  {
    id: 4,
    title: "Human Anatomy & Physiology & Nursing",
    author: "Elaine Marieb & Katja Hoehn",
    course: "Nursing / BSN Health",
    rating: "5.0",
    coverImage: "/books/nursing.jpg",
    edition: "9th Clinical Ed.",
    tag: "HEALTH & NURSING"
  },
  {
    id: 5,
    title: "Principles of Economics & Financial Accounting",
    author: "Eleanor Davies & Jonathan Thorne",
    course: "Accountancy / BSA / BSBA",
    rating: "4.8",
    coverImage: "/books/economics.jpg",
    edition: "Academic 4th Ed.",
    tag: "BUSINESS & FINANCE"
  },
  {
    id: 6,
    title: "Psychology: The Science of Mind & Behavior",
    author: "Dr. Eliza Vance & Dr. Liam Chen",
    course: "Psychology / Social Science",
    rating: "4.9",
    coverImage: "/books/psychology.jpg",
    edition: "1st Press Edition",
    tag: "PSYCHOLOGY & MIND"
  },
  {
    id: 7,
    title: "Engineering Mechanics: Statics & Dynamics",
    author: "Rafael Navarro & Samuel Chen",
    course: "Engineering / BSCE / BSEE",
    rating: "4.8",
    coverImage: "/books/engineering.jpg",
    edition: "7th Edition",
    tag: "ENGINEERING"
  },
  {
    id: 8,
    title: "Readings in Philippine History",
    author: "Manuel Quezon Jr. & Carmen Nakpil",
    course: "General Education / CHED",
    rating: "4.9",
    coverImage: "/books/history.jpg",
    edition: "Heritage Series",
    tag: "PHILIPPINE HISTORY"
  },
];

function circularDistance(index, activeIndex, total) {
  const forward = (index - activeIndex + total) % total;
  const backward = (activeIndex - index + total) % total;
  return forward <= backward ? forward : -backward;
}

export default function BookCarousel({ items = realisticBooks, onSelect }) {
  const collection = items && items.length ? items : realisticBooks;
  const total = collection.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef(null);
  const dragTriggered = useRef(false);
  const suppressClick = useRef(false);
  const wheelLocked = useRef(false);

  const moveSlide = (direction) => {
    setActiveIndex((current) => (current + direction + total) % total);
  };

  // Auto-Slide Timer (4.5s) - Automatically pauses on hover or drag
  useEffect(() => {
    if (isHovered || isDragging) return;

    const timer = setInterval(() => {
      moveSlide(1);
    }, 4500);

    return () => clearInterval(timer);
  }, [isHovered, isDragging, total]);

  // Pointer & Touch Swipe Handlers for smooth horizontal side-swipe
  const handlePointerDown = (event) => {
    dragStartX.current = event.clientX;
    dragTriggered.current = false;
    suppressClick.current = false;
    setIsDragging(false);
  };

  const handlePointerMove = (event) => {
    if (dragStartX.current === null) return;
    if (dragTriggered.current) return;
    const distance = event.clientX - dragStartX.current;
    if (Math.abs(distance) < 50) return;

    moveSlide(distance < 0 ? 1 : -1);
    dragTriggered.current = true;
    suppressClick.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerEnd = (event) => {
    dragStartX.current = null;
    dragTriggered.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 300);
    }
  };

  const handleWheel = (event) => {
    const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(distance) < 25 || wheelLocked.current) return;
    event.preventDefault();
    wheelLocked.current = true;
    moveSlide(distance > 0 ? 1 : -1);
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 550);
  };

  const handleBookClick = (index) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (index === activeIndex) {
      onSelect?.(collection[index]);
    } else {
      setActiveIndex(index);
    }
  };

  const currentBook = collection[activeIndex] || collection[0];

  return (
    <div
      className="book-carousel-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="3D Horizontal Coverflow Book Carousel"
    >
      {/* 3D CoverFlow Stage */}
      <div
        className={`book-coverflow-stage ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
      >
        {/* Navigation Arrow Controls */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            moveSlide(-1);
          }}
          className="coverflow-nav-btn coverflow-nav-prev"
          aria-label="Previous book"
          title="Previous Book"
        >
          <FiChevronLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            moveSlide(1);
          }}
          className="coverflow-nav-btn coverflow-nav-next"
          aria-label="Next book"
          title="Next Book"
        >
          <FiChevronRight className="w-6 h-6" />
        </button>

        {/* Ambient Floor Glow */}
        <div className="book-coverflow-floor" aria-hidden="true" />

        {/* 3D Horizontal Slide Books */}
        {collection.map((book, index) => {
          const distance = circularDistance(index, activeIndex, total);
          const absoluteDistance = Math.abs(distance);
          const isActive = index === activeIndex;

          // Original dynamic 3D CoverFlow horizontal offset & depth
          let translateX = distance * 135;
          let translateZ = isActive ? 110 : Math.max(0, 50 - absoluteDistance * 30);
          let rotateY = isActive ? 0 : distance < 0 ? 32 : -32;
          let scale = isActive ? 1.15 : Math.max(0.72, 1 - absoluteDistance * 0.1);
          let opacity = absoluteDistance > 3 ? 0 : Math.max(0.25, 1 - absoluteDistance * 0.24);

          const isHidden = absoluteDistance > 3;

          const style = {
            transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
            opacity: isHidden ? 0 : opacity,
            pointerEvents: isHidden ? "none" : "auto",
            zIndex: 30 - absoluteDistance,
          };

          return (
            <div
              key={book.id}
              className={`book-slide-item ${isActive ? "is-active" : ""}`}
              style={style}
              onClick={() => handleBookClick(index)}
              title={`${book.title} - ${book.author}`}
            >
              {/* Realistic Hardcover Book Model (Zero White Borders) */}
              <div className="realistic-coverflow-book">
                <div className="coverflow-book-cover">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="coverflow-book-img"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 p-3 flex flex-col justify-between text-white">
                      <span className="text-[7px] font-bold text-sky-400">LIBRALINK</span>
                      <h4 className="text-[10px] font-bold leading-tight">{book.title}</h4>
                      <span className="text-[7px] opacity-80">{book.author}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Featured Book Caption Hub */}
      <div className="book-coverflow-caption" aria-live="polite">
        <div className="coverflow-tag-badge">
          <FiBookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>{currentBook?.tag || "FEATURED IN COLLECTION"}</span>
        </div>

        <h3 className="coverflow-title">
          {currentBook?.title}
        </h3>

        <div className="coverflow-meta">
          <span>{currentBook?.author}</span>
          <span className="dot" />
          <span className="text-sky-300 font-semibold">{currentBook?.course}</span>
          {currentBook?.rating && (
            <>
              <span className="dot" />
              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                <FiStar className="w-3.5 h-3.5 fill-amber-300" />
                {currentBook.rating}
              </span>
            </>
          )}
        </div>

        {/* Explore in Catalog CTA Button */}
        <button
          type="button"
          onClick={() => onSelect?.(currentBook)}
          className="coverflow-cta-btn"
        >
          <span>Explore in Catalog</span>
          <FiArrowRight className="w-4 h-4" />
        </button>

        {/* Interactive Pagination Dots */}
        <div className="coverflow-pagination">
          {collection.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`coverflow-dot ${idx === activeIndex ? "is-active" : ""}`}
              aria-label={`Go to book ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { realisticBooks as books };
